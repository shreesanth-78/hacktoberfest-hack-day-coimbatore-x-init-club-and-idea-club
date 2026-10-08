# Frontend spec: the 30-level campaign (for Kirupashankar)

Status: **proposal from the AI owner (Mudiam). Kirupashankar reviews and changes anything that does not fit.** The API it relies on is described in `docs/BACKEND_CAMPAIGN_SPEC.md` (Aditya builds it) and the single-level endpoints in the main `README.md`.

## 1. The game, in one page

- **30 levels = 5 kingdoms x 6 levels.** Level id = `(kingdom - 1) * 6 + position`.
- You play the Cipher Phantom. Each level is a **gate** guarded by an AI sentinel that interrogates you about its own domain. You win by getting the sentinel to say the gate cipher (by answering well, or by prompt injection). The frontend never decides who wins: the backend does.
- **3 lives per level.** A failed message costs a life. At 0 lives the neural link is terminated and you respawn.
- **Level 3 of every kingdom is a checkpoint.** Level 6 is the kingdom boss.
- Difficulty rises inside each kingdom (very basic first, boss last), and the boss learns from how you beat the earlier levels.
- Each kingdom has a different domain: Civic Grids (water leaks), Bio-Archives (clinical trials), Trade Ports (customs), Risk Ledgers (insurance and grants), Scrap Wastes (e-waste).

## 2. Screens to build

| # | Screen | What it shows | Data from |
| - | ------ | ------------- | --------- |
| 1 | **Boot / responsible use** | The notice: educational AI-safety simulator, everything fictional. Must be acknowledged once. | static text |
| 2 | **Start** | Player name (1 to 30 characters) and "Jack in". Creates or resumes a campaign. | `POST /api/campaigns`, `GET /api/campaigns/{id}` |
| 3 | **Map** | 5 kingdoms, 6 nodes each. Node states: cleared, current, locked. Checkpoint marker on node 3, boss marker on node 6. Total score. | `GET /api/campaigns/{id}`, `GET /api/levels` |
| 4 | **Briefing** (optional) | Handler VOX text on the first level and each new kingdom. | static text + level `setting`, `intro` |
| 5 | **Gate encounter** (the main screen) | Guard name, setting, the guard's scripted `opening` line, chat log, strike tracker (3 segments), 500-character input with a counter, send button, loading state. | `POST /api/campaigns/{id}/sessions`, `POST /api/sessions/{id}/messages` |
| 6 | **Hint banner** | The handler cuts in when the response has a `hint`. | message response `hint` |
| 7 | **Victory / debrief** | Cipher breached, score and bonuses, then the debrief: technique, vulnerability, defence. "Checkpoint secured" banner when `checkpoint_reached`. | message response |
| 8 | **Lethal defense** | Red strobe and glitch text on `status: lost`, then the respawn message and where you restart (`next_level_id`). | message response `campaign` |
| 9 | **Kingdom cleared / campaign completed** | Shown when `kingdom_cleared` or `campaign_completed`. | message response `campaign` |
| 10 | **Leaderboard** | Top campaigns by total score. | `GET /api/campaigns/leaderboard` |

UI text from the design:
- Loading: `[NEURAL CORE PROCESSING INFERENCE...]`
- 502: `[CONNECTION LOST: NEURAL ENGINE UNRESPONSIVE. ATTEMPT PRESERVED]`
- 504: `[SIGNAL TIMEOUT: GATEKEEPER PROCESSING DELAYED. RETRYING...]` (the attempt is also preserved)
- Strike tracker: `THREAT DETECTED: [ █ █ ░ ] (2/3 FAILS)`
- Checkpoint: `CHECKPOINT SECURED`
- Lethal: `AUTOMATED DEFENSE SYSTEM ENGAGED: Intrusion threshold breached. Neural link terminated.`

## 3. API calls, in order

Base URL comes from configuration (for example `VITE_API_BASE_URL`), never hard-coded. Run the backend from the repo root: `GUARD_STUB=1 uvicorn backend.app.main:create_app --factory --port 8000` (no model needed), or with `OLLAMA_MODEL=gemma4:e2b` for the real guard.

1. **Load the map.** `GET /api/levels` returns 30 levels in numeric order, each with `id`, `title`, `kingdom`, `kingdom_name`, `position`, `checkpoint`, `boss`, `difficulty`, `character`, `setting`, `intro`, `opening`, `max_attempts`. Group by `kingdom`.
2. **Start or resume.** First visit: `POST /api/campaigns` with `{ "player_name": "..." }`. Store `campaign_id` in `localStorage`. On later visits call `GET /api/campaigns/{campaign_id}`; if it returns 404, clear the stored id and start again.
3. **Enter the current gate.** `POST /api/campaigns/{campaign_id}/sessions` (no body) starts or resumes the session for `current_level_id`. Keep the returned `session_id`. Show the level's `opening` as the guard's first line (it is not sent by the model).
4. **Send a message.** `POST /api/sessions/{session_id}/messages` with `{ "message": "..." }` (1 to 500 characters, trimmed). Show the loading state while waiting; local inference takes about 3 seconds.
5. **Handle the response.**

```json
{
  "reply": "the guard's answer",
  "attempts_remaining": 2,
  "status": "in_progress",
  "score": null,
  "debrief": null,
  "hint": null,
  "campaign": null
}
```

- `status: "in_progress"`: append the reply, update the strike tracker (`3 - attempts_remaining` strikes used). If `hint` is a string, show the handler hint banner.
- `status: "won"`: show the victory screen, the `score`, then `debrief`. Use `campaign` (bonuses, `checkpoint_reached`, `kingdom_cleared`, `campaign_completed`, `total_score`, `next_level_id`).
- `status: "lost"`: play the lethal sequence, show `debrief`, then respawn at `campaign.next_level_id`.

After a win or loss, call `GET /api/campaigns/{campaign_id}` again to refresh the map.

6. **Leaderboard.** `GET /api/campaigns/leaderboard`.

### Errors (all have the shape `{ "error": { "code", "message" } }`)

| Status | `code` | What to do |
| ------ | ------ | ---------- |
| 400 | `invalid_request` | Show the `message`; do not clear the input. |
| 404 | `not_found` | Unknown campaign or session: start again. |
| 409 | `level_finished` | The session is already over: reload the campaign state. |
| 409 | `level_locked` | Reload the campaign state and go to `current_level_id`. |
| 502 | `ai_unavailable` | Show the 502 text; the strike is **not** used; let the player resend. |
| 504 | `ai_timeout` | Show the 504 text; the strike is **not** used; let the player resend. |

## 4. Rules the frontend must follow

1. **Never decide a win or loss in the browser.** Use `status` from the response only.
2. **Never store or display anything secret.** The API never sends the cipher, the guard prompt or the hint in the level list. Do not try to find the secret in the page.
3. **Do not trust your own strike count.** Always draw it from `attempts_remaining`.
4. **Persist only the campaign id** (and maybe the player name). The server is the source of truth for progress.
5. **A failed AI call costs nothing**: keep the player's text in the input so they can resend.
6. **Disable the input** while a request is in flight and when the level is over.
7. Keep text readable on a projector (the demo is likely on a big screen).

## 5. Developing before Aditya's campaign endpoints exist

The single-level endpoints already work today (`GET /api/levels`, `POST /api/sessions`, `POST /api/sessions/{id}/messages`, `GET /api/leaderboard`). Use them to build the gate encounter, the strike tracker, the debrief and the error handling. For the campaign endpoints (map state, respawn, bonuses), mock them behind a flag (for example `VITE_USE_MOCK_CAMPAIGN=true`) using the JSON shapes in `docs/BACKEND_CAMPAIGN_SPEC.md`, section 4 and 5. Remove the mock when the real endpoints land and test again against the real backend.

Example state for the mock:

```json
{ "campaign_id": "demo", "player_name": "Phantom", "status": "in_progress",
  "current_level_id": 4, "current_kingdom": 1, "checkpoint_level_id": 3,
  "cleared_level_ids": [1, 2, 3], "total_score": 2250 }
```

## 6. Acceptance checklist

- [ ] A new player can start a campaign and sees the map with level 1 current and the rest locked.
- [ ] The gate screen shows the guard's `opening`, a 3-segment strike tracker, and a loading state.
- [ ] A wrong message costs a strike; the second strike shows the hint.
- [ ] Three strikes show the lethal screen and respawn at `next_level_id`.
- [ ] A win shows the score and the full debrief (technique, vulnerability, defence).
- [ ] Clearing level 3 shows the checkpoint banner; clearing level 6 shows the kingdom-cleared screen.
- [ ] 502 and 504 show the right text and the player can resend.
- [ ] Reloading the page resumes the campaign.
- [ ] No cipher, prompt or hint appears in the page before the API sends it.
- [ ] Works against the real backend with `GUARD_STUB=1` and with the real model.
