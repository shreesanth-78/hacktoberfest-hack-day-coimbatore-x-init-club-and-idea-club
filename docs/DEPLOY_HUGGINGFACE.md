# Deploy on Hugging Face Spaces (the real Gemma model, no laptop needed)

This puts the whole game on a free Hugging Face **Docker Space**: the UI, the backend **and the Gemma model** (`gemma4:e2b`, the one all 30 levels were tuned on) run inside one container. Nothing depends on your laptop. It needs a free Hugging Face account and **no credit card**.

**Be honest with yourself about the limits before you start**
- **It has never been built.** Docker would not start on the development machine, so the files in `deploy/huggingface/` are untested. The first build on Hugging Face is the first test. Expect to read a build log and maybe fix one thing. If something breaks, send me the last 30 lines of the build log.
- **It runs on CPU** (free Spaces have no GPU). Each guard reply will probably take about **10 to 30 seconds** instead of 3. That is measured on nothing: it is an estimate. The game works the same, just slower, and the loading dots show while the guard thinks.
- **Free Spaces sleep** after a period without visitors (Hugging Face sets the period) and take a few minutes to wake. Open the link a few minutes before anyone looks.
- **Scores reset** on every restart (the database is in `/tmp`).
- The first build downloads the 4.6 GB model into the image, so it takes **about 10 to 20 minutes**.

## Steps (about 15 minutes of your time)
1. **Account.** Sign up at https://huggingface.co (free, email only).
2. **New Space.** Go to https://huggingface.co/new-space. Fill in:
   - Space name: `prompt-heist`
   - License: MIT
   - SDK: **Docker**, template **Blank**
   - Hardware: **CPU basic (free)**
   - Visibility: **Public**
   Click **Create Space**.
3. **Add the two files.** In the new Space, open **Files**, then **Add file**, then **Upload files**. Upload these two files from this repository's `deploy/huggingface/` folder:
   - `Dockerfile`
   - `README.md` (this is the Space's own README with the settings at the top; it replaces the default one)

   Do **not** upload `start.sh`: the Dockerfile fetches it from GitHub. Click **Commit changes to main**.
4. **Wait for the build.** Open the **App** tab; it shows the build log. When it says **Running**, open the Space.
5. **Check it.** Open `https://<your-name>-prompt-heist.hf.space/api/health/ai`. It should say `"mode":"ollama"` and `"model":"gemma4:e2b"`. Then play a level and be patient with the first reply (the model is loading into memory).
6. **Your permanent address** is `https://<your-name>-prompt-heist.hf.space`. Put it in the README and the DEV post.

## Updating it later
The Dockerfile copies the game from the public GitHub repository (`main`) when it builds. After `main` changes, open the Space, **Settings**, then **Factory rebuild**, to pick up the new code.

## If something goes wrong
| Symptom | Likely cause and fix |
| ------- | -------------------- |
| Build fails at `ollama pull` | Network or disk problem on the build machine. Click **Factory rebuild**. |
| Build fails at `pip install` or `python3` | The base image has an older Python than the backend needs. Send me the log. |
| The Space runs but `/api/health/ai` says it cannot reach Ollama | The model server did not start. Open the **Logs** tab and read `/tmp/ollama.log` output; send me the lines. |
| Replies time out | CPU is too slow for the 240-second timeout, or the model was still loading. Wait a minute and retry. |
| Page shows "Preparing Space" for a long time | The first build is long. Check the build log. |

## Other options
See `docs/DEPLOY.md` for the other ways (local demo, temporary public link, Render with a hosted model, the GitHub Pages preview).
