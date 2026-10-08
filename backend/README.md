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

Settings come from environment variables. The easiest way is a `.env` file in the repository root: `cp .env.example .env`, then edit it. The backend loads it on startup. Variables set in the shell override the file, so the one-off commands below still work.

Without a model, using the stub guard from `ai/guard.py` (good for frontend and backend development):

```bash
GUARD_STUB=1 uvicorn backend.app.main:create_app --factory --port 8000
```

With the real model (Ollama running and `gemma4:e2b` pulled):

```bash
OLLAMA_MODEL=gemma4:e2b uvicorn backend.app.main:create_app --factory --port 8000
```

If Ollama runs on another laptop on the same network, add `OLLAMA_HOST=http://<that-laptop-ip>:11434`. On that laptop, Ollama must be started with `OLLAMA_HOST=0.0.0.0` so it accepts network connections.

On Windows PowerShell, set variables first, for example `$env:GUARD_STUB="1"`, then run `uvicorn ...`. Or put them in `.env`.

For a frontend on another laptop, add `--host 0.0.0.0`, and add that laptop's address to `CORS_ORIGINS` in `.env`, for example `http://192.168.1.20:5173`. This was tested on a local network.

API docs, where you can try every endpoint: http://localhost:8000/docs

Is the guard ready? `GET /api/health/ai` returns `200` with `mode` (`stub` or `ollama`), or `503 ai_not_ready` with the reason, for example "cannot reach Ollama at ..." or "model gemma4:e2b is not pulled".

## End-to-end check with the real model

With the backend running (and Ollama, unless `GUARD_STUB=1`), from the repository root:

```bash
python backend/scripts/e2e_check.py                         # backend on http://localhost:8000
python backend/scripts/e2e_check.py --base http://<ip>:8000 --trials 3 --levels 6   # first kingdom only
```

It needs only Python, with no extra packages. It does three things:

1. Checks that the guard is ready.
2. Sends every attack in `levels/attacks.json` through the API and prints the win rate and average reply time for each.
3. Plays a campaign as one browser player, using each level's intended trick first, and prints the outcome of each level and the final campaign state.

Attacks marked `expect: win` should win in at least 60% of tries, and `expect: fail` in at most 20% (the same thresholds as `tools/level_trials.py`). Mismatches are flagged.

Exit code: 0 if every request worked, 1 if any failed (including AI errors), 2 if the guard is not ready.

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
- `.env` loading (including that `.env.example` parses), and the readiness check against a fake Ollama: ready, model missing, unreachable, bad response
- the campaign (`test_campaign.py`): the 8 cases from `docs/BACKEND_CAMPAIGN_SPEC.md` section 6, plus resuming a session, score farming, AI failures, stale sessions, two finishes at once, the replay-checkpoint option, the leaderboard, and upgrading older databases
- the 30-level layout rules for level files
- the hint, the echo guard, and the opening line staying out of the model's history
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
| `app/campaign.py` | Campaign rules: checkpoint and kingdom bonuses, respawn, completion. The three team decisions are constants at the top |
| `app/ai_status.py` | Guard readiness check for `GET /api/health/ai` |
| `scripts/e2e_check.py` | End-to-end check of a running backend |
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
- Campaign: the rules are in the main README ("Campaign rules"). A campaign only moves if it is still on the level that just ended, so two sessions finishing at once cannot both move it. All changes of a finished level (score, bonuses, kept wins, respawn) are saved in the same transaction as the turn. Older database files get the new `campaign_id` column automatically on startup.
- A level's `opening` is shown to the player but not sent to the model, because the levels were tuned without it. When a level is still in progress after the second failed attempt, the response includes its `hint`. A guard reply does not count as a win if the player's own message already contained the whole secret (the echo guard). See `docs/GAME_DESIGN.md`.
- Score: `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach, so 1000, 500 or 250 with 3 attempts.
- Each session is locked while a message is processed, so a double-click cannot use two attempts at once. This lock lives inside one server process, so run a single process: plain `uvicorn` without `--workers`.
