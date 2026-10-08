# Prompt Heist

> A browser game where you break into AI-guarded vaults by talking to them, then learn how to defend against the same tricks. Powered by a local open-weight model (Gemma 4).

**Status: design phase.** At the time of writing, the repository contains documentation only. No frontend, backend, or AI code has been committed yet. Everything below that describes behaviour is the **planned design**, and each section says so. See [Current Development Status](#current-development-status) and [CONTEXT.md](CONTEXT.md) for what is actually done.

Built for Hacktoberfest Hack Day, Coimbatore 2026 (INIT Club x iDEA Club, with Major League Hacking).

## Team

**Team Name:** Team StromBreaker

| Member | Role | Contribution |
| ------ | ---- | ------------ |
| Shree Santh B | Team Lead, docs and demo | [Contribution] |
| Mudiam Hemanth Reddy | AI and level design | [Contribution] |
| Aditya S | Backend | FastAPI backend, SQLite storage, campaign rules, integration of the AI module, tests ([details](#team-contributions)) |
| Kirupashankar Chockkanathan | Frontend | [Contribution] |

Detailed task lists per role: [docs/ROLES.md](docs/ROLES.md). Shared change log and integration checklist: [CONTEXT.md](CONTEXT.md).

## Project Overview

### The Problem

Students and junior developers now build apps on top of large language models, but very few of them understand how those models fail. Prompt injection and jailbreaking are among the best-known security risks of LLM applications, yet they are usually taught through dry slides, if at all. As a result, new developers put secrets in prompts, trust "never reveal X" instructions as if they were security controls, and ship apps that are easy to manipulate.

### Why We Chose This Problem

AI security is a practical skill that the next generation of developers needs, and it is best learned by trying things safely. A game gives students a legal, sandboxed place to experiment, fail, and understand why a defence did or did not work.

### Solution

Prompt Heist is a level-based game set in **Silicon Bastion**, a world of corporate data-fortresses where open-weight AI guards have replaced human gatekeepers. You play the Cipher Phantom, an infiltrator whose only weapon is conversation. Each level has an AI "guard" that protects a fictional cipher and interrogates you about its own enterprise domain (for example water-leak detection, clinical-trial matching, or customs classification). You can answer its question, or use prompt injection (a claimed role, a word game, a formatting request) to make it say the cipher. You get 3 strikes per level. After each level, a debrief explains the technique that worked, why the guard was vulnerable, and how a real application would defend against it.

The campaign has **30 levels: 5 kingdoms of 6 levels**, each kingdom with its own enterprise domain (water grids, clinical trials, customs, insurance and grants, e-waste).

- Difficulty rises inside each kingdom, from a very basic guard at level 1 to the kingdom boss at level 6.
- Each level gives 3 lives, and a hint after the second miss.
- Level 3 of each kingdom is a checkpoint. After 3 strikes the player respawns at the level after the checkpoint, or at the start of the kingdom if no checkpoint has been reached yet.
- **The boss learns:** it is given the tactics the player used to beat that kingdom's earlier levels, and refuses them.

Campaign progress is saved per browser. Design: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and [docs/BACKEND_CAMPAIGN_SPEC.md](docs/BACKEND_CAMPAIGN_SPEC.md).

All targets are fictional and run locally. The goal is to build defenders, not attackers.

### Objectives

- Teach prompt-injection concepts through play.
- Show that instructions alone are not a security control.
- Keep everything local and free to run (open-weight model, no paid API).

## Key Features

| Feature | Status |
| ------- | ------ |
| Chat with an AI guard powered by a local open-weight model | Backend and AI module built; no UI yet |
| 30-level campaign: 5 kingdoms, 3 lives per level, hints, checkpoints, respawn, bonuses, saved per browser | Level files written (Mudiam); backend built and tested with a fake guard; not yet run end to end on the real model; no UI yet |
| Learning bosses: each kingdom's boss is given the player's earlier winning tactics in that kingdom | AI module (Mudiam) and backend wiring built; wiring tested with a fake guard |
| Win detection by deterministic server-side code | Built and tested |
| "What just happened?" debrief after each level (attack and defence) | Text written for Levels 1-6; no UI yet |
| Scoring and leaderboard | Backend built and tested; no UI yet |
| Campaign Maps 2-5 (Bio-Archives, Trade Ports, Risk Ledgers, Scrap Wastes) | Planned (stretch) |
| Defender mode: player writes the guard prompt and it is tested against stored attack messages | Planned (stretch) |
| Tamil/English toggle, sound effects, shareable result card | Planned (stretch) |

Update the Status column only when the feature has been built and verified.

## Innovation and Differentiation

- The AI model is the core of the product: every level is the model behaving differently.
- Runs entirely on the local machine, so students can experiment without API costs or sending data to a third party.
- Pairs attack and defence: each debrief ends with how to mitigate the issue.
- Win conditions are enforced in code, so the game stays fair even when the model is unpredictable.

## Technology Stack

Confirmed means a decision the team has made. Proposed means a recommendation that is not yet finalized. The AI module uses only the Python standard library; nothing else is installed in the repository yet.

| Area | Technology | Status |
| ---- | ---------- | ------ |
| Frontend | [To be decided by the frontend owner] | Not decided |
| Backend | Python with FastAPI, tested with pytest | Implemented (`backend/`) |
| AI / ML | Gemma 4 `gemma4:e2b` served by Ollama | Implemented and tested locally (see Current Development Status) |
| Database | SQLite (Python's built-in `sqlite3`) | Implemented (`backend/app/db.py`) |
| Authentication | None (player enters a display name) | Proposed |
| API style | JSON over HTTP (REST) | Proposed |
| Package managers | pip (backend), npm (frontend, if Node-based) | Proposed |
| Deployment | Local run for the demo; optional hosting [TBD] | Not decided |

### Technology Justification

- **Gemma via Ollama:** open-weight model that runs on a laptop, which satisfies the Open-Source AI and Gemma 4 challenge requirements and keeps cost at zero. Ollama exposes a simple local HTTP API. The model in use is `gemma4:e2b` (about 4.6 GB on disk). Its license is not stated on the Ollama page and must be checked on the official Gemma terms before it is cited as final.
- **FastAPI:** small, quick to write, automatic request validation and interactive API docs, which helps frontend and backend agree on contracts.
- **SQLite:** no server, account or internet connection needed, and enough for sessions, chat history and scores in a one-day build. The data is relational: sessions have messages, and the leaderboard is a sorted query. All SQL is in `backend/app/db.py`, so a hosted database (for example Supabase Postgres) could replace it later.
- **No authentication (proposed):** reduces scope. The leaderboard is a game feature, not a security boundary.

## Project Architecture

Planned design, not yet implemented.

```mermaid
flowchart LR
    A[Browser UI] -->|JSON over HTTP| B[Backend API]
    B --> C[Level config: guard prompt, secret, debrief]
    B -->|prompt| D[Gemma via Ollama]
    D -->|reply| B
    B --> E{Reply contains secret?}
    E -->|yes| F[Level won]
    E -->|no| G[Attempt used]
    B --> H[(SQLite: sessions, scores)]
```

### Component Responsibilities

| Component | Owner | Responsible for | Must not do |
| --------- | ----- | --------------- | ----------- |
| Frontend | Kirupashankar | UI, screens, calling the backend API, loading and error states | Hold the secret, the guard prompt, or call Ollama directly |
| Backend | Aditya | API, sessions, attempt counting, win check, scoring, database, calling the AI module | Contain level prompt text (read it from the level config) |
| AI / levels | Mudiam Hemanth Reddy | Guard prompts, secrets, debrief text, the function that calls Ollama, model selection and testing | Decide who wins (the backend's code does that) |
| Database | Shree Santh B | Sessions and scores | Store real personal data |

Communication paths: Frontend to Backend only. Backend to AI module (in-process) and to the database. The AI module talks to Ollama. The frontend never talks to the AI directly.

### AI-Backend Integration Decision

The AI component is a Python module **inside the backend application**, not a separate service. It calls Ollama's local HTTP API. This avoids extra infrastructure and keeps the frontend unaware of the model. If the team later moves the model elsewhere, only this module changes.

Proposed interface (to be agreed between Mudiam and Aditya before coding):

```python
def guard_reply(level: Level, history: list[Message], user_message: str) -> str:
    """Return the guard's reply text. Raise AIUnavailableError or AITimeoutError on failure."""
```

- `Level` comes from the level config in `levels/` (guard prompt, secret, max attempts, debrief).
- `history` is the previous user and guard messages for this session, kept server-side.
- The secret is placed only in the server-side prompt. It must never appear in any API response or in logs.

## System Workflow

Planned data flow for one chat turn:

1. Player opens the app. The frontend calls `GET /api/levels` and shows the list.
2. Player picks a level. The frontend calls `POST /api/sessions` and receives a `session_id`.
3. Player types a message. The frontend calls `POST /api/sessions/{session_id}/messages`.
4. The backend validates the input, loads the session and level, and calls `guard_reply(...)`.
5. The AI module builds the prompt, calls Ollama, and returns the guard's reply text.
6. The backend checks the reply for the secret. If found, it marks the session won and computes the score. Otherwise it decrements the attempts.
7. The backend returns the reply, attempts remaining, and the win/lose state. On the final state it includes the debrief.
8. The frontend renders the reply and, when the level ends, the debrief and score.

## API Documentation

**Proposed contract. Not implemented.** If the frontend needs an endpoint that the backend has not built, it is a pending integration requirement (see CONTEXT.md), not an existing API. Both owners must agree on any change here and record it in `CONTEXT.md`.

Conventions: JSON, `snake_case` field names, base path `/api`.

### Error format (all endpoints)

```json
{ "error": { "code": "string_code", "message": "Human-readable message" } }
```

| HTTP status | `code` | Meaning |
| ----------- | ------ | ------- |
| 400 | `invalid_request` | Missing or invalid field, or message too long |
| 404 | `not_found` | Unknown level, session or campaign |
| 409 | `level_finished` | Session already won or out of attempts |
| 409 | `level_locked` | This campaign session's level is no longer the campaign's current level |
| 502 | `ai_unavailable` | Ollama unreachable or returned an invalid response |
| 504 | `ai_timeout` | Model did not answer within the timeout |

The frontend should show a friendly message for 502 and 504 and let the player retry. A failed AI call must **not** consume an attempt.

### `GET /api/health`

Returns `200 {"status": "ok"}`.

### `GET /api/health/ai`

Whether the guard can answer. It does not call the model.

- Ready: `200 {"status": "ok", "mode": "stub" | "ollama", "model": "gemma4:e2b" | null, "host": "string" | null}`.
- Not ready: `503` with code `ai_not_ready` and the reason, for example that Ollama cannot be reached or the model is not pulled.

The frontend can use it to show a "guard offline" notice.

### `GET /api/levels`

Returns the 30 levels in numeric order. Never includes the secret, the guard prompt, the hint or `learns`.

```json
{ "levels": [ { "id": 6, "title": "string", "kingdom": 1, "kingdom_name": "The Civic Grids",
                "domain": "AquaLeak Triage", "position": 6, "checkpoint": false, "boss": true,
                "difficulty": "Boss", "character": "string", "setting": "string", "intro": "string",
                "opening": "string (the guard's scripted first line)", "max_attempts": 3 } ] }
```

`id` is `(kingdom - 1) * 6 + position`. `checkpoint` is true at position 3, and `boss` at position 6.

### `POST /api/campaigns`

Starts a campaign (one browser's run through the 30 levels). There is no login: the frontend stores `campaign_id` in `localStorage`, so progress is per browser.

Request `{ "player_name": "string, 1-30 characters" }`. Response `201`: the campaign state (below), at level 1.

### `GET /api/campaigns/{campaign_id}`

Response `200` (`404 not_found` for an unknown campaign):

```json
{
  "campaign_id": "string",
  "player_name": "string",
  "status": "in_progress",
  "current_level_id": 4,
  "current_kingdom": 1,
  "checkpoint_level_id": 3,
  "cleared_level_ids": [1, 2, 3],
  "total_score": 3500
}
```

`status` is `in_progress` or `completed`. When the campaign is completed, `current_level_id` stays at the last level and every level is in `cleared_level_ids`.

### `POST /api/campaigns/{campaign_id}/sessions`

No body. Starts the session for the campaign's current level, or returns the unfinished one (for example after a page reload). Response `201`: `{ "session_id", "level_id", "attempts_remaining", "level": { ...as in GET /api/levels } }`. A completed campaign returns `409 level_finished`.

### `GET /api/campaigns/leaderboard`

Response `200`: `{ "entries": [ { "player_name", "total_score", "status", "levels_cleared" } ] }`, highest total first, top 50.

### Campaign rules

These apply when a campaign session ends. Free-play sessions never touch a campaign.

- **Win:** the level's score is recorded. The total counts each level once, at its best score, so replays cannot farm points. The winning message is kept for the kingdom's boss to learn from.
  - Position 3 (checkpoint): the checkpoint is set and a **500** bonus is added.
  - Position 6 (boss): the kingdom is cleared, a **1000** bonus is added, and the next kingdom starts without a checkpoint.
  - Level 30: the campaign is completed.
- **Loss (3 strikes):** the player respawns at the level after the checkpoint, or at the kingdom's first level if no checkpoint has been reached. Lives are back to 3. Winning messages from the respawn level on are dropped, so the boss only learns from wins the player kept. Scores already earned are kept.
- **Learning boss:** for `learns` levels, the backend calls `guard_reply(..., learned_attacks)` with this campaign's kept winning messages in the same kingdom, oldest first, as `{ "message", "technique" }` items. The technique is the winning level's `debrief.technique`. Every other level, and free play, gets `None`.

### `POST /api/sessions` (free play)

Starts a play session for any level, outside a campaign.

Request:

```json
{ "level_id": 1, "player_name": "string, 1-30 characters" }
```

Response `201`:

```json
{ "session_id": "string", "level_id": 1, "attempts_remaining": 3 }
```

### `POST /api/sessions/{session_id}/messages`

Sends one player message to the guard.

Request:

```json
{ "message": "string, 1-500 characters" }
```

Response `200`:

```json
{
  "reply": "string",
  "attempts_remaining": 2,
  "status": "in_progress",
  "score": null,
  "debrief": null,
  "hint": null,
  "campaign": null
}
```

`status` is one of `in_progress`, `won`, `lost`. When `status` is `won` or `lost`, `debrief` is an object `{ "title", "technique", "vulnerability", "defence" }` (all strings) and `score` is set when won. `hint` is a string only on the response to the second failed attempt while the level is still in progress; otherwise `null`. `campaign` is `null` for free play and while a level is in progress. When a campaign level ends, it is:

```json
{
  "outcome": "won",
  "level_score": 1000,
  "bonuses": { "checkpoint": 500, "kingdom": 0 },
  "total_score": 3500,
  "next_level_id": 4,
  "respawn": false,
  "checkpoint_reached": true,
  "kingdom_cleared": false,
  "campaign_completed": false
}
```

`next_level_id` is the level played next: the following level after a win, the respawn level after a loss, or `null` when the campaign is completed.

Scoring: `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach, where `strikes` is the number of failed attempts before the win. With 3 attempts that is 1000, 500 or 250.

Win rules (implemented in `backend/app/game.py`, described in `levels/README.md`): the reply wins if the normalised text contains the secret, **unless the player's own message already contains every part of the secret** (echo guard).

### `GET /api/leaderboard?level_id=1`

Response `200`:

```json
{ "entries": [ { "player_name": "string", "score": 0, "attempts_used": 0 } ] }
```

### Validation rules

- `message`: required, 1 to 500 characters, trimmed.
- `player_name`: required, 1 to 30 characters.
- `level_id`: must exist.
- Reject new messages once a session is `won` or `lost`.

### AI input and output (internal)

- Input: guard prompt (system), session history, the new user message.
- Output: plain text reply, capped in length (proposed `num_predict` limit) so replies stay fast.
- If the output is empty or the call fails, raise an AI error and return 502 or 504.

## Repository Structure

Current, verified:

```
.
├── README.md        Project documentation (this file)
├── CONTEXT.md       Shared change log, handoffs, integration checklist
├── CHECKLIST.md     Team-wide Hack Day to-do list
├── AGENTS.md        Rules for coding agents working in this repo (from the organizers)
├── CLAUDE.md        Points Claude Code at AGENTS.md
├── .env.example     Environment variables (no secrets)
├── ai/guard.py      AI module: guard_reply() calls Ollama (Mudiam)
├── levels/          Level files: guard prompt, secret, debrief (Mudiam)
├── tools/           smoke_test.py (try a level) and dev_server.py (temporary stand-in backend)
├── tests/           Unit tests for the AI module, level rules, and the API contract
├── backend/         FastAPI backend, SQLite storage and its pytest tests (Aditya); see backend/README.md
└── docs/
    └── ROLES.md     Per-role task plan
```

Proposed, not yet created:

```
frontend/    UI (Kirupashankar)
LICENSE      Open-source license (required for submission)
.gitignore   Must ignore .env and build/cache folders
```

## Installation and Setup

Prerequisites:

- Git
- Python 3.10 or newer (tested with 3.12)
- To play against the real guard: [Ollama](https://ollama.com) with the model pulled, `ollama pull gemma4:e2b` (about 4.6 GB). Without it, the backend runs with canned "stub" replies.
- Node.js, if the frontend uses it (frontend owner to confirm)

Backend setup, tested from a fresh clone on Linux:

```bash
git clone https://github.com/shreesanth-78/hacktoberfest-hack-day-coimbatore-x-init-club-and-idea-club.git
cd hacktoberfest-hack-day-coimbatore-x-init-club-and-idea-club
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env               # then edit .env (see below)
python -m pytest                   # all tests; no model needed
```

On Windows PowerShell, use these in place of the venv, activate and copy lines:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1          # if scripts are blocked: Set-ExecutionPolicy -Scope Process Bypass
copy .env.example .env
```

In `.env`:

- **Without a model:** uncomment `GUARD_STUB=1`.
- **With the real guard:** leave it commented, keep `OLLAMA_MODEL=gemma4:e2b`, and make sure Ollama is running.

## Environment Variables

Documented in [.env.example](.env.example). Copy it to `.env` in the repository root and edit it; the backend loads it on startup, and variables set in the shell take priority. **Never commit `.env`**, and never put real secrets in the example file. No variable here is currently a secret, because Ollama runs locally without a key.

| Variable | Used by | Purpose |
| -------- | ------- | ------- |
| `OLLAMA_HOST` | Backend / AI module | Ollama base URL |
| `OLLAMA_MODEL` | Backend / AI module | Model tag to run (`gemma4:e2b`) |
| `OLLAMA_TIMEOUT_SECONDS` | Backend / AI module | Max wait for a model reply |
| `DATABASE_PATH` | Backend | SQLite file location |
| `CORS_ORIGINS` | Backend | Allowed frontend origin(s) |
| Frontend base URL variable | Frontend | Backend base URL (name depends on the chosen framework) |

The secret code words live in the server-side level config, never in frontend code.

## Running the Project

The frontend does not exist in the repository yet. Backend, from the repository root, with the virtual environment active (details: [backend/README.md](backend/README.md)):

```bash
uvicorn backend.app.main:create_app --factory --port 8000
# API docs to try every endpoint: http://localhost:8000/docs
# Is the guard ready?             http://localhost:8000/api/health/ai

# In a second terminal: play every attack and a campaign through the API
python backend/scripts/e2e_check.py --levels 6 --trials 3
```

**Demo with the frontend on another laptop.** Start the backend with `--host 0.0.0.0`, so it accepts connections from the network. Add the frontend's address to `CORS_ORIGINS` in `.env`, for example `CORS_ORIGINS=http://<frontend-ip>:5173,http://localhost:5173`. Point the frontend at `http://<backend-ip>:8000`. This was tested on a local network with the stub guard. Venue Wi-Fi can block laptop-to-laptop traffic, so running everything on one laptop is the safest demo.

AI tools by the AI owner (verified on Windows with an NVIDIA RTX 4060 laptop GPU):

```bash
# 1. Make sure Ollama is running and the model is pulled
ollama pull gemma4:e2b

# 2. Try one level from the command line (PowerShell: $env:OLLAMA_MODEL="gemma4:e2b")
OLLAMA_MODEL=gemma4:e2b python tools/smoke_test.py 1 "What is the vault code word?"

# 3. Run the temporary stand-in server for frontend development
#    (add GUARD_STUB=1 to run without a model)
OLLAMA_MODEL=gemma4:e2b python tools/dev_server.py     # http://localhost:8000

# 4. Run the tests (no model needed)
python -m unittest discover -s tests
```

`tools/dev_server.py` implements the proposed API contract in memory so the frontend can be built now. It is temporary: it will be replaced by the real backend and then deleted.

## Development Guidelines

### Git workflow

The repository currently has a single `main` branch, and early commits were made directly on it. Proposed for the rest of the Hack Day (keep it light):

- Small branches named by area: `feature/frontend-ui`, `feature/backend-api`, `feature/ai-integration`, `fix/api-validation`, `docs/project-documentation`.
- Focused commits with clear messages, at least one per hour per member.
- `git pull --rebase` before pushing.
- Merge to `main` through a pull request, reviewed by at least one other member. If time is very short, direct pushes to `main` are acceptable only for a member's own folder.
- Update `README.md` and `CONTEXT.md` in the same change when behaviour, setup, or an API contract changes.
- Run available tests before merging.

### Coding standards

- Follow the conventions of the language and framework the component uses; follow existing code once it exists.
- Do not add dependencies without need. Record any new dependency in `CONTEXT.md`.
- Never hardcode secrets. Use environment variables.
- Do not fabricate results, benchmarks, or claims (see AGENTS.md).

## Testing

Run everything with `python -m pytest` (needs `backend/requirements.txt` installed), or only the AI tests with `python -m unittest discover -s tests`. The backend tests (`backend/tests/`, no model needed) cover the win check, output filter and scoring, level file validation, every endpoint and error code (400/404/409/502/504), AI failures not using an attempt, secrets never appearing in `/api/levels`, the chat history sent to the model, the leaderboard, and data surviving a restart. The AI tests (no model needed; Ollama is faked) cover the AI module, the level files, the filter and win rules, and the API contract through the stand-in server.

Still planned:

- A manual end-to-end check of one full level: start session, send messages, win, see debrief, appear on the leaderboard.
- Manual difficulty testing of each level's guard.

New features should come with a test or a documented manual check.

## Deployment

Not implemented. Proposed: run locally for the demo, because the model runs on the presenter's machine. Optional: host the backend and frontend on a platform such as DigitalOcean if a hosted demo is wanted, which needs enough CPU/RAM to serve the model. This decision is open.

## Current Development Status

**Completed (verified in the repository):**

- Repository created from the organizers' template, with all four members listed.
- Project concept, README, and role plan written.
- AI module `ai/guard.py` (`guard_reply`) implemented. Tested against the real `gemma4:e2b` model locally: about 3 seconds per reply on the GPU.
- 30-level campaign backend (`backend/app/campaign.py`): campaigns, respawn, bonuses and learning-boss wiring, tested with a fake guard and through the HTTP API with a guard that always leaks (full campaign completes, 37,500 points, each boss receives its kingdom's 5 kept tactics). Not yet run on the real model.
- Map 1, Levels 1 to 3 (AquaLeak Triage, TrialMatch AI, TariffSense) written and tuned against the real model, 6 trials per attack. Wrong answers and plain demands rarely win; the intended tricks (a correct answer or developer override, a word game, a document-formatting request) win 5 to 6 times out of 6. Details in `levels/README.md`.
- Unit tests for the AI module, level rules and the API contract pass.
- Temporary stand-in server `tools/dev_server.py` runs the proposed API contract.
- Backend (`backend/`): FastAPI app implementing the API contract with SQLite storage (merged in PR #2). Run against the real `gemma4:e2b` model on branch `feature/ai-levels-map1` (after a compatibility patch for the new level fields, the hint, the score formula and the echo guard): a 3-strike loss with the hint, a win by a correct answer, a win by document formatting, the echo exploit staying a non-win, and the leaderboard all behaved correctly. All 67 backend tests and 24 AI-side tests pass on that branch.

**Not started:** frontend, LICENSE, deployment, Defender mode, Levels 4 to 30 and the checkpoint/respawn flow (progress across levels).

**Known limitations / open questions:**

- The Gemma license terms are not yet verified. Gemma 4 on Ollama is a model that "thinks" first, so the AI module sends `think: false`; without it the reply can come back empty. The first reply after loading the model is slower.
- The frontend framework is not chosen.
- The API contract above was implemented by Aditya; the frontend owner has not confirmed it yet. Fields added for the new game design (`character`, `setting`, `opening`, `hint`, `debrief.vulnerability`) need the backend branch `feature/ai-levels-map1` to be merged.
- Level 1's guard sometimes gives away the answer to its own question after a wrong reply. That is in character, but it means a second try can use it.
- Hosting approach is undecided.

## Future Improvements

- Defender mode (write the guard, test against stored attacks).
- Additional levels with layered defences.
- Tamil/English toggle, sound, shareable result card, daily challenge.

## Responsible Use

Prompt Heist is a training game with fictional targets that run locally. Only practise attack techniques on systems you own or have explicit permission to test. Testing real services without permission can break their terms of use and the law.

## Implementation During the Hackathon

Each member adds their own part. Everything below was built during the Hack Day; see the Git history and pull requests #1-#7.

### Backend (Aditya S)

- **FastAPI backend** (`backend/`) implementing the API contract: levels, free-play sessions, messages, leaderboard, and a readiness check that reports whether the guard can answer and why not.
- **SQLite storage** with automatic upgrades for older database files. All SQL is in one file (`backend/app/db.py`).
- **Game rules in code, not in the model:**
  - win detection, including the echo guard from the AI owner
  - the output filter
  - scoring
  - hints
  - a failed AI call never costs a life
- **30-level campaign** (`backend/app/campaign.py`), saved per browser:
  - checkpoints and respawn
  - checkpoint and kingdom bonuses
  - completion and a campaign leaderboard
  - **learning bosses**, which receive the player's kept winning tactics from their own kingdom
- **Safety checks:**
  - the cipher, guard prompt and hint never leave the server
  - the loader rejects level files whose opening, hint or debrief contain the cipher
  - campaign changes are applied in one transaction, and only if the campaign has not moved on
- **Integration:**
  - merged the AI owner's level and AI-module branches into the backend twice (PRs #4 and #7)
  - `.env` loading
  - an end-to-end script that plays attacks and a full campaign through the HTTP API
- **Tests:** 126 backend tests (pytest) in `backend/tests/`, run with fake guards. Key rules were also checked by deliberately breaking them and confirming that tests fail.

### Team Contributions

- **Shree Santh B:** [Contribution]
- **Mudiam Hemanth Reddy:** [Contribution]
- **Aditya S:** backend design and implementation (FastAPI, SQLite, campaign rules, learning-boss wiring), integration of the AI module and level files, backend tests and the end-to-end check script, and backend documentation. PRs #1-#7.
- **Kirupashankar Chockkanathan:** [Contribution]

## Working Application

**Live Application:** [Live URL, or N/A if run locally]

[Briefly explain how the application can be accessed and what can be tested.]

## Demo Video

**Demo Video:** [Video URL]

## Open Source and AI Usage

### AI / Models

- **Gemma 4 (`gemma4:e2b`, via Ollama):** plays the guard in each level. Model card and license: [link to be added after verification].

### Open Source Components

- **Ollama:** runs the model locally (license to be confirmed).
- **FastAPI** (MIT), **Uvicorn** (BSD-3-Clause), **pytest** (MIT), **httpx2** (BSD-3-Clause, used by the test client): backend server and tests. **SQLite** (public domain) through Python's built-in `sqlite3`.
- **[Frontend framework]:** [Purpose]

[Add licenses and attribution for each component actually used.]

## Challenges and Learnings

Each member adds their own.

### Backend (Aditya S)

- **Four people on one repository.** Two branches were built on an older `main`, and once git merged a file "successfully" into a broken result (a duplicated field) without reporting a conflict.
  - Learning: pull before every change, keep each person in their own folder, and read every auto-merged file.
- **The model is unpredictable, so the rules cannot live in it.** Wins, lives, checkpoints and scores are decided in code and covered by tests. That keeps the game fair even when the guard behaves differently from one try to the next.
- **A spec can hide exploits.** A running campaign total would let a player farm points by winning a level and losing the next one again and again.
  - The fix: each level counts once, at its best score.
  - The AI owner caught a similar hole, the "echo" win, where the player types the cipher and the guard repeats it.
- **Documented is not the same as working.** The README told people to use a `.env` file that nothing read.
  - Learning: test the setup steps from a fresh clone, exactly as written.
- **Tests that pass on the first run can be hollow.** Deliberately breaking the code caught tests that did not check what they claimed, for example one that never exercised two games finishing at once.

## Devpost Submission

**Devpost Project:** [Devpost Project URL]

## Credits and License

### Credits

Template and rules by INIT Club, iDEA Club, and Major League Hacking. [Add libraries, frameworks, models, and contributors actually used.]

### License

[License name and link. A LICENSE file must be added to the repository root before submission.]

## Submission Checklist

- [ ] Project title and description added
- [ ] All team members listed
- [ ] Problem clearly explained
- [ ] Reason for choosing the problem explained
- [ ] Solution and key features documented
- [ ] Innovation and differentiation explained
- [ ] Architecture included
- [ ] Technical implementation documented
- [ ] Work completed during the hackathon documented
- [ ] Team contributions documented
- [ ] Working application is functional
- [ ] Live application link added where applicable
- [ ] Demo video added
- [ ] AI and open-source components documented
- [ ] Setup and usage instructions tested
- [ ] Challenges and learnings documented
- [ ] Devpost submission completed
- [ ] Devpost link added
- [ ] Credits added
- [ ] License added
- [ ] Repository is organized and complete
