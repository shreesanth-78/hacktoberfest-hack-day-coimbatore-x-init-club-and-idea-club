"""Is the guard ready? Used by GET /api/health/ai.

Reads the same settings as ai/guard.py (GUARD_STUB, OLLAMA_HOST, OLLAMA_MODEL) and asks
Ollama which models are installed (GET /api/tags). It never calls the model itself.
"""
import json
import os
import urllib.error
import urllib.request

TIMEOUT_SECONDS = 3


class AINotReady(Exception):
    """The guard cannot answer right now. The message says why, in plain words."""


def _installed(model, names):
    # Ollama lists an untagged pull of "gemma4" as "gemma4:latest".
    return model in names or (":" not in model and f"{model}:latest" in names)


def check():
    """Return {"mode", "model", "host"} if the guard can answer, else raise AINotReady."""
    if os.environ.get("GUARD_STUB") == "1":
        return {"mode": "stub", "model": None, "host": None}

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "")
    if not model:
        raise AINotReady("OLLAMA_MODEL is not set")
    try:
        with urllib.request.urlopen(f"{host}/api/tags", timeout=TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError) as e:
        raise AINotReady(f"cannot reach Ollama at {host}") from e
    except ValueError as e:
        raise AINotReady(f"unexpected response from Ollama at {host}") from e

    names = {m.get("name", "") for m in data.get("models", []) if isinstance(m, dict)}
    if not _installed(model, names):
        raise AINotReady(f"model {model} is not pulled on {host} (run: ollama pull {model})")
    return {"mode": "ollama", "model": model, "host": host}
