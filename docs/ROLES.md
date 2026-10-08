# Roles and Task Plan

Proposed split. Swap roles if the team prefers, but update the README Team table to match.

Rules for everyone:
- Commit at least once per hour, under your own GitHub account.
- Small, focused commits with clear messages.
- `git pull --rebase` before every push.
- Never commit secrets or `.env`.
- Work on your own folder to avoid merge conflicts.

## Repository layout (proposed)

```
backend/     Aditya
frontend/    Kirupashankar
levels/      Hemanth (guard prompts, secrets config, debrief text)
docs/        Shree Santh
tests/       shared
```

## Role 1: Team Lead, docs and demo (Shree Santh B)

1. Add the `LICENSE` file (MIT or Apache-2.0) to the repo root.
2. Add `.gitignore` and `.env.example`.
3. Keep the README accurate as features land; fill in the stack once decided.
4. Write the ethics and responsible-use screen text.
5. Collect 3 to 5 classmates for playtesting and record their real feedback.
6. Record the demo video, create the Devpost page, and make the OrganizerHQ submission (tick Best Open-Source AI and Gemma 4).
7. Final check against the README checklist.

## Role 2: AI and level design (Mudiam Hemanth Reddy)

1. Install Ollama, pull the Gemma model, and confirm it runs on the team laptops. Read the model card and license, and share the link with the Lead for the README.
2. Write the guard prompts and fake secrets for Levels 1 to 3 in `levels/` (for example one file or JSON per level).
3. Test each level repeatedly by hand: Level 1 should fall easily, Level 3 should be hard but possible. Adjust the prompts.
4. Write the "What just happened?" debrief text for each level: the technique, why it worked or failed, and how a real app would defend.
5. Provide a short list of test attack messages per level for Defender mode and for tests.
6. Stretch: Levels 4 and 5.

## Role 3: Backend (Aditya S)

1. Set up the project (planned: Python + FastAPI) and a health-check endpoint.
2. `POST /chat`: load the level config, call Ollama, return the reply and remaining attempts.
3. Win check in code: case-insensitive match of the secret in the reply, with simple variants. Never send the secret to the client.
4. Attempt counting per session, and score calculation.
5. SQLite for scores; `GET /leaderboard` and score submission.
6. Handle errors (Ollama down, timeout) and cap the reply length.
7. Unit tests for the win check and scoring.
8. Stretch: Defender mode endpoint that runs a candidate guard prompt against the test attack messages.

## Role 4: Frontend (Kirupashankar Chockkanathan)

1. Set up the frontend project and agree on the API contract with the backend (request and response shapes) in the first hour.
2. Level select screen.
3. Chat screen with the guard, attempts left, and a clear win or lose state.
4. Debrief screen shown after each level.
5. Leaderboard screen.
6. Responsible-use notice shown before the first level.
7. Basic polish: layout, readable on a laptop projector, loading state while the model replies.
8. Stretch: Defender mode UI, sound effects, Tamil/English toggle.

## Suggested timeline

| Time | Goal |
| ---- | ---- |
| Hour 0 to 1 | Everyone has cloned the repo and pushed a first commit. Ollama runs. API contract agreed. |
| Hours 1 to 3 | Working chat endpoint and Level 1 end to end. |
| Hours 3 to 5 | UI plus Levels 2 and 3 with win checking. |
| Hours 5 to 7 | Debriefs, scoring, leaderboard. |
| Hours 7 to 8 | Stretch features, playtest, bug fixes. |
| Last hour | README, demo video, submission. |

## Definition of done

- A new person can clone the repo, follow the README, and play Level 1.
- Win detection is covered by tests.
- No secrets are committed.
- README is accurate and the checklist is ticked.
