# CONTEXT.md: Shared Development Context

Shared change log, handoff board, and integration checklist for **Prompt Heist** (Team StromBreaker). Read this before you start. Update it when you make a meaningful change (see [section G](#g-how-to-maintain-contextmd)).

Rule for this file: record only what is true. Use `Not specified` when unknown. Mark a task done only when it is implemented **and** verified.

---

## A. Project Context

**Overview.** Prompt Heist is a browser game set in the *Silicon Bastion* campaign: 30 levels in 5 kingdoms of 6, with 3 lives per level, hints, a checkpoint at position 3, and a learning boss at position 6. Specs: `docs/BACKEND_CAMPAIGN_SPEC.md` and `docs/FRONTEND_SPEC.md`. The player chats with an AI "guard" that protects a fictional secret and tries to make it reveal the secret. A debrief then explains the technique and the defence. Goal: teach prompt-injection concepts safely, with a local open-weight model. Full description: [README.md](README.md).

**Current state (verified from the repository):** documentation, the AI module (`ai/guard.py`), level files, tests, a temporary stand-in server (`tools/dev_server.py`), and the real backend (`backend/`, FastAPI and SQLite). There is no frontend yet.

**Planned architecture** (proposed, not implemented):

```
Frontend (browser)  --JSON/HTTP-->  Backend API  --in-process-->  AI module  --HTTP-->  Ollama (Gemma)
                                        |
                                        +--> SQLite (sessions, scores)
                                        +--> levels/ config (guard prompt, secret, debrief)
```

**Technology stack** (status as in README): FastAPI (proposed), SQLite (proposed), Gemma via Ollama (model family confirmed; variant TBD), frontend framework not decided.

**Important files and directories**

| Path | Purpose | Exists |
| ---- | ------- | ------ |
| `README.md` | Project documentation and proposed API contract | Yes |
| `CONTEXT.md` | This file | Yes |
| `CHECKLIST.md` | Team-wide Hack Day to-do list | Yes |
| `AGENTS.md`, `CLAUDE.md` | Rules for coding agents (from the organizers) | Yes |
| `docs/ROLES.md` | Per-role task plan | Yes |
| `.env.example` | Proposed environment variables | Yes |
| `ai/guard.py`, `levels/`, `tests/`, `tools/` | AI module, level files, tests, smoke test and stand-in server | Yes |
| `backend/` | Real backend: FastAPI app, SQLite, pytest tests (see `backend/README.md`) | Yes |
| `frontend/` | Frontend | No (proposed) |
| `LICENSE`, `.gitignore` | Required for submission and secret safety | No |

**Component relationships**

- Frontend talks only to the backend. It never holds the secret or guard prompt and never calls Ollama.
- Backend owns sessions, attempts, the win check, scoring, and the database. It calls the AI module in-process.
- AI module (owned by Mudiam) builds the prompt, calls Ollama, returns reply text. It does not decide who wins.
- The API contract between frontend and backend is in the README under "API Documentation". It is a **proposal** until Aditya and Kirupashankar confirm it.

---

## B. Contributor Change Log

Newest first. History below comes from `git log`; later rows must be added by the contributor who made the change.

| Date | Contributor | Component | Changes Made | Files Modified | Dependencies or Impact | Status |
| ---- | ----------- | --------- | ------------ | -------------- | ---------------------- | ------ |
| 2026-10-08 | Mudiam Hemanth Reddy | Integration test / submission | Merged `main` (Aditya's campaign backend) into `feature/ai-levels-map1`, resolved the doc conflicts, and ran the whole campaign through the real backend with the real model (all 30 levels cleared). Added `LICENSE` (MIT) and filled the README submission sections (implementation, contributions, model and license links, challenges and learnings) | `LICENSE`, `README.md`, `CONTEXT.md`, `CHECKLIST.md`, `docs/e2e_real_model_run.txt`, `levels/README.md`, `tools/level_trials.py` | None for other components. Shree should confirm the MIT choice | Pushed on `feature/ai-levels-map1` |
| 2026-10-08 | Mudiam Hemanth Reddy | AI / levels / specs | Built the 30-level campaign (5 kingdoms x 6 levels, difficulty ladder, checkpoint at 3, learning boss at 6) with `tools/build_levels.py`; added `learned_attacks` to `guard_reply`; parallel trials tool; fixed level ordering in the backend loader; wrote `docs/BACKEND_CAMPAIGN_SPEC.md` and `docs/FRONTEND_SPEC.md` | `levels/*`, `ai/guard.py`, `tools/*`, `tests/*`, `backend/app/levels.py`, `backend/tests/*`, `docs/*`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | `GET /api/levels` returns 30 levels with kingdom fields. `guard_reply` has a 4th argument (see section D, item 18). Aditya must add campaigns (spec); Kirupashankar must build the screens (spec) | Pushed on `feature/ai-levels-map1` (not merged to `main`) |
| 2026-10-08 | Mudiam Hemanth Reddy | AI / levels / backend compatibility | Rebuilt Levels 1-3 as Map 1 of the new Corporate Cyber-Feudalism design (AquaLeak Triage, TrialMatch AI, TariffSense) with `character`, `setting`, `opening`, `hint`, 3 attempts and `debrief.vulnerability`. Added the echo guard, the team score formula and the hint. Tuned all levels against the real model with `tools/level_trials.py`. Patched Aditya's backend for the new fields, then ran the real backend with the real model end to end. `num_predict` is now 80 | `levels/*`, `ai/guard.py`, `tools/*`, `tests/*`, `backend/app/{levels,schemas,game,main}.py`, `backend/tests/*`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | **API contract changed** (see section D, item 13): levels list gains `character`, `setting`, `opening`; message response gains `hint`; `debrief` gains `vulnerability`; score formula changed; win rule gains the echo guard. Frontend must read the new fields. Backend edits are on branch `feature/ai-levels-map1` for Aditya to review | Pushed on `feature/ai-levels-map1` (not merged to `main`) |
| 2026-10-08 | Aditya S | Docs: setup and submission | Replaced the README setup placeholder with commands tested from a fresh GitHub clone (venv, `pip install`, `.env`, 150 tests, server start, readiness, e2e script), plus PowerShell equivalents. Tested and documented the network demo setup (`--host 0.0.0.0` and `CORS_ORIGINS`). Wrote the backend parts of "Implementation During the Hackathon", "Team Contributions" and "Challenges and Learnings" from the Git history. Added PowerShell steps for the real-model run | `README.md`, `backend/README.md`, `CONTEXT.md`, `CHECKLIST.md` | No code changes. Other members' README sections are still placeholders for them to fill | In PR #8 |
| 2026-10-08 | Aditya S | Backend: campaign | Merged Mudiam's 30-level branch (it was based on an older `main`; only the 3 level files conflicted, and his versions were taken). Built the campaign from `docs/BACKEND_CAMPAIGN_SPEC.md`. **It replaces the PR #5 players/progress system and PR #3's `map`/`restart_level_id`**: the frontend spec uses campaigns, and no frontend used the old endpoints. Level loader validates the kingdom layout. Learning bosses get `learned_attacks` as `{message, technique}` items. The total score counts each level once (best score) plus bonuses, so it cannot be farmed. The e2e script now plays campaigns and reads the new `attacks.json` format. 150 tests pass (126 backend + 24 AI/tools) | `backend/app/{campaign,db,levels,main,schemas}.py` (removed `progress.py`), `backend/tests/{test_campaign,test_levels,test_api,conftest}.py` (removed `test_players.py`), `backend/scripts/e2e_check.py`, `levels/README.md` (field table), `README.md`, `backend/README.md`, `docs/GAME_DESIGN.md`, `CONTEXT.md`, `CHECKLIST.md` | **API:** new `/api/campaigns` endpoints and a `campaign` object on message responses. **Removed:** `/api/players*`, `player_id`, `map`, `restart_level_id`. New level fields in `GET /api/levels`. Verified through HTTP with a leaking fake guard (all 30 levels, 37,500 points, bosses get 5 kept tactics each). **Not yet run on the real model** | Merged (PR #7) |
| 2026-10-08 | Aditya S | Backend: AI readiness | The documented `.env` setup did not work, because nothing read `.env`. The backend now loads the root `.env` on startup (standard library; shell variables win). Added `GET /api/health/ai` (stub, or Ollama reachable with the model pulled, else `503 ai_not_ready` with the reason) and `backend/scripts/e2e_check.py`, which plays `levels/attacks.json` and a full campaign through the running API. Added a commented `GUARD_STUB` line to `.env.example`. 143 tests pass (119 backend + 24 AI/tools) | `backend/app/{config,ai_status,main,schemas}.py`, `backend/scripts/e2e_check.py`, `backend/tests/test_ai_readiness.py`, `.env.example`, `README.md`, `backend/README.md`, `CONTEXT.md`, `CHECKLIST.md` | **API, additive:** `GET /api/health/ai`. No changes to existing endpoints. E2E script verified against a stub backend, a backend whose guard always leaks (to exercise the win path), and an unreachable Ollama. **Not yet run against the real model** | Merged (PR #6) |
| 2026-10-08 | Aditya S | Backend: progress | Per-browser saved progress. `players` table and `player_id` on sessions, with an automatic migration for older database files. `POST /api/players`; `GET /api/players/{id}/progress` (level status, best scores, campaign score); level locking (`409 level_locked`); progress moves on win and falls back to the checkpoint on loss; the frontier update is safe when two sessions finish at once. Stores each level's winning message (`winning_messages`) for Mudiam's planned learning boss. 130 tests pass (106 backend + 24 AI/tools) | `backend/app/{progress,db,main,schemas}.py`, `backend/tests/test_players.py`, `README.md`, `backend/README.md`, `docs/GAME_DESIGN.md`, `CONTEXT.md`, `CHECKLIST.md` | **API, additive:** new player endpoints; optional `player_id` on `POST /api/sessions`; new error `409 level_locked` (only with `player_id`). Old clients unchanged. Frontend must store `player_id` per browser (section D, item 19). Learning-guard interface still to agree (item 20) | Merged (PR #5) |
| 2026-10-08 | Aditya S | Integration | Merged Mudiam's `feature/ai-levels-map1` with PR #3. Kept Mudiam's tuned Map 1 (Levels 1-3), `attacks.json`, level format v2, echo guard, hint and score formula. Kept the PR #3 checkpoint restart (`restart_level_id`) and secret-leak checks (now also on `hint` and `debrief.vulnerability`). Removed the untuned duplicate Levels 4-6 and the Training map. `map` is now Mudiam's string; added `checkpoint: true` to Levels 1 and 3. Opening line is **not** sent to the model, matching how the levels were tuned. 106 tests pass (82 backend + 24 AI/tools) | `backend/app/{levels,schemas,main}.py`, `backend/tests/*`, `levels/level_1-3.json` (checkpoint flag only), `levels/README.md`, `docs/GAME_DESIGN.md`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | Final API: `/api/levels` items have `id`, `title`, `map`, `checkpoint`, `character`, `setting`, `intro`, `opening`, `max_attempts`; message responses have `restart_level_id` and `hint`. `map_title` from PR #3 is gone (no frontend used it) | Merged (PR #4) |
| 2026-10-08 | Aditya S | Game design / Backend / Levels | Adopted the Silicon Bastion campaign from the team's game plan: map fields, checkpoint restart, `docs/GAME_DESIGN.md`, untuned Map 1 as Levels 4-6 | `docs/GAME_DESIGN.md`, `levels/level_4-6.json`, `backend/*`, docs | Levels 4-6 and `map_title` later replaced by Mudiam's tuned levels in PR #4 | Merged (PR #3) |
| 2026-10-08 | Mudiam Hemanth Reddy | AI / levels / backend compatibility | Rebuilt Levels 1-3 as Map 1 of the new Corporate Cyber-Feudalism design (AquaLeak Triage, TrialMatch AI, TariffSense) with `character`, `setting`, `opening`, `hint`, 3 attempts and `debrief.vulnerability`. Added the echo guard, the team score formula and the hint. Tuned all levels against the real model with `tools/level_trials.py`. Patched Aditya's backend for the new fields, then ran the real backend with the real model end to end. `num_predict` is now 80 | `levels/*`, `ai/guard.py`, `tools/*`, `tests/*`, `backend/app/{levels,schemas,game,main}.py`, `backend/tests/*`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | **API contract changed** (see section D, item 13). Frontend must read the new fields | Merged through PR #4 (integration) |
| 2026-10-08 | Aditya S | Backend | Built the FastAPI backend implementing the full README API contract: SQLite storage (sessions, messages), level loader with validation, filter/win/score rules, standard errors, CORS, per-session lock. 62 pytest tests; all 80 tests in the repo pass. Manually run with `GUARD_STUB=1`. Extended `.gitignore` (`.env`, `.venv/`, `__pycache__/`, `*.db`) | `backend/*`, `.gitignore`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | New deps in `backend/requirements.txt`: fastapi, uvicorn, pytest, httpx2. Frontend can switch from `tools/dev_server.py` to the real backend (same port and paths) | Merged (PR #2) |
| 2026-10-08 | Aditya S | Docs / Backend plan | Reviewed Mudiam's AI module, level format and stand-in server (all 18 tests pass on Aditya's machine). Confirmed the level format and the filter/win rules. Recorded backend decisions: FastAPI, pytest, SQLite. Added the backend layout and the plan for running the model on Mudiam's laptop | `CONTEXT.md`, `CHECKLIST.md` | No code yet. Backend will import `ai.guard` unchanged and lives only in `backend/` | Merged (PR #1) |
| 2026-10-08 | Mudiam Hemanth Reddy | AI / integration | Added `guard_reply` (Ollama, `think: false`), Levels 1-3 with debriefs, `output_filter` field and win/filter rules, smoke test, TEMPORARY stand-in server implementing the API contract, 18 tests. Pulled `gemma4:e2b` and tested on the real model | `ai/guard.py`, `levels/*`, `tools/smoke_test.py`, `tools/dev_server.py`, `tests/*`, `.env.example`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | New field `output_filter` in level files (Aditya must apply the rules in `levels/README.md`). Frontend can use `tools/dev_server.py` as a mock. Needs Ollama and the model on any machine that runs the real AI | Implemented and tested locally; push pending (see Git) |
| 2026-10-08 | Mudiam Hemanth Reddy | Docs | Rewrote README for Prompt Heist (proposed stack, architecture, API contract, status); added `CONTEXT.md`, `CHECKLIST.md`, `.env.example` | `README.md`, `CONTEXT.md`, `CHECKLIST.md`, `.env.example` | None (no code). Defines the proposed API contract that backend and frontend must confirm | Pushed |
| 2026-10-08 | Mudiam Hemanth Reddy | Docs | Added Prompt Heist README and per-role task plan | `README.md`, `docs/ROLES.md` | None | Pushed |
| 2026-10-08 | Shree Santh B | Docs | Set team name to Team StromBreaker | `README.md` | None | Pushed |
| 2026-10-08 | Shree Santh B | Docs | Updated contributors list in README | `README.md` | None | Pushed |
| 2026-10-08 | Nitansh Shankar (BIJJUDAMA, organizers' template) | Docs | Added the repository structure (`AGENTS.md`, `CLAUDE.md`, `README.md` template) | `AGENTS.md`, `CLAUDE.md`, `README.md` | Template rules in `AGENTS.md` apply to all contributors | Pushed |

---

## C. Contributor-Specific Updates

### Frontend Development (Kirupashankar Chockkanathan)

- UI components and pages implemented: none yet.
- API integrations: none. Planned calls: `GET /api/levels`, `POST /api/sessions`, `POST /api/sessions/{id}/messages`, `GET /api/leaderboard`.
- State management and routing: not decided (framework not chosen).
- Pending: choose framework; build level select, chat, debrief, leaderboard, responsible-use notice; loading and error states (502/504 retry).
- Depends on: backend endpoints (pending), the confirmed API contract.

### Backend Development (Aditya S)

- APIs and endpoints implemented: all of the README contract. `GET /api/health`, `GET /api/levels`, `POST /api/sessions`, `POST /api/sessions/{id}/messages`, `GET /api/leaderboard?level_id=` (`level_id` optional, top 50). Live docs at `/docs`.
- Business logic: filter, win check with echo guard, hint and team scoring in `backend/app/game.py` and `main.py`. Database: `backend/app/db.py`. Auth not planned.
- Campaign support: `map` and `checkpoint` level fields, `restart_level_id` when a player loses, the hint after the second miss, the echo guard, and the team score formula. The `opening` is shown to the player and is not sent to the model.
- Verified: 82 backend pytest tests pass, and manual runs with `GUARD_STUB=1` worked (including 3 strikes on Level 5 restarting at Level 4). **Not yet verified against the real model.**
- Run: `GUARD_STUB=1 uvicorn backend.app.main:create_app --factory --port 8000` from the repo root (details in `backend/README.md`).
- Stack (decided by the backend owner): **FastAPI**, **pytest** with FastAPI's `TestClient`, and **SQLite** through Python's built-in `sqlite3`. Reasons are in section D.
- Uses `ai/guard.py` as is (`guard_reply`, `AIUnavailableError`, `AITimeoutError`, `GUARD_STUB=1`). The backend does not copy or edit Mudiam's files.
- Build order:
  1. `backend/` scaffold, `GET /api/health`, config from env, error format.
  2. `game.py`: filter, win check and scoring, with unit tests. Ported from the reference rules in `tools/smoke_test.py`.
  3. Level loader for `levels/*.json`.
  4. Sessions and messages endpoints, with attempt counting. A failed AI call does not use an attempt.
  5. SQLite storage and the leaderboard.
  6. API tests for every endpoint and error code: contract checks like `tests/test_dev_server.py`, plus the 502/504 paths using a fake `guard_reply`.
  7. Run against the real model on Mudiam's laptop. Then `tools/dev_server.py` can be deleted.
- Development runs with `GUARD_STUB=1`, so no model is needed on Aditya's laptop.
- Depends on: confirmed API contract (Kirupashankar).

### AI Development (Mudiam Hemanth Reddy)

- Models/frameworks: Gemma 4 `gemma4:e2b` via Ollama 0.40.1. Installed and verified on Mudiam's machine (RTX 4060 8 GB, 100% GPU, about 3 s per reply). Not yet verified on the other members' machines.
- Prompts, pipelines: 30 guard prompts generated by `tools/build_levels.py` from one template per difficulty position, each tuned against the real model (`tools/level_trials.py`, results in `levels/trial_results.txt`). Findings: a guard told to refuse often writes the code inside its refusal, so every refusing guard is told never to write it; a boss that refuses everything cannot learn, so the base boss is beatable by the earlier tactics and the learned list is what closes them; naming each tactic (from the debrief) hardens the boss better than raw example messages.
- Input format: guard prompt, session history, new user message. Output: plain text reply (length-capped).
- Backend integration: AI module runs inside the backend and exposes `guard_reply(level, history, user_message) -> str`, raising `AIUnavailableError` or `AITimeoutError`.
- Configuration: `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`.
- Error handling, latency: a failed call must not consume a player attempt; latency on team laptops is unmeasured.
- Done: model installed and verified; Map 1 Levels 1-3 written and tuned; `guard_reply` implemented, unit tested and run through the real backend; level format v2 in `levels/README.md`; license checked (Google describes Gemma 4 as Apache 2.0; confirm on the model's own license file).
- Done: all 30 levels, the learning boss, parallel trials, the specs for backend and frontend.
- Pending: Aditya reviews the compatibility patch and builds campaigns; test on other team laptops; refine the kingdom 4 and 5 domain content with the team; Defender mode (not started).

### Docs, demo, submission (Shree Santh B)

- Pending: `LICENSE`, `.gitignore`, keep README accurate, demo video, Devpost, OrganizerHQ submission.

---

## D. Integration and Compatibility Notes

No code exists, so there are no breaking changes yet. Record here any change that affects another component.

**Decisions made in documentation (need confirmation by owners):**

1. AI runs as a module inside the backend, not a separate service.
2. Chat history is stored server-side, so the frontend sends only the new message.
3. The secret and guard prompt never leave the server.
4. Error format: `{"error": {"code", "message"}}`; statuses 400, 404, 409, 502, 504.
5. A failed AI call does not consume an attempt.
6. Level config format: defined in `levels/README.md`, including `output_filter`. **Confirmed by Aditya on 2026-10-08, including the filter and win rules.** As in `tools/dev_server.py`, the backend stores the shown reply (the blocked notice when a reply is filtered) in the history that is sent back to the model. History roles are `user` and `assistant`, as `guard_reply` expects.
7. `tools/dev_server.py` is a TEMPORARY stand-in for the backend. Delete it once the real backend passes `tests/test_dev_server.py`-style checks.
8. Gemma 4 on Ollama needs `think: false` or replies can be empty (found while testing).
9. **Backend framework: FastAPI** (backend owner, 2026-10-08). Request and response models enforce the contract. `/docs` gives Kirupashankar a live API page. `TestClient` makes endpoint tests simple. Flask would need extra libraries for validation and docs.
10. **Database: SQLite (SQL)** (backend owner, 2026-10-08). The data is relational: sessions have many messages, and the leaderboard is a sorted query. It needs no server, account, credentials or internet, and `sqlite3` is built into Python. Online databases were considered:
    - Supabase (hosted Postgres) or MongoDB Atlas would add a signup, a secret key in `.env`, and a dependency on venue Wi-Fi during the demo, for no gain while one backend serves the game.
    - MongoDB's document model does not suit leaderboard queries as well.
    - All SQL lives in `backend/app/db.py`. If the team later hosts the backend online, that one file can move to Supabase Postgres.
11. **Where things run.** The model runs only on Mudiam's laptop; Aditya's laptop cannot run it. The backend code lives in this repo, and any machine can run it.
    - Development: run the backend with `GUARD_STUB=1`. No model is needed.
    - Integration over the same network: Mudiam starts Ollama with `OLLAMA_HOST=0.0.0.0` so it listens on the LAN and allows port 11434 through the firewall. The backend machine sets `OLLAMA_HOST=http://<mudiam-ip>:11434`. Venue Wi-Fi may block device-to-device traffic, so test this early.
    - Demo (safest): clone the repo on Mudiam's laptop and run the backend, the frontend and Ollama all there. No network dependency.
12. **File ownership.** These folders keep merge conflicts away:
    - `backend/` (app code and its tests in `backend/tests/`): Aditya
    - `ai/`, `levels/`, `tools/`, `tests/`: Mudiam
    - `frontend/`: Kirupashankar
    - `LICENSE`, `.gitignore`: Shree Santh

    Shared docs (`README.md`, `CONTEXT.md`, `CHECKLIST.md`): pull right before editing, edit only your own sections plus one change-log row, and push straight away.

13. **Level format v2 and contract changes (2026-10-08, Mudiam).** New required level fields: `character`, `setting`, `opening`, `hint`; `debrief` gains `vulnerability`; `max_attempts` is 3; `map` is optional. API changes: `GET /api/levels` also returns `character`, `setting`, `opening`; the message response gains `hint` (set only on the second failed attempt while in progress); `debrief` gains `vulnerability`; the score formula is `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach. Merged with PR #3 in PR #4 (see item 18). **Kirupashankar: the opening line and hint come from the API.**
14. **Echo guard.** A reply is not a win if the player's own message already contains every part of the secret (found while reviewing the script: asking the guard to write the two parts of the cipher on separate lines was a win even if the player typed both parts). Implemented in `backend/app/game.py` (`is_win(level, reply, user_message)`) and in `tools/smoke_test.py`.
15. **All shipped levels use `output_filter: "none"`.** The `block_exact` path is still supported and tested but unused.
16. **Checkpoints and progress:** superseded by item 22 (campaigns). The PR #3-#5 `map`, `restart_level_id` and `/api/players` designs were removed in PR #7.
17. **Gemma 4 needs `think: false` and a short `num_predict`.** Without `think: false` replies can be empty. `num_predict` is 80 (team design), so replies stay short and fast (about 3 seconds on an RTX 4060).
18. **Integration decisions (PR #4, Aditya, 2026-10-08).** The guard's `opening` is shown to the player but **not** sent to the model, because the levels were tuned with an empty first-turn history. The backend rejects any level whose `opening`, `hint` or `debrief` contains the secret. (The `map` field from PR #4 was replaced by `kingdom` in PR #7.)
19. **Frontend work:** follow `docs/FRONTEND_SPEC.md` (Mudiam's spec). The campaign endpoints it relies on exist since PR #7, so the mock flag it describes is no longer needed. Store only `campaign_id` in `localStorage`.
20. **Learning boss:** done in PR #7. The interface is `guard_reply(level, history, user_message, learned_attacks=None)`, and `learned_attacks` is a list of `{message, technique}` items for `learns` levels in campaigns (README, "Campaign rules").
21. **Real-model run: done (2026-10-08, Mudiam).** Verified 2026-10-08 on the real model: Aditya's backend from `main` plus `gemma4:e2b` via Ollama on an RTX 4060 laptop GPU. `backend/scripts/e2e_check.py` played the whole campaign through the HTTP API: all 30 levels cleared, campaign completed, total 37,000, checkpoints at levels 3, 9, 15, 21 and 27, kingdoms cleared at 6, 12, 18, 24 and 30, and all five learning bosses beaten by the new technique (translation). Every request worked (exit code 0). Output: `docs/e2e_real_model_run.txt`. The script crashed once on Windows when a guard reply contained an emoji (console encoding); run it with `python -X utf8` or make it print with `errors="replace"`.
21a. **Level ordering bug fixed.** With more than nine level files, file names sort as text (level_1, level_10, ...), so `GET /api/levels` listed 1, 10, 11. `load_levels` now sorts by id (`backend/app/levels.py`), with a test.

22. **Campaign decisions (PR #7, Aditya, 2026-10-08).** These answer the spec's section 9 questions. They are constants at the top of `backend/app/campaign.py`; the team can change them.
    1. Respawn **after** the checkpoint (`RESPAWN_AFTER_CHECKPOINT = True`). Replaying the checkpoint is supported and tested, and does not pay its bonus twice.
    2. Kingdom bonus **1000** (`KINGDOM_BONUS`), checkpoint bonus **500**.
    3. Scores of levels before a loss are **kept**. The total counts each level once, at its best score, plus bonuses. The spec's "add each win to the total" would let a player farm points by winning level 4 and losing level 5 again and again.
    4. **One campaign leaderboard** (`GET /api/campaigns/leaderboard`); no per-kingdom board.
    5. Not in the spec, so decided here:
       - Entering a completed campaign returns `409 level_finished`.
       - A message to a campaign session whose level is no longer current returns `409 level_locked`.
       - Free-play bosses get no `learned_attacks`.
       - Scores and wins are only applied if the campaign is still on the level that ended.

**Known integration issues:**
- The Level 1 guard sometimes gives away the answer to its own question after a wrong reply (in character, but a second try can use it).
- **Levels 1-6 were regenerated** by `tools/build_levels.py`. The real-model results in `levels/README.md` ("Status") and in the README's development status are for the earlier Map 1 prompts. Mudiam to re-run `tools/level_trials.py` and update them.
- **There is no frontend in the repository yet** (no `frontend/` folder). This is the biggest risk for a working demo.
- The frontend has not been tested against the real API.
- `LICENSE` is still missing (required for submission).

---

## E. Pending Tasks and Handoffs

| Task | Owner | Depends on | Next steps | Status | Acceptance criteria |
| ---- | ----- | ---------- | ---------- | ------ | ------------------- |
| Confirm the API contract in the README | Aditya, Kirupashankar | None | Review README "API Documentation"; edit it and log changes in section B | Not started | Both owners agree; README matches what is built |
| Define level config format | Mudiam, Aditya | None | Format written in `levels/README.md`; confirmed by Aditya | Agreed; loader not built yet | Example level files in `levels/`; backend can load them |
| Model reachable from the backend | Mudiam, Aditya | Ollama on Mudiam's laptop | Try LAN access (`OLLAMA_HOST=0.0.0.0`); fall back to running everything on Mudiam's laptop | Not started | Backend gets a real reply from `gemma4:e2b` |
| Install Ollama and verify Gemma variant and license | Mudiam | None | Model pulled and run | Model done; license check pending | Model replies locally (done); license link added to README (pending) |
| Frontend: maps, character, opening line, strikes, hint, checkpoint restart | Kirupashankar | API fields (done) | See section D, item 19 | Not started | Losing Level 2 offers a restart at Level 1 |
| Write Levels 1 to 3 | Mudiam | Level config format | Written and hand-tested once | In progress (more tuning) | Level 1 beatable easily, Level 3 hard but possible |
| `guard_reply` AI module | Mudiam | Ollama working | Implemented, unit tested, run against the real model | Completed and verified locally | Returns text; raises the two error types on failure |
| Backend API | Aditya | Contract, level config, `guard_reply` | Run against the real model on Mudiam's laptop; then delete `tools/dev_server.py` (with Mudiam) | Implemented and tested with a fake guard (PR #2) | Endpoints match the contract; win check tested |
| Merge `feature/ai-levels-map1` (level format v2, hint, score, echo guard) | Aditya (integration), reviewer: Mudiam | None | Merged with PR #3 on `integration/map1-levels` | Merged (PR #4) | Both test suites pass on `main`; frontend can read `character`, `opening`, `hint` |
| Levels 1 to 30 tuned on the real model | Mudiam | `tools/build_levels.py` | `tools/level_trials.py all 8`, results in `levels/trial_results.txt` | Completed and verified | Each level: wrong answer rarely wins, intended trick wins most trials |
| Campaign (checkpoints, respawn, bonuses, leaderboard) | Aditya (API), Kirupashankar (UI) | Level files (done) | API done in PR #7; UI per `docs/FRONTEND_SPEC.md` | API implemented and tested; UI not started | Losing level 5 after the checkpoint respawns at 4 with 3 lives; clearing 6 moves to 7 |
| Pass earlier winning messages to learning guards | Aditya, Mudiam | `guard_reply` with `learned_attacks` (done) | Wired in PR #7 | Completed and verified on the real model (all five bosses fell to translation in the campaign run) | Each boss receives this campaign's kept wins in its kingdom |
| Frontend | Kirupashankar | Contract (can use mock responses first) | Choose framework; build screens | Not started | One level playable against the backend |
| LICENSE and `.gitignore` | Shree Santh | None | Add MIT or Apache-2.0; ignore `.env`, caches | Not started | Files in repo root |
| Demo, Devpost, OrganizerHQ submission | Shree Santh | Working build | Record video; submit before the deadline; tick Gemma 4 | Not started | Submitted before the window closes |

---

## F. Project Checklist

Tick only with evidence (code merged and verified).

- [ ] Frontend implementation
- [ ] Backend implementation (implemented and tested with a fake guard; real-model run pending)
- [ ] AI implementation (`guard_reply` done and verified; levels still being tuned)
- [x] Database integration (SQLite; persistence across restarts tested)
- [ ] Frontend-backend API integration
- [ ] Backend-AI integration
- [ ] End-to-end data flow verification
- [ ] Error handling and validation
- [ ] Environment configuration (`.env.example` exists; not yet verified against real code)
- [ ] Unit and integration tests
- [ ] End-to-end testing
- [ ] Security checks (no secrets committed; secret never in API responses or logs)
- [ ] Documentation updates (README and CONTEXT kept in sync with the code)
- [ ] Final integration and deployment readiness

### Integration Checklist

- [ ] Frontend API calls match the documented backend contracts
- [ ] Backend endpoints accept the expected frontend payloads
- [ ] Backend requests to the AI module use the agreed input format
- [ ] AI responses match the expected output format
- [ ] Backend responses can be consumed by the frontend
- [ ] Error responses are handled consistently across components
- [ ] Environment variables are configured correctly
- [ ] All components can be started using the documented instructions
- [ ] Integration tests cover the major communication paths
- [ ] At least one complete end-to-end user workflow has been tested
- [ ] Changes made by individual contributors do not break existing functionality

### Contributor Checklist

**Before development**

- [ ] Understand the existing architecture (README, this file)
- [ ] Review related code and documentation
- [ ] Identify dependencies on other contributors
- [ ] Agree on relevant API contracts or data formats

**During development**

- [ ] Follow existing coding conventions
- [ ] Avoid unnecessary dependencies
- [ ] Handle errors and edge cases
- [ ] Keep changes focused and reviewable
- [ ] Tell affected contributors about breaking changes

**Before committing**

- [ ] Run relevant tests
- [ ] Verify existing functionality still works
- [ ] Update documentation where necessary
- [ ] Record meaningful changes in `CONTEXT.md`
- [ ] Confirm no secrets or sensitive files are committed
- [ ] Review the Git diff for unintended changes

**Before merging**

- [ ] Confirm dependent components are compatible
- [ ] Verify API and schema compatibility
- [ ] Integration tests pass where applicable
- [ ] Resolve merge conflicts
- [ ] Get the required review
- [ ] Update the status of completed and pending tasks

---

## G. How to Maintain CONTEXT.md

Update this file whenever you make a meaningful change: a new endpoint, a changed request/response shape, a new dependency, a schema or config change, a breaking change, or a handoff. Do not copy the whole commit history; record decisions and impacts that commit messages do not make obvious.

For each change, add a row to the change log (section B) with: date, your name or Git identity, component, what changed and why, files modified, new dependencies or contract changes, integration impact, and what remains. If you change an API contract, also update the README and tell the other owner. Move finished items in section E, and tick section F only with evidence.

Git workflow summary (details in README): small branches (`feature/frontend-ui`, `feature/backend-api`, `feature/ai-integration`, `fix/...`, `docs/...`), focused commits, `git pull --rebase` before pushing, review before merging, update README and CONTEXT in the same change.
