# Backend

FastAPI server for Prompt Heist. It implements the API contract in the main [README](../README.md#api-documentation) and stores sessions, chat history and scores in SQLite. Owner: Aditya S.

## Setup

Run all commands from the **repository root**, not from `backend/`. The backend imports the AI module from `ai/`.

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

## Run

Without a model, using the stub guard from `ai/guard.py` (good for frontend and backend development):

```bash
GUARD_STUB=1 uvicorn backend.app.main:create_app --factory --port 8000
```

With the real model (Ollama running and `gemma4:e2b` pulled):

```bash
OLLAMA_MODEL=gemma4:e2b uvicorn backend.app.main:create_app --factory --port 8000
```

If Ollama runs on another laptop on the same network, add `OLLAMA_HOST=http://<that-laptop-ip>:11434`. On that laptop, Ollama must be started with `OLLAMA_HOST=0.0.0.0` so it accepts network connections.

On Windows PowerShell, set variables first, for example `$env:GUARD_STUB="1"`, then run `uvicorn ...`.

API docs, where you can try every endpoint: http://localhost:8000/docs

## Environment variables

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DATABASE_PATH` | `./prompt_heist.db` | SQLite file (created automatically) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend origins allowed to call the API |
| `GUARD_STUB` | unset | `1` returns canned guard replies without a model (read by `ai/guard.py`) |
| `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS` | see `.env.example` | Read by `ai/guard.py` |

## Tests

```bash
python -m pytest backend/tests        # backend only
python -m pytest                      # backend tests plus the AI and level tests in tests/
```

No model is needed: the tests replace `guard_reply` with a fake. They cover:

- the win check, the output filter and scoring
- level file validation
- every endpoint, and every error code (400, 404, 409, 502, 504)
- per-browser progress: level locking, wins and losses moving progress, replays, campaign score, two sessions finishing at once, upgrading older databases
- campaign rules: checkpoint restarts, the hint, the echo guard, and the opening line staying out of the model's history
- AI failures not using an attempt
- secrets never appearing in `/api/levels`
- the Level 3 filter
- the chat history sent to the model
- leaderboard sorting
- data surviving a restart
- CORS

## Layout

| File | Purpose |
| ---- | ------- |
| `app/main.py` | App factory and routes |
| `app/progress.py` | Per-browser progress rules: locking, frontier moves, campaign score |
| `app/schemas.py` | Request and response models (the API contract) |
| `app/game.py` | Output filter, win check, scoring (rules from `levels/README.md`) |
| `app/levels.py` | Loads and validates `levels/level_<id>.json` |
| `app/db.py` | SQLite tables and queries (all SQL is here) |
| `app/errors.py` | `{"error": {"code", "message"}}` format |
| `app/config.py` | Settings from environment variables |
| `tests/` | pytest tests |

## Notes

- The secret and guard prompt never leave the server. When a level ends, the response includes the debrief text.
- A failed AI call (502/504) does not use an attempt and is not saved to the history.
- When the Level 3 filter blocks a reply, the player sees `[Message blocked by the bank's security filter]`. The same notice is stored in the history the model sees on the next turn.
- Progress: `POST /api/players` creates a browser identity, and sessions started with its `player_id` are locked to unlocked levels and update progress. The player's frontier only moves if it has not changed since it was read, so two sessions finishing at once cannot both move it. Older database files get the new `player_id` column automatically on startup.
- Campaign: when a player loses, `restart_level_id` is the nearest checkpoint at or before that level in the same map, or the same level if there is none. A level's `opening` is shown to the player but not sent to the model, because the levels were tuned without it. When a level is still in progress after the second failed attempt, the response includes its `hint`. A guard reply does not count as a win if the player's own message already contained the whole secret (the echo guard). See `docs/GAME_DESIGN.md`.
- Score: `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach, so 1000, 500 or 250 with 3 attempts.
- Each session is locked while a message is processed, so a double-click cannot use two attempts at once. This lock lives inside one server process, so run a single process: plain `uvicorn` without `--workers`.
