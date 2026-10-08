"""Backend settings, read from environment variables (documented in .env.example).

The AI module (ai/guard.py) reads OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_TIMEOUT_SECONDS
and GUARD_STUB itself, so they are not repeated here.
"""
import os
from dataclasses import dataclass, field

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _origins_from_env():
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass
class Settings:
    database_path: str = field(default_factory=lambda: os.environ.get("DATABASE_PATH", "./prompt_heist.db"))
    cors_origins: list = field(default_factory=_origins_from_env)
    levels_dir: str = os.path.join(REPO_ROOT, "levels")
