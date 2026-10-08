# Hugging Face Space for Prompt Heist: the game AND the Gemma model in one container, on free CPU hardware.
# Put this file and README.md (both from deploy/huggingface/) in a new Docker Space. Steps: docs/DEPLOY_HUGGINGFACE.md.
#
# Not built or run by the authors: Docker would not start on the development machine. The first build on
# Hugging Face is the first test. Replies are slower than on a GPU (CPU only).

# The official Ollama image provides the model server.
FROM ollama/ollama:latest

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv python3-pip git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face runs Docker Spaces as user 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    OLLAMA_MODELS=/home/user/.ollama/models \
    OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_KEEP_ALIVE=-1 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MODEL=gemma4:e2b \
    OLLAMA_TIMEOUT_SECONDS=240 \
    DATABASE_PATH=/tmp/prompt_heist.db \
    PYTHONUNBUFFERED=1
# the image's default entry point is the ollama command; we start our own script instead
ENTRYPOINT []

# Python packages for the backend (the same two pinned versions as backend/requirements.txt, runtime only)
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir "fastapi==0.142.4" "uvicorn==0.54.0"

USER user
WORKDIR /home/user

# The game's code comes from the public GitHub repository (main). Change REPO_REF to deploy another branch or tag.
# Bump CACHE_BUST (or use "Factory rebuild" on Hugging Face) to fetch newer code.
ARG REPO_URL=https://github.com/shreesanth-78/hacktoberfest-hack-day-coimbatore-x-init-club-and-idea-club.git
ARG REPO_REF=main
ARG CACHE_BUST=1
RUN git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" app && chmod +x app/deploy/huggingface/start.sh

# Download the model into the image, so a restart does not have to fetch 4.6 GB again.
RUN (ollama serve > /tmp/ollama-build.log 2>&1 &) \
    && i=0; while [ "$i" -lt 60 ] && ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null; do i=$((i+1)); sleep 1; done \
    && ollama pull gemma4:e2b \
    && pkill ollama || true

EXPOSE 7860
CMD ["/home/user/app/deploy/huggingface/start.sh"]
