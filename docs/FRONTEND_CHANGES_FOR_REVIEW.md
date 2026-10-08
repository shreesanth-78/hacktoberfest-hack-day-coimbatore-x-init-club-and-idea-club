# Changes to the frontend, for Kirupashankar to review

Mudiam connected the frontend to the real backend (which calls Gemma). Your original UI is intact: the mock still works, and the look of every screen is unchanged. This page lists exactly what was touched and why, so you can review it quickly. Review it, run both modes, and tell Mudiam if anything should change.

## What was added
| File | What it is |
| ---- | ---------- |
| `src/services/backend.js` | The adapter. Talks to the real API and returns the same shapes your pages already use. No React in it. |
| `src/services/backend.test.js` | 18 tests for the adapter (`npm test`, Node's built-in runner, no new packages). |
| `src/pages/LeaderboardPage.jsx` | New screen: top campaigns by score (`/leaderboard`). |
| `.env.example`, `README.md` (in `frontend/`) | How to run both modes. |

## What was changed in your files
| File | Change | Why |
| ---- | ------ | --- |
| `src/services/api.js` | Chooses the real backend (`VITE_USE_BACKEND=true` or `VITE_API_URL`) or your mock (neither set). The old proposed endpoints (`/api/kingdoms`, `?kingdom_id=`) are gone: the real backend has different ones. | The real API is `/api/levels`, campaigns and sessions. |
| `src/hooks/useGameState.jsx` | In real mode, progress is loaded from the server (`GET /api/campaigns/{id}`) instead of `localStorage`, and reloaded after a win or a defeat. Adds `ready`, `error`, `hasGame`, `playerName`, `startGame`, `refresh`. Mock mode behaves exactly as before. | The server decides checkpoints and respawns. |
| `src/App.jsx` | A `BackendGate` shows "Contacting the kingdom..." until progress has loaded, an error screen with a retry if the backend is down, and sends a player with no game back to the title screen. New `/leaderboard` route. | Without it a gate looks sealed for a moment, or the player is bounced to the map. |
| `src/pages/LandingPage.jsx` | A name form (1 to 30 characters) replaces the single "Begin" link when no game exists. "Welcome back", "Leaderboard" and "New game" when one does. | The backend needs a player name. |
| `src/pages/GameplayPage.jsx` | (1) The access check for a gate now runs **once on arrival** (`entry` ref). (2) On `lost` it calls `game.resetToCheckpoint` (a reload in real mode). (3) The nameplate and dialogue show the guard's name from the backend (`enc.session.character`). (4) The adaptation panel hides the resistance percentage when there is none. | (1) was a real bug found in the browser: after a defeat the server respawned the player, progress changed, and the access check threw the player out before the Defeat screen. |
| `src/pages/WorldMapPage.jsx`, `src/components/WorldMap.jsx` | The dev shortcuts only show in mock mode. A Leaderboard button. | Unlock-all would make no sense with a server-side campaign. |
| `src/components/GuardianDialogue.jsx` | `maxLength` 800 to 500. | The backend rejects messages over 500 characters. |
| `src/styles/game.css` | Styles for the name form and the leaderboard table, appended at the end. | |
| `package.json` | A `test` script. | |

Nothing else in `src/components`, `src/data` or the SVG art was touched.

## How the two modes differ for the player
- **Real backend:** the guard is Gemma. Wins, strikes, hints and the boss's learning come from the server. Progress survives a reload (the browser only remembers a campaign id).
- **Mock:** unchanged: pattern rules in the browser, progress in `localStorage`.

## Things to check (about 10 minutes)
1. `cd frontend && npm ci && npm test && npm run build` (and `npm run dev` for the mock).
2. Real mode: start Ollama and the backend (see `frontend/README.md`), set `VITE_USE_BACKEND=true`, and play a gate.
3. Look at the screens in a phone-sized window; only an 800x600 window was checked.
4. The boss panel: the backend does not measure a "resistance" percentage, so none is shown. If you want one, ask Aditya for a number first.

## Known limits
- The chat of an unfinished session is not restored after a reload (the guard's opening line is shown again; lives are correct).
- Every browser keeps one campaign; "New game" starts another. The old one stays on the leaderboard.
