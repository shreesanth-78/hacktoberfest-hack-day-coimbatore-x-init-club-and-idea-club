# CONTEXT.md: Shared Development Context

Shared change log, handoff board, and integration checklist for **Prompt Heist** (Team StromBreaker). Read this before you start. Update it when you make a meaningful change (see [section G](#g-how-to-maintain-contextmd)).

Rule for this file: record only what is true. Use `Not specified` when unknown. Mark a task done only when it is implemented **and** verified.

---

## A. Project Context

**Overview.** Prompt Heist is a browser game. The player chats with an AI "guard" that protects a fictional secret and tries to make it reveal the secret. A debrief then explains the technique and the defence. Goal: teach prompt-injection concepts safely, with a local open-weight model. Full description: [README.md](README.md).

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
| 2026-10-08 | Mudiam Hemanth Reddy | AI / levels / backend compatibility | Rebuilt Levels 1-3 as Map 1 of the new Corporate Cyber-Feudalism design (AquaLeak Triage, TrialMatch AI, TariffSense) with `character`, `setting`, `opening`, `hint`, 3 attempts and `debrief.vulnerability`. Added the echo guard, the team score formula and the hint. Tuned all levels against the real model with `tools/level_trials.py`. Patched Aditya's backend for the new fields, then ran the real backend with the real model end to end. `num_predict` is now 80 | `levels/*`, `ai/guard.py`, `tools/*`, `tests/*`, `backend/app/{levels,schemas,game,main}.py`, `backend/tests/*`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | **API contract changed** (see section D, item 13): levels list gains `character`, `setting`, `opening`; message response gains `hint`; `debrief` gains `vulnerability`; score formula changed; win rule gains the echo guard. Frontend must read the new fields. Backend edits are on branch `feature/ai-levels-map1` for Aditya to review | Pushed on `feature/ai-levels-map1` (not merged to `main`) |
| 2026-10-08 | Aditya S | Backend | Built the FastAPI backend implementing the full README API contract: SQLite storage (sessions, messages), level loader with validation, filter/win/score rules, standard errors, CORS, per-session lock. 62 pytest tests; all 80 tests in the repo pass. Manually run with `GUARD_STUB=1`. Extended `.gitignore` (`.env`, `.venv/`, `__pycache__/`, `*.db`) | `backend/*`, `.gitignore`, `README.md`, `CONTEXT.md`, `CHECKLIST.md` | New deps in `backend/requirements.txt`: fastapi, uvicorn, pytest, httpx2. Contract unchanged. Frontend can switch from `tools/dev_server.py` to the real backend (same port and paths). Not yet run against the real model | In PR #2 |
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
- Business logic: filter, win check and placeholder scoring in `backend/app/game.py`. Database: `backend/app/db.py`. Auth not planned.
- Verified: 62 pytest tests pass, and a manual run with `GUARD_STUB=1` worked. **Not yet verified against the real model.**
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
- Prompts, pipelines: guard prompts for Map 1, Levels 1-3 written and tuned in `levels/` (6 trials per attack, results in `levels/README.md`). Findings: the scripted prompts, copied as written, were either too leaky (Level 1) or never beaten by the script's own example attacks (Levels 2 and 3). The shipped prompts keep each guard's voice but state the intended weakness explicitly.
- Input format: guard prompt, session history, new user message. Output: plain text reply (length-capped).
- Backend integration: AI module runs inside the backend and exposes `guard_reply(level, history, user_message) -> str`, raising `AIUnavailableError` or `AITimeoutError`.
- Configuration: `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`.
- Error handling, latency: a failed call must not consume a player attempt; latency on team laptops is unmeasured.
- Done: model installed and verified; Map 1 Levels 1-3 written and tuned; `guard_reply` implemented, unit tested and run through the real backend; level format v2 in `levels/README.md`; license checked (Google describes Gemma 4 as Apache 2.0; confirm on the model's own license file).
- Pending: Levels 4 to 30 (maps 2 to 5 and bosses); Aditya reviews the compatibility patch; test on other team laptops; re-tune if the model or its settings change.

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

13. **Level format v2 and contract changes (2026-10-08, Mudiam).** New required level fields: `character`, `setting`, `opening`, `hint`; `debrief` gains `vulnerability`; `max_attempts` is 3; `map` is optional. API changes: `GET /api/levels` also returns `character`, `setting`, `opening`; the message response gains `hint` (set only on the second failed attempt while in progress); `debrief` gains `vulnerability`; the score formula is `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach. Backend files changed on branch `feature/ai-levels-map1`: `backend/app/levels.py`, `schemas.py`, `game.py`, `main.py` and the three backend test files. **Aditya: please review and merge. Kirupashankar: the opening line and hint come from the API.**
14. **Echo guard.** A reply is not a win if the player's own message already contains every part of the secret (found while reviewing the script: asking the guard to write the two parts of the cipher on separate lines was a win even if the player typed both parts). Implemented in `backend/app/game.py` (`is_win(level, reply, user_message)`) and in `tools/smoke_test.py`.
15. **All shipped levels use `output_filter: "none"`.** The `block_exact` path is still supported and tested but unused.
16. **Not in the backend yet:** the checkpoint and respawn flow (3 strikes send the player back to the last checkpoint at Level 1 or 3), cross-level progress and the campaign score, and the Level 3 clearance bonus. These need a backend decision (store progress per player name or per browser) and the frontend map screen.
17. **Gemma 4 needs `think: false` and a short `num_predict`.** Without `think: false` replies can be empty. `num_predict` is 80 (team design), so replies stay short and fast (about 3 seconds on an RTX 4060).

**Known integration issues:** the Level 1 guard sometimes gives away the answer to its own question after a wrong reply (in character, but a second try can use it). The frontend has not been tested against the real API. The backend branch with the compatibility patch is not merged to `main`.

---

## E. Pending Tasks and Handoffs

| Task | Owner | Depends on | Next steps | Status | Acceptance criteria |
| ---- | ----- | ---------- | ---------- | ------ | ------------------- |
| Confirm the API contract in the README | Aditya, Kirupashankar | None | Review README "API Documentation"; edit it and log changes in section B | Not started | Both owners agree; README matches what is built |
| Define level config format | Mudiam, Aditya | None | Format written in `levels/README.md`; confirmed by Aditya | Agreed; loader not built yet | Example level files in `levels/`; backend can load them |
| Model reachable from the backend | Mudiam, Aditya | Ollama on Mudiam's laptop | Try LAN access (`OLLAMA_HOST=0.0.0.0`); fall back to running everything on Mudiam's laptop | Not started | Backend gets a real reply from `gemma4:e2b` |
| Install Ollama and verify Gemma variant and license | Mudiam | None | Model pulled and run | Model done; license check pending | Model replies locally (done); license link added to README (pending) |
| Write Levels 1 to 3 | Mudiam | Level config format | Written and hand-tested once | In progress (more tuning) | Level 1 beatable easily, Level 3 hard but possible |
| `guard_reply` AI module | Mudiam | Ollama working | Implemented, unit tested, run against the real model | Completed and verified locally | Returns text; raises the two error types on failure |
| Backend API | Aditya | Contract, level config, `guard_reply` | Run against the real model on Mudiam's laptop; then delete `tools/dev_server.py` (with Mudiam) | Implemented and tested with a fake guard (PR #2) | Endpoints match the contract; win check tested |
| Merge `feature/ai-levels-map1` (level format v2, hint, score, echo guard) | Aditya (review), Shree Santh (merge) | None | Review the diff of `backend/app/*` and tests; run `pytest backend/tests` and `python -m unittest discover -s tests` | Branch pushed, not merged | Both test suites pass on `main`; frontend can read `character`, `opening`, `hint` |
| Levels 4 to 30 (maps 2 to 5, bosses) | Mudiam | Map 1 pattern | Write guards per the domain list in the design (TrialMatch, TariffSense, SlotMaster, PolicyShield, GrantLedger, E-Waste DismantleCopilot); tune with `tools/level_trials.py` | Not started | Each level: wrong answer rarely wins, intended trick wins most trials |
| Checkpoint and respawn flow | Aditya (API), Kirupashankar (UI) | Level 3 cleared | Decide where progress is stored; add endpoints or fields | Not started | Three strikes send the player to the last checkpoint; checkpoint persists |
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
