"""Prompt Heist backend: FastAPI app implementing the API contract in README.md.

Run from the repository root:
    uvicorn backend.app.main:create_app --factory --port 8000
"""
import threading
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai import guard

from . import ai_status, game, progress
from .config import Settings, load_env_file
from .db import Database
from .errors import APIError, install_error_handlers
from .levels import load_levels, public_view, restart_level_id
from .schemas import (
    AIHealth,
    CreateSessionRequest,
    Health,
    Leaderboard,
    LevelList,
    MessageRequest,
    MessageResponse,
    PlayerCreated,
    Progress,
    SessionCreated,
)


def _default_guard(level, history, user_message):
    return guard.guard_reply(level, history, user_message)


def create_app(settings: Optional[Settings] = None, guard_fn=None, ai_check=None) -> FastAPI:
    """Build the app. Tests pass their own settings (temp database) and a fake guard_fn."""
    if settings is None:
        load_env_file()  # real runs only, so tests never pick up a developer's .env
        settings = Settings()
    guard_fn = guard_fn or _default_guard
    ai_check = ai_check or ai_status.check
    levels = load_levels(settings.levels_dir)
    db = Database(settings.database_path)

    # One lock per session so two quick messages cannot both use the same attempt.
    session_locks = defaultdict(threading.Lock)
    locks_guard = threading.Lock()

    def session_lock(session_id):
        with locks_guard:
            return session_locks[session_id]

    app = FastAPI(title="Prompt Heist API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    install_error_handlers(app)

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

    def require_player(player_id):
        player = db.get_player(player_id)
        if player is None:
            raise APIError(404, "not_found", "Unknown player")
        return player

    @app.post("/api/players", response_model=PlayerCreated, status_code=201)
    def create_player():
        """A new browser identity. The frontend stores player_id (e.g. in localStorage)."""
        return {"player_id": db.create_player(progress.first_level_id(levels))}

    @app.get("/api/players/{player_id}/progress", response_model=Progress)
    def player_progress(player_id: str):
        player = require_player(player_id)
        view = progress.summary(levels, player["current_level_id"], db.best_scores(player_id))
        return {"player_id": player_id, **view}

    @app.post("/api/sessions", response_model=SessionCreated, status_code=201)
    def create_session(body: CreateSessionRequest):
        level = levels.get(body.level_id)
        if level is None:
            raise APIError(404, "not_found", "Unknown level")
        if body.player_id is not None:
            player = require_player(body.player_id)
            if not progress.is_unlocked(player["current_level_id"], level["id"]):
                raise APIError(409, "level_locked", "Clear the earlier levels first")
        session_id = db.create_session(level["id"], body.player_name, body.player_id)
        return {"session_id": session_id, "level_id": level["id"], "attempts_remaining": level["max_attempts"]}

    @app.post("/api/sessions/{session_id}/messages", response_model=MessageResponse)
    def send_message(session_id: str, body: MessageRequest):
        with session_lock(session_id):
            session = db.get_session(session_id)
            if session is None:
                raise APIError(404, "not_found", "Unknown session")
            if session["status"] != "in_progress":
                raise APIError(409, "level_finished", "This level is already finished")
            level = levels[session["level_id"]]

            try:
                reply = guard_fn(level, db.get_history(session_id), body.message)
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

            moved = None
            if session["player_id"] is not None:
                frontier = db.get_player(session["player_id"])["current_level_id"]
                new = progress.new_frontier(levels, frontier, level, status)
                if new is not None:
                    moved = (session["player_id"], frontier, new)
            db.record_turn(session_id, body.message, shown, attempts_used, status, score, progress=moved)

        # The handler's hint appears once the player has two failed attempts and is still playing.
        hint = level["hint"] if (status == "in_progress" and attempts_used == 2) else None
        return {
            "reply": shown,
            "attempts_remaining": remaining,
            "status": status,
            "score": score,
            "debrief": level["debrief"] if status != "in_progress" else None,
            "restart_level_id": restart_level_id(levels, level) if status == "lost" else None,
            "hint": hint,
        }

    @app.get("/api/leaderboard", response_model=Leaderboard)
    def leaderboard(level_id: Optional[int] = None):
        return {"entries": db.leaderboard(level_id)}

    return app
