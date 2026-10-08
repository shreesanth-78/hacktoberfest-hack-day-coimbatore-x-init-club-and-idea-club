# Frontend

React + Vite single-page game: landing page, world map of five kingdoms, a map per kingdom with six gates, and the encounter screen where the player talks to the guard. Owner: Kirupashankar. The connection to the backend (the adapter in `src/services/backend.js`) was added by Mudiam.

## Two modes

| Mode | When | What it talks to |
| ---- | ---- | ---------------- |
| **Real backend** | `VITE_USE_BACKEND=true` or `VITE_API_URL=...` | The FastAPI backend, which asks Gemma (through Ollama) to play the guard. Progress, lives, checkpoints and respawn are stored and decided by the server. |
| **Mock** | neither variable set | `src/services/mockServer.js`, an in-browser stand-in with simple pattern rules. For working on the look of the game with no backend. Progress is kept in `localStorage`. |

The landing page footer says which mode is running.

## Run the whole game (three terminals)

From the repository root. You need Python 3, Node.js 22 or newer (tested with 24), and [Ollama](https://ollama.com) with the model pulled (`ollama pull gemma4:e2b`).

```bash
# 1. Ollama must be running (the desktop app starts it, or: ollama serve)

# 2. Backend, from the repository root (see backend/README.md for the one-time setup)
OLLAMA_MODEL=gemma4:e2b uvicorn backend.app.main:create_app --factory --port 8000

# 3. Frontend
cd frontend
npm ci
cp .env.example .env.local        # contains VITE_USE_BACKEND=true
npm run dev                       # http://localhost:5173
```

On Windows PowerShell set variables with `$env:OLLAMA_MODEL="gemma4:e2b"` before the `uvicorn` command, and use `copy .env.example .env.local`.

Without a model, start the backend with `GUARD_STUB=1` instead of `OLLAMA_MODEL`: the guards then give canned replies, which is enough to check the screens.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Dev server on port 5173; proxies `/api` to the backend on port 8000 |
| `npm run build` | Production build into `dist/` |
| `npm test` | Tests for the backend adapter (Node's built-in test runner, no extra packages) |

## How it connects to the backend

`src/services/api.js` picks the mode. In real mode it uses `src/services/backend.js`, which:

- creates a campaign on first visit and keeps only the **campaign id** in `localStorage` (`prompt-heist-campaign-v1`); everything else is read from the server;
- maps the UI's kingdom ids and level numbers to the backend's level ids (`civic` level 3 is level 3; `bio` level 1 is level 7; `scrap` level 6 is level 30);
- starts the campaign session for the current gate, or a free-play session when the player replays a gate they already cleared (replays never change the campaign);
- turns the backend's responses into the shapes the pages already use, and turns AI errors (`ai_unavailable`, `ai_timeout`) into the in-game texts. A failed AI call never costs a life;
- after a win or a defeat, reloads the campaign from the server, so checkpoints and respawns follow the backend's rules.

The browser never sees a cipher, a guard prompt or the answer to a level. The page decides nothing: wins, strikes and the boss's learning come from the server.

## What is not built

- The leaderboard screen (the API exists: `GET /api/campaigns/leaderboard`).
- A player-name screen: every browser plays as "Cipher Phantom".
- The chat of an unfinished session is not restored after a page reload (the session is resumed, with the guard's opening line).
- The boss's "adaptation" panel shows which earlier tactics are blocked, but not a resistance percentage, because the backend does not measure one.
