"""Backend settings, read from environment variables (documented in .env.example).

The AI module (ai/guard.py) reads OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_TIMEOUT_SECONDS
and GUARD_STUB itself, so they are not repeated here. load_env_file() puts the values
from the repository's .env file into the environment so both see them.
"""
import os
from dataclasses import dataclass, field

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_FILE = os.path.join(REPO_ROOT, ".env")


def load_env_file(path=ENV_FILE):
    """Load KEY=VALUE lines from a .env file into os.environ. Returns the keys it set.

    Variables already set in the environment win, so `GUARD_STUB=1 uvicorn ...` still works.
    Blank lines and # comments are skipped; `export ` and surrounding quotes are allowed.
    A missing file is not an error.
    """
    if not os.path.isfile(path):
        return []
    loaded = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip().removeprefix("export ").strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
                value = value[1:-1]
            if key and key not in os.environ:
                os.environ[key] = value
                loaded.append(key)
    return loaded


def _origins_from_env():
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass
class Settings:
    database_path: str = field(default_factory=lambda: os.environ.get("DATABASE_PATH", "./prompt_heist.db"))
    cors_origins: list = field(default_factory=_origins_from_env)
    levels_dir: str = os.path.join(REPO_ROOT, "levels")
