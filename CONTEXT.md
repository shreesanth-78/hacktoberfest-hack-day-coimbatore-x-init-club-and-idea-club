# CONTEXT.md: Shared Development Context

Shared change log, handoff board, and integration checklist for **Prompt Heist** (Team StromBreaker). Read this before you start. Update it when you make a meaningful change (see [section G](#g-how-to-maintain-contextmd)).

Rule for this file: record only what is true. Use `Not specified` when unknown. Mark a task done only when it is implemented **and** verified.

---

## A. Project Context

**Overview.** Prompt Heist is a browser game. The player chats with an AI "guard" that protects a fictional secret and tries to make it reveal the secret. A debrief then explains the technique and the defence. Goal: teach prompt-injection concepts safely, with a local open-weight model. Full description: [README.md](README.md).

**Current state (verified from the repository):** documentation only. No frontend, backend, AI, database, or test code exists yet.

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
| `backend/`, `frontend/`, `levels/`, `tests/` | Application code | No (proposed) |
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

- APIs and endpoints implemented: none yet.
- Business logic, database, auth: none yet. Auth not planned.
- Pending: project setup and health check; sessions; messages endpoint; deterministic win check; attempt counting; scoring; SQLite; leaderboard; validation and error format; tests.
- Depends on: the AI module interface (`guard_reply`), the level config format from Mudiam, the confirmed API contract.

### AI Development (Mudiam Hemanth Reddy)

- Models/frameworks: Gemma (variant TBD) via Ollama. Not yet installed or verified on the team's machines.
- Prompts, pipelines: none written yet.
- Input format: guard prompt, session history, new user message. Output: plain text reply (length-capped).
- Backend integration: AI module runs inside the backend and exposes `guard_reply(level, history, user_message) -> str`, raising `AIUnavailableError` or `AITimeoutError`.
- Configuration: `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`.
- Error handling, latency: a failed call must not consume a player attempt; latency on team laptops is unmeasured.
- Pending: install and verify the model and its license; write Levels 1 to 3 (prompt, fake secret, debrief); manual difficulty testing; level config format agreed with Aditya.

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
6. Level config format (where prompts, secrets, debriefs live): **not yet defined**. Mudiam and Aditya must agree on it first.

**Known integration issues:** none observed yet, because nothing is built. Risk to watch: the frontend and backend building against different assumptions about the contract in the README.

---

## E. Pending Tasks and Handoffs

| Task | Owner | Depends on | Next steps | Status | Acceptance criteria |
| ---- | ----- | ---------- | ---------- | ------ | ------------------- |
| Confirm the API contract in the README | Aditya, Kirupashankar | None | Review README "API Documentation"; edit it and log changes in section B | Not started | Both owners agree; README matches what is built |
| Define level config format | Mudiam, Aditya | None | Choose file format and fields (id, title, intro, guard prompt, secret, max attempts, debrief) | Not started | Example level file in `levels/`; backend can load it |
| Install Ollama and verify Gemma variant and license | Mudiam | None | Pull model, run a prompt, read model card | Not started | Model replies locally; license link added to README |
| Write Levels 1 to 3 | Mudiam | Level config format | Write prompts, fake secrets, debriefs; test by hand | Not started | Level 1 beatable easily, Level 3 hard but possible |
| `guard_reply` AI module | Mudiam | Ollama working | Implement and unit test with a stub | Not started | Returns text; raises the two error types on failure |
| Backend API | Aditya | Contract, level config, `guard_reply` | Build endpoints, win check, scoring, SQLite | Not started | Endpoints match the contract; win check tested |
| Frontend | Kirupashankar | Contract (can use mock responses first) | Choose framework; build screens | Not started | One level playable against the backend |
| LICENSE and `.gitignore` | Shree Santh | None | Add MIT or Apache-2.0; ignore `.env`, caches | Not started | Files in repo root |
| Demo, Devpost, OrganizerHQ submission | Shree Santh | Working build | Record video; submit before the deadline; tick Gemma 4 | Not started | Submitted before the window closes |

---

## F. Project Checklist

Tick only with evidence (code merged and verified).

- [ ] Frontend implementation
- [ ] Backend implementation
- [ ] AI implementation
- [ ] Database integration
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
