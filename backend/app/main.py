"""Prompt Heist backend: FastAPI app implementing the API contract in README.md
and the campaign in docs/BACKEND_CAMPAIGN_SPEC.md.

Run from the repository root:
    uvicorn backend.app.main:create_app --factory --port 8000
"""
import os
import threading
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ai import guard

from . import ai_status, campaign, game
from .config import Settings, load_env_file
from .db import Database
from .errors import APIError, install_error_handlers
from .levels import load_levels, public_view
from .schemas import (
    AIHealth,
    CampaignLeaderboard,
    CampaignSession,
    CampaignState,
    CreateCampaignRequest,
    CreateSessionRequest,
    Health,
    Leaderboard,
    LevelList,
    MessageRequest,
    MessageResponse,
    SessionCreated,
)


def _default_guard(level, history, user_message, learned_attacks=None):
    return guard.guard_reply(level, history, user_message, learned_attacks)


def _serve_frontend(app, dist):
    """Serve the built frontend (single-page app) from the same service, after all the /api routes."""
    index = os.path.join(dist, "index.html") if dist else ""
    if not (dist and os.path.isfile(index)):
        return
    root = os.path.realpath(dist)

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise APIError(404, "not_found", "Unknown path")
        candidate = os.path.realpath(os.path.join(root, path))
        # Only files inside the dist folder are served; everything else is the app (client-side routing).
        if path and candidate.startswith(root + os.sep) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(index)


def create_app(settings: Optional[Settings] = None, guard_fn=None, ai_check=None) -> FastAPI:
    """Build the app. Tests pass their own settings (temp database) and a fake guard_fn."""
    if settings is None:
        load_env_file()  # real runs only, so tests never pick up a developer's .env
        settings = Settings()
    guard_fn = guard_fn or _default_guard
    ai_check = ai_check or ai_status.check
    levels = load_levels(settings.levels_dir)
    db = Database(settings.database_path)

    # One lock per session (two quick messages cannot both use the same attempt) and one per
    # campaign (a double click cannot open two sessions for the same level).
    locks = defaultdict(threading.Lock)
    locks_guard = threading.Lock()

    def lock_for(key):
        with locks_guard:
            return locks[key]

    app = FastAPI(title="Prompt Heist API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    install_error_handlers(app)

    # Health and levels

    @app.get("/api/health", response_model=Health)
    def health():
        return {"status": "ok"}

    @app.get("/api/health/ai", response_model=AIHealth)
    def health_ai():
        """Whether the guard can answer: stub mode, or Ollama reachable with the model pulled."""
        try:
            return {"status": "ok", **ai_check()}
        except ai_status.AINotReady as e:
            raise APIError(503, "ai_not_ready", str(e))

    @app.get("/api/levels", response_model=LevelList)
    def list_levels():
        return {"levels": [public_view(lv) for lv in levels.values()]}

    # Campaigns

    def require_campaign(campaign_id):
        row = db.get_campaign(campaign_id)
        if row is None:
            raise APIError(404, "not_found", "Unknown campaign")
        return row

    def campaign_state(row):
        completed = row["status"] == "completed"
        return {
            "campaign_id": row["id"],
            "player_name": row["player_name"],
            "status": row["status"],
            "current_level_id": row["current_level_id"],
            "current_kingdom": levels[row["current_level_id"]]["kingdom"],
            "checkpoint_level_id": row["checkpoint_level_id"],
            "cleared_level_ids": campaign.cleared_level_ids(levels, row["current_level_id"], completed),
            "total_score": row["total_score"],
        }

    @app.post("/api/campaigns", response_model=CampaignState, status_code=201)
    def create_campaign(body: CreateCampaignRequest):
        """A new campaign for this browser. The frontend stores campaign_id (e.g. in localStorage)."""
        campaign_id = db.create_campaign(body.player_name, campaign.first_level_id(levels))
        return campaign_state(db.get_campaign(campaign_id))

    # Registered before /api/campaigns/{campaign_id} so "leaderboard" is not read as an id.
    @app.get("/api/campaigns/leaderboard", response_model=CampaignLeaderboard)
    def campaign_leaderboard():
        return {"entries": db.campaign_leaderboard()}

    @app.get("/api/campaigns/{campaign_id}", response_model=CampaignState)
    def get_campaign(campaign_id: str):
        return campaign_state(require_campaign(campaign_id))

    @app.post("/api/campaigns/{campaign_id}/sessions", response_model=CampaignSession, status_code=201)
    def start_campaign_session(campaign_id: str):
        """Start, or resume, the session for the campaign's current level."""
        with lock_for(f"campaign:{campaign_id}"):
            row = require_campaign(campaign_id)
            if row["status"] == "completed":
                raise APIError(409, "level_finished", "This campaign is already completed")
            level = levels[row["current_level_id"]]
            open_session = db.open_campaign_session(campaign_id, level["id"])
            if open_session is not None:
                session_id, used = open_session["id"], open_session["attempts_used"]
            else:
                session_id, used = db.create_session(level["id"], row["player_name"], campaign_id), 0
        return {
            "session_id": session_id,
            "level_id": level["id"],
            "attempts_remaining": level["max_attempts"] - used,
            "level": public_view(level),
        }

    # Free play (no campaign)

    @app.post("/api/sessions", response_model=SessionCreated, status_code=201)
    def create_session(body: CreateSessionRequest):
        level = levels.get(body.level_id)
        if level is None:
            raise APIError(404, "not_found", "Unknown level")
        session_id = db.create_session(level["id"], body.player_name)
        return {"session_id": session_id, "level_id": level["id"], "attempts_remaining": level["max_attempts"]}

    # Playing a level (free play and campaign)

    def learned_attacks(campaign_id, level):
        """For learning bosses: the player's kept winning messages in this kingdom, with the tactic
        each one used (the winning level's debrief technique). None for every other level."""
        if campaign_id is None or not level["learns"]:
            return None
        return [
            {"message": w["message"], "technique": levels[w["level_id"]]["debrief"]["technique"]}
            for w in db.campaign_wins(campaign_id, level["kingdom"])
        ]

    def campaign_change(row, level, status, score, attempts_used, message):
        """The campaign update for a finished level, plus the outcome to send to the frontend."""
        if status == "won":
            rules = campaign.on_win(levels, level, row["checkpoint_level_id"])
            bonus = sum(rules["bonuses"].values())
            change = {
                "current_level_id": rules["next_level_id"] or level["id"],
                "checkpoint_level_id": rules["checkpoint_level_id"],
                "status": "completed" if rules["campaign_completed"] else "in_progress",
                "bonus": bonus,
                "win": {"level_id": level["id"], "kingdom": level["kingdom"], "score": score,
                        "attempts_used": attempts_used, "message": message},
            }
            outcome = {
                "outcome": "won", "level_score": score, "bonuses": rules["bonuses"],
                "next_level_id": rules["next_level_id"], "respawn": False,
                "checkpoint_reached": rules["checkpoint_reached"], "kingdom_cleared": rules["kingdom_cleared"],
                "campaign_completed": rules["campaign_completed"],
            }
        else:
            rules = campaign.on_loss(levels, level, row["checkpoint_level_id"])
            change = {
                "current_level_id": rules["next_level_id"],
                "checkpoint_level_id": rules["checkpoint_level_id"],
                "status": "in_progress",
                "bonus": 0,
                "discard": {"kingdom": level["kingdom"], "from_level_id": rules["discard_wins_from"]},
            }
            outcome = {
                "outcome": "lost", "level_score": 0, "bonuses": {"checkpoint": 0, "kingdom": 0},
                "next_level_id": rules["next_level_id"], "respawn": True,
                "checkpoint_reached": False, "kingdom_cleared": False, "campaign_completed": False,
            }
        change.update(campaign_id=row["id"], expected_level_id=level["id"])
        return change, outcome

    @app.post("/api/sessions/{session_id}/messages", response_model=MessageResponse)
    def send_message(session_id: str, body: MessageRequest):
        with lock_for(f"session:{session_id}"):
            session = db.get_session(session_id)
            if session is None:
                raise APIError(404, "not_found", "Unknown session")
            if session["status"] != "in_progress":
                raise APIError(409, "level_finished", "This level is already finished")
            level = levels[session["level_id"]]
            campaign_id = session["campaign_id"]
            row = db.get_campaign(campaign_id) if campaign_id else None
            if row is not None and (row["status"] != "in_progress" or row["current_level_id"] != level["id"]):
                raise APIError(409, "level_locked", "This level is no longer your campaign's current level")

            try:
                reply = guard_fn(level, db.get_history(session_id), body.message,
                                 learned_attacks(campaign_id, level))
            except guard.AITimeoutError:
                raise APIError(504, "ai_timeout", "The guard took too long to answer. Try again.")
            except guard.AIUnavailableError:
                raise APIError(502, "ai_unavailable", "The guard is unavailable. Try again.")

            # The attempt is used only after a successful AI call.
            attempts_used = session["attempts_used"] + 1
            remaining = level["max_attempts"] - attempts_used
            if game.is_blocked(level, reply):
                shown, won = game.BLOCKED_NOTICE, False
            else:
                shown, won = reply, game.is_win(level, reply, body.message)

            score = None
            if won:
                status = "won"
                score = game.score(level["max_attempts"], attempts_used)
            elif remaining <= 0:
                status = "lost"
            else:
                status = "in_progress"

            change = outcome = None
            if row is not None and status != "in_progress":
                change, outcome = campaign_change(row, level, status, score, attempts_used, body.message)
            total = db.record_turn(session_id, body.message, shown, attempts_used, status, score, campaign=change)
            if outcome is not None:
                if total is None:  # another session moved the campaign first; report nothing stale
                    outcome = None
                else:
                    outcome["total_score"] = total

        # The handler's hint appears once the player has two failed attempts and is still playing.
        hint = level["hint"] if (status == "in_progress" and attempts_used == 2) else None
        return {
            "reply": shown,
            "attempts_remaining": remaining,
            "status": status,
            "score": score,
            "debrief": level["debrief"] if status != "in_progress" else None,
            "hint": hint,
            "campaign": outcome,
        }

    @app.get("/api/leaderboard", response_model=Leaderboard)
    def leaderboard(level_id: Optional[int] = None):
        return {"entries": db.leaderboard(level_id)}

    _serve_frontend(app, settings.frontend_dist)
    return app
