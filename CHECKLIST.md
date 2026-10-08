# Hack Day Checklist

Team-wide to-do list for Prompt Heist. Tick an item only when it is done and verified. Technical change tracking and the integration checklist are in [CONTEXT.md](CONTEXT.md); role details are in [docs/ROLES.md](docs/ROLES.md).

## 1. Hackathon rules

- [x] Team of 4 formed; Team Lead is Shree Santh B
- [x] Repository created from the organizers' template, today
- [x] All 4 members are collaborators on the repository
- [x] Every member has made at least 1 commit under their own GitHub account (Git history: Shree Santh B, Mudiam Hemanth Reddy, Aditya S as `Adi-0202`, Kirupashankar as `kirupashankarchockkanathan`)
- [ ] Every member commits at least once per hour (not met: Kirupashankar has 3 commits, all in one afternoon; see Git history)
- [x] Project is built during the Hack Day (every commit is dated 2026-10-08, starting from the organizers' template; nothing pre-built)
- [x] Repository is public (checked with an unauthenticated request to the GitHub API: HTTP 200)
- [x] Open-source `LICENSE` file in the repo root (MIT; Shree to confirm the choice or switch to Apache-2.0)
- [x] Working build can be demonstrated (the whole game runs locally; all 30 levels played in the browser)
- [x] Open-source or open-weight AI is a core part of the project (Gemma 4 plays every guard)
- [x] Model is named in the README with a link to its license or terms (Gemma 4, Apache 2.0; Ollama, MIT)

## 2. Setup

- [x] Project idea chosen (Prompt Heist)
- [x] README and role plan written
- [x] README, CONTEXT.md, CHECKLIST.md, .env.example pushed to GitHub
- [x] Everyone has cloned the repo and set their Git name and email (all four appear in the Git history)
- [x] `.gitignore` added (ignores `.env`, caches, build output) (Python entries added by Aditya; frontend owner to add build output)
- [ ] Ollama installed on the team laptops (only on Mudiam's laptop, which is the demo machine)
- [x] Gemma variant chosen (`gemma4:e2b`), pulled, and confirmed to run (Mudiam's laptop)
- [x] Level config format agreed (`levels/README.md`; confirmed by Aditya)
- [x] Backend stack chosen: FastAPI, pytest, SQLite (reasons in CONTEXT.md section D)
- [x] Backend can reach the model: verified with the backend and Ollama on Mudiam's laptop (the planned demo setup)
- [x] API contract confirmed in practice: the backend implements it and the frontend adapter uses it, with 155 backend and AI tests, 18 frontend tests and a full play-through (Kirupashankar has not signed it off in writing)
- [x] Frontend framework chosen (React 19, Vite 6, React Router 7)

## 3. AI and levels (Mudiam Hemanth Reddy)

- [x] Gemma model card and license read; link added to README (Apache 2.0; confirm against the license file shipped with the model)
- [x] `guard_reply` module written and tested
- [x] Level 1 guard prompt and fake secret
- [x] Level 2 guard prompt and fake secret
- [x] Level 3 guard prompt and fake secret
- [x] Debrief text for each level (technique, vulnerability, defence) (Levels 1-3)
- [x] Each level tested for difficulty against the real model, 6 trials per attack (Levels 1-3; see `levels/README.md`)
- [x] Test attack messages saved for each level (`levels/attacks.json`, run with `tools/level_trials.py`)
- [x] All 30 levels written (5 kingdoms x 6, difficulty ladder, checkpoint at 3, boss at 6) and tested against the real model (`levels/trial_results.txt`)
- [x] Boss learning in the AI module (`learned_attacks`), tested against the real model
- [ ] Defender mode (stretch goal, not built)

## 4. Backend (Aditya S)

- [x] Project set up with a health check
- [x] Config read from env (`OLLAMA_*`, `DATABASE_PATH`, `CORS_ORIGINS`); CORS enabled for the frontend
- [x] Level loader reads `levels/*.json`
- [x] Output filter (`block_exact`) applied as in `levels/README.md`
- [x] Levels endpoint (no secret or prompt in the response)
- [x] Sessions endpoint
- [x] Messages endpoint calling the AI module
- [x] Win check in code (case-insensitive, simple variants)
- [x] Attempt counting; failed AI call does not use an attempt
- [x] Scoring and SQLite storage
- [x] Leaderboard endpoint
- [x] Validation and standard error format
- [x] Unit tests for the win check and scoring
- [x] Secret never appears in responses or logs, except when the guard says it and the player wins (rechecked 2026-10-08: 12 server log files scanned for all 30 secrets, 0 hits; API tests cover the level list and the hint)
- [x] API tests for every endpoint and error code (400/404/409/502/504)
- [x] Tested against the real model on Mudiam's laptop: the full 30-level campaign completes through the real backend (`docs/e2e_real_model_run.txt`). `tools/dev_server.py` can now be deleted
- [x] Backend run commands written in the README and tested
- [x] Backend setup tested from a fresh GitHub clone; network demo setup (`--host 0.0.0.0` and `CORS_ORIGINS`) tested
- [x] Backend parts of the README written: implementation, contributions, challenges and learnings
- [x] Campaign support: map and checkpoint fields, checkpoint restart, hint, echo guard, secret-leak checks on opening, hint and debrief
- [x] Campaign API (`/api/campaigns`): checkpoints, respawn, lives reset, bonuses, completion, leaderboard, saved per browser (replaces the earlier players/progress endpoints)
- [x] `.env` loaded on startup; `GET /api/health/ai` readiness check; `backend/scripts/e2e_check.py` end-to-end script
- [x] `e2e_check.py` run against the real model on Mudiam's laptop, output recorded in `docs/e2e_real_model_run.txt`
- [x] Learning bosses receive this campaign's kept winning messages in their kingdom (`learned_attacks`)

## 5. Frontend (Kirupashankar Chockkanathan)

- [x] Project set up; backend base URL read from configuration (`VITE_API_URL`, or `VITE_USE_BACKEND` with the dev proxy; `frontend/.env.example`)
- [x] Level select screen (world map of five kingdoms, and a map of six gates per kingdom)
- [x] Chat screen (attempts left, win and lose states), played in a real browser against the real model
- [x] Loading state while the model replies (the guard's typing dots; "Contacting the kingdom" at start-up)
- [x] Error handling and retry on AI errors (in-game texts for `ai_unavailable` and `ai_timeout`, a failed send is rolled back so it can be re-sent; covered by the adapter tests, not provoked live)
- [x] Debrief screen (technique, vulnerability and defence come from the backend)
- [x] Leaderboard screen (`/leaderboard`, checked in the browser)
- [x] The screens and API calls from `docs/FRONTEND_SPEC.md`: map of 5 kingdoms, gate encounter, hint, victory/debrief, defeat and respawn, checkpoint, player-name entry, leaderboard
- [x] `campaign_id` kept in `localStorage`; reloading the page resumes the campaign (checked in the browser: 3/6 survived a reload)
- [x] Responsible-use notice before the first level (on the title screen, and again in every debrief)
- [ ] Readable on a laptop or projector (only an 800x600 window was checked; test it on the demo screen)

## 6. Integration

- [x] Frontend, backend, and AI module run together locally (verified 2026-10-08: Ollama + `uvicorn` + `npm run dev`)
- [x] Levels played end to end in the browser (start, chat, win, debrief; also a defeat, a checkpoint and a respawn). The leaderboard was checked through the API, since the UI has no leaderboard screen
- [ ] Setup instructions in the README tested by someone who did not write them (backend steps were tested from a fresh clone by Aditya, the frontend steps by Mudiam; nobody else has followed them yet)
- [x] No component breaks another after merging (155 backend and AI tests, 18 frontend tests, and all 30 levels played in the browser on the merged branch)

## 7. Docs and submission (Shree Santh B)

- [x] README sections accurate and filled in (only the demo video and Devpost links are still placeholders, because those do not exist yet)
- [x] Team contributions written from real commit history
- [x] Challenges and learnings written
- [ ] Informal playtest feedback from 3 to 5 people recorded (not done: it needs real players; no feedback is invented)
- [ ] Demo video recorded; link added (script, messages and launcher are ready: `docs/DEMO_SCRIPT.md`, `scripts/start_demo.ps1`)
- [ ] Deployed on Render (prepared: `render.yaml`, `docs/DEPLOY.md`; needs the repository owner's Render account; the model cannot run on Render, see the guide)
- [x] A temporary public link works through a no-account tunnel (`docs/DEPLOY.md`, option E; tested 2026-10-08). It is only up while the laptop and the tunnel run, so it is not a permanent deployment
- [ ] Always-on PREVIEW on GitHub Pages (scripted mock guardians, not the real AI): workflow and build are ready and tested locally; it goes live when the repository owner switches Pages on (Settings, Pages, Source: GitHub Actions; see `docs/DEPLOY.md`, option F)
- [ ] Permanent link with the real model on a Hugging Face Space (files ready in `deploy/huggingface/`, steps in `docs/DEPLOY_HUGGINGFACE.md`; never built; needs a Hugging Face account to create the Space)
- [ ] Devpost project created; link added
- [x] No secrets committed (`.env` and `*.db` are ignored; checked before each commit)
- [ ] Submitted through OrganizerHQ before the deadline
- [ ] Best Open-Source AI Project selected in the submission
- [ ] Gemma 4 box ticked in the submission
- [x] Optional: DEV Challenges write-up published (by Shree: dev.to post of 2026-10-08, linked in the README; it describes the earlier mock-server prototype and should be updated)
