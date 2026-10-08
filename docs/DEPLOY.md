# Deploying Prompt Heist (Render)

**Read this first.** The game has three parts: the web UI, the backend, and an AI model. The first two deploy to Render without trouble. **The model does not**: Gemma needs a GPU (or at least several GB of RAM and a lot of patience), and Render's plans have no GPU. So "deploying" means choosing where the model runs. Options are below. **A and E are the ones we have actually tested; E gives a public link in two commands.**

## Make it work with your laptop closed (about 10 minutes, two free accounts)

A laptop that is shut cannot run the model, the game or a tunnel. To keep the game up without it, the game runs on Render and the model runs on Ollama's cloud. `render.yaml` already points at it (`OLLAMA_HOST=https://ollama.com`, `OLLAMA_MODEL=gemma4:31b`), so the only secret you type is your own API key. These steps need you to sign in; they cannot be done for you.

1. **Ollama key.** Sign up or log in at https://ollama.com, then create an API key at https://ollama.com/settings/keys. Copy it. Treat it like a password.
2. **Render account.** Sign up at https://render.com and connect your GitHub account. The repository belongs to `shreesanth-78`, so either Shree does steps 2 to 4 himself, or he gives Render access to the repository, or you fork it and deploy the fork (a fork needs the same files, which it gets automatically).
3. **Blueprint.** In Render: **New, then Blueprint**, choose the repository and the `main` branch. Render reads `render.yaml`.
4. **Paste the key.** When Render asks for `OLLAMA_API_KEY`, paste the key from step 1. Leave everything else as it is. Click **Apply**. The first build takes a few minutes.
5. **Check it.** Open `https://<your-service>.onrender.com/api/health/ai`. It should say `"mode":"ollama"` and `"model":"gemma4:31b"`. If it says the model is not available, open https://ollama.com/api/tags and use the exact `gemma4` name listed there as `OLLAMA_MODEL` in Render (Environment tab).
6. **Check the levels (important).** Every level was tuned on the small local model. The hosted model is much bigger, so a level may become easier or harder. On a computer with the repository, run the check against the hosted model:
   ```bash
   OLLAMA_HOST=https://ollama.com OLLAMA_API_KEY=<your key> OLLAMA_MODEL=gemma4:31b python tools/level_trials.py all 8
   ```
   (On PowerShell set the three variables with `$env:NAME="value"` first.) The last lines say which levels are too easy or too hard. A few borderline lines are normal, because the model varies. Many flags mean the prompts need retuning for this model, and the hosted game will feel different from the local one. Be honest about that on the Devpost page.
7. **Warm it up.** Render's free plan sleeps after about 15 minutes without visitors, and the first request afterwards takes about a minute. Open the link a few minutes before anyone looks at it, and play one message.

What this does and does not give you:
- **Works with the laptop closed:** yes. Nothing runs on your laptop.
- **Scores:** the free plan has no persistent disk, so the leaderboard is wiped on every deploy or restart.
- **Not verified by us:** the Render build, the hosted model's behaviour, Ollama's free-plan limits (check https://ollama.com for the current limits; a busy demo could hit them) and whether the hosted `think: false` option is accepted. The local setup and the tunnel were verified; this route was not, because it needs the two accounts above.
- **Plan B if the hosted model plays badly:** run the game locally for the demo (`scripts/start_demo.ps1`) and keep the hosted link only as a bonus.

| Option | Where the model runs | Tested? | Use it for |
| ------ | -------------------- | ------- | ---------- |
| **A. Run it locally** | Your GPU laptop (`scripts/start_demo.ps1`) | **Yes**, the whole campaign and the browser play-through | The hackathon demo and the demo video. Most reliable. |
| **B. Render + your laptop as the model server** | Your laptop, reached through a public tunnel | No (steps below) | A public link while your laptop is on |
| **C. Render + a hosted Ollama** | Ollama's cloud (needs an Ollama account and key) | No | A link that works when your laptop is off |
| **D. Render with canned replies** | No model (`GUARD_STUB=1`) | The stub mode and the serving layout, yes; Render itself, no | Showing the screens only. Not the real AI. |
| **E. Temporary public link (tunnel, no account)** | Your GPU laptop, the whole game served from it | **Yes** (2026-10-08): the page, the API and a real guard reply worked from the internet | A public link for the demo or the judges while your laptop is on. **The fastest way to a working public link.** |

Be honest on the Devpost page about which option the public link uses.

## Option E: a temporary public link with no account (tested)
This needs no Render account and no sign-up. It uses Cloudflare's free quick tunnel to publish the game that is already running on your laptop:

```powershell
winget install --id Cloudflare.cloudflared -e      # once
# 1. start the game: powershell -ExecutionPolicy Bypass -File scripts/start_demo.ps1   (serves http://localhost:8000)
# 2. in a second terminal:
cloudflared tunnel --url http://localhost:8000
```

It prints an address like `https://<random-words>.trycloudflare.com`. Open it from any device. What was verified on 2026-10-08: the page, `/api/health`, `/api/health/ai`, the 30 levels, and a win against the real Gemma model, all over the internet.

Things to know:
- **It is only up while your laptop, the game and the tunnel are running.** Press Ctrl+C in the tunnel window to stop it. The address changes every time you restart the tunnel, so it is not suitable for the README.
- **Anyone who has the address can use your GPU and play.** Do not post it publicly; share it only for the demo or with the judges, and stop the tunnel afterwards.
- The first reply after the model has been idle takes about 15 seconds (it has to load again). Send one message yourself before showing it to someone.
- Cloudflare describes quick tunnels as for testing and development, with no uptime guarantee.

## What gets deployed
One Render **web service on the native Python runtime** (no Docker). `render.yaml` installs `backend/requirements.txt` and starts the FastAPI backend, which serves both the API and the already-built frontend (`frontend/dist`, committed to the repository, so Render does not need Node.js). Same address for the page and the API, so there is no CORS to set up. The model is **not** part of the service.

Verified here: the same layout (only `backend/`, `ai/`, `levels/` and `frontend/dist`, with only `fastapi` and `uvicorn` installed) serves the app, its client-side routes and the API, and plays a turn. Not verified: the Render build itself (needs your account). A `Dockerfile` is also included as an alternative, but Docker would not start on the test machine, so **the Docker image was never built or tested**.

## Deploy steps (Render Blueprint)
These steps need a Render account and access to the GitHub repository, which only you can grant.
1. The repository owner (Shree Santh, `shreesanth-78`) or you, from a fork, signs in at https://dashboard.render.com and connects GitHub (Account Settings, GitHub). Render must be allowed to read this repository.
2. **New, then Blueprint**, pick the repository and the branch to deploy (`main` after the pull request is merged).
3. Render reads `render.yaml`. Fill the three prompts: `OLLAMA_HOST`, `OLLAMA_API_KEY` (only if the Ollama needs one), `OLLAMA_MODEL`. For option D, add `GUARD_STUB` = `1` instead and leave the others empty.
4. **Apply.** The first build takes several minutes (it builds the frontend and installs the backend).
5. When it is live, check `https://<your-service>.onrender.com/api/health` (should say `ok`) and `/api/health/ai` (should say `ollama` and the model, or explain what is missing). Then open the root address and play a level.

Never put keys in the repository: they go in the Render dashboard (Environment).

## Option B: your laptop as the model server
Render needs to reach your Ollama over the internet. A free Cloudflare tunnel can do it (install `cloudflared` first):
```powershell
# Terminal 1: Ollama must be running (the desktop app starts it)
# Terminal 2:
cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434
```
It prints an `https://<random>.trycloudflare.com` address. Set `OLLAMA_HOST` to that address and `OLLAMA_MODEL=gemma4:e2b` in Render. The address changes every time you restart the tunnel, and the laptop must stay on and awake. Anyone with the address can use your GPU, so do not share it, and shut the tunnel down after the demo.

## Option C: a hosted Ollama
Set `OLLAMA_HOST=https://ollama.com`, create a key at https://ollama.com/settings/keys, put it in `OLLAMA_API_KEY`, and set `OLLAMA_MODEL` to a cloud Gemma model (for example `gemma4:cloud`; check the exact name and your plan's limits on Ollama's site). **Caution:** every level was tuned on `gemma4:e2b`. A bigger hosted model behaves differently, so some levels may become much harder or easier. Before relying on it, run `OLLAMA_HOST=... OLLAMA_API_KEY=... OLLAMA_MODEL=... python tools/level_trials.py all 8` and look at `levels/trial_results.txt` for the format of the results. We have not tested this option.

## Things to know about Render's free plan
- **It sleeps** after about 15 minutes without visitors, and the first request afterwards takes about a minute. Open the link a few minutes before the demo.
- **Scores reset:** the free plan has no persistent disk, so the SQLite database (`/tmp`) is wiped on every deploy and restart. For a persistent leaderboard you need a paid plan with a disk (set `DATABASE_PATH` to a path on it).
- Limits and prices change; check Render's current plans.

## Docker (optional, untested)
`docker build -t prompt-heist .` then `docker run --rm -p 8000:8000 -e GUARD_STUB=1 prompt-heist`. The `Dockerfile` follows the same steps as the native service, but it has not been built.

## If the frontend changes
`frontend/dist` is committed, so rebuild it before deploying: `cd frontend && VITE_USE_BACKEND=true npm run build`, then commit `frontend/dist`.

## Local alternative (no Docker, no Render)
`scripts/start_demo.ps1` builds the frontend and serves the whole game at http://localhost:8000 with the real model.
