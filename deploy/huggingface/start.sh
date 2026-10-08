#!/bin/sh
# Starts the model server and then the game, inside a Hugging Face Space (see docs/DEPLOY_HUGGINGFACE.md).
# The game (UI + API) listens on port 7860, which is the port a Docker Space exposes.
set -u

ollama serve > /tmp/ollama.log 2>&1 &

# wait until Ollama answers (up to 2 minutes)
i=0
while [ "$i" -lt 120 ]; do
  if curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then break; fi
  i=$((i + 1)); sleep 1
done

# load the model into memory now and keep it there, so the first visitor does not wait for the load
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"gemma4:e2b","prompt":"hi","stream":false,"keep_alive":-1,"options":{"num_predict":1}}' > /dev/null 2>&1 &

cd /home/user/app || exit 1
exec /opt/venv/bin/python -m uvicorn backend.app.main:create_app --factory --host 0.0.0.0 --port 7860
