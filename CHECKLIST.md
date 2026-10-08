# Hack Day Checklist

Team-wide to-do list for Prompt Heist. Tick an item only when it is done and verified. Technical change tracking and the integration checklist are in [CONTEXT.md](CONTEXT.md); role details are in [docs/ROLES.md](docs/ROLES.md).

## 1. Hackathon rules

- [x] Team of 4 formed; Team Lead is Shree Santh B
- [x] Repository created from the organizers' template, today
- [x] All 4 members are collaborators on the repository
- [ ] Every member has made at least 1 commit under their own GitHub account
- [ ] Every member commits at least once per hour during the Hack Day
- [ ] Project is built during the Hack Day (nothing pre-built)
- [ ] Repository is public
- [ ] Open-source `LICENSE` file in the repo root (MIT or Apache-2.0)
- [ ] Working build can be demonstrated (not just slides)
- [ ] Open-source or open-weight AI is a core part of the project
- [ ] Model is named in the README with a link to its license or terms

## 2. Setup

- [x] Project idea chosen (Prompt Heist)
- [x] README and role plan written
- [x] README, CONTEXT.md, CHECKLIST.md, .env.example pushed to GitHub
- [ ] Everyone has cloned the repo and set their Git name and email
- [x] `.gitignore` added (ignores `.env`, caches, build output) (Python entries added by Aditya; frontend owner to add build output)
- [ ] Ollama installed on the team laptops (done on Mudiam's laptop only)
- [x] Gemma variant chosen (`gemma4:e2b`), pulled, and confirmed to run (Mudiam's laptop)
- [x] Level config format agreed (`levels/README.md`; confirmed by Aditya)
- [x] Backend stack chosen: FastAPI, pytest, SQLite (reasons in CONTEXT.md section D)
- [ ] Backend can reach the model on Mudiam's laptop (LAN), or demo runs fully on Mudiam's laptop
- [ ] API contract confirmed (backend owner and frontend owner)
- [ ] Frontend framework chosen

## 3. AI and levels (Mudiam Hemanth Reddy)

- [ ] Gemma model card and license read; link added to README
- [x] `guard_reply` module written and tested
- [x] Level 1 guard prompt and fake secret
- [x] Level 2 guard prompt and fake secret
- [x] Level 3 guard prompt and fake secret
- [x] Debrief text for each level (technique and defence) (Levels 1-3)
- [ ] Each level hand-tested for difficulty (first pass done; needs more)
- [ ] Test attack messages saved for each level
- [ ] Stretch: Levels 4 and 5 (replaced by the campaign below)
- [x] Map 1 level files written (Levels 4-6, from the game plan; Aditya)
- [ ] Map 1 tested and tuned on `gemma4:e2b` with the attacks in `docs/GAME_DESIGN.md`
- [ ] Stretch: campaign Maps 2-5

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
- [ ] Secret never appears in responses or logs (tested for `/api/levels` and filtered replies; server log has no bodies; recheck with the real model)
- [x] API tests for every endpoint and error code (400/404/409/502/504)
- [ ] Tested against the real model on Mudiam's laptop; `tools/dev_server.py` can then be deleted
- [x] Backend run commands written in the README and tested
- [x] Campaign support: map fields, opening line in history, checkpoint restart, secret-leak checks on opening/debrief

## 5. Frontend (Kirupashankar Chockkanathan)

- [ ] Project set up; backend base URL read from configuration
- [ ] Level select screen
- [ ] Chat screen (attempts left, win and lose states)
- [ ] Loading state while the model replies
- [ ] Error handling and retry on AI errors
- [ ] Debrief screen
- [ ] Leaderboard screen
- [ ] Levels grouped by map; guard `opening` shown as the first message; strikes shown
- [ ] On loss, "restart from checkpoint" uses `restart_level_id`
- [ ] Responsible-use notice before the first level
- [ ] Readable on a laptop or projector

## 6. Integration

- [ ] Frontend, backend, and AI module run together locally
- [ ] One full level played end to end (start, chat, win, debrief, leaderboard)
- [ ] Setup instructions in the README tested by someone who did not write them
- [ ] No component breaks another after merging

## 7. Docs and submission (Shree Santh B)

- [ ] README sections accurate and filled in (no leftover placeholders)
- [ ] Team contributions written from real commit history
- [ ] Challenges and learnings written
- [ ] Informal playtest feedback from 3 to 5 people recorded (real answers only)
- [ ] Demo video recorded; link added
- [ ] Devpost project created; link added
- [ ] No secrets committed (`.env` is not tracked)
- [ ] Submitted through OrganizerHQ before the deadline
- [ ] Best Open-Source AI Project selected in the submission
- [ ] Gemma 4 box ticked in the submission
- [ ] Optional: DEV Challenges write-up published
