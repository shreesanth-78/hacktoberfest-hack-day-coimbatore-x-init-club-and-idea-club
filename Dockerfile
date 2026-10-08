# One image for the whole game: the React frontend is built, then served by the FastAPI backend,
# so a single web service hosts the UI and the API on the same origin (no CORS).
#
#   docker build -t prompt-heist .
#   docker run -p 8000:8000 -e GUARD_STUB=1 prompt-heist        # canned guard replies, no model
#   docker run -p 8000:8000 -e OLLAMA_HOST=... -e OLLAMA_MODEL=... prompt-heist
#
# The model is NOT in the image. It needs an Ollama server (see docs/DEPLOY.md).

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV VITE_USE_BACKEND=true
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 DATABASE_PATH=/tmp/prompt_heist.db
COPY backend/requirements.txt backend/requirements.txt
# pytest and the test client are only needed for the tests; keep the image small
RUN grep -viE '^(pytest|httpx2)' backend/requirements.txt > /tmp/runtime-requirements.txt \
    && pip install --no-cache-dir -r /tmp/runtime-requirements.txt
COPY backend backend
COPY ai ai
COPY levels levels
COPY --from=web /web/dist frontend/dist
EXPOSE 8000
# Render (and most hosts) provide the port in $PORT
CMD ["sh", "-c", "uvicorn backend.app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
