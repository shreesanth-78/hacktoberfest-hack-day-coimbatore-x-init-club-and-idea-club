import os
import sys

import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, REPO_ROOT)

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.config import Settings  # noqa: E402
from backend.app.main import create_app  # noqa: E402


class FakeGuard:
    """Stands in for ai.guard.guard_reply. Set .reply or .error before a call; .calls records each call."""

    def __init__(self):
        self.reply = "I cannot help with that."
        self.error = None
        self.calls = []

    def __call__(self, level, history, user_message):
        self.calls.append({"level_id": level["id"], "history": list(history), "message": user_message})
        if self.error is not None:
            raise self.error
        return self.reply


@pytest.fixture
def fake_guard():
    return FakeGuard()


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=str(tmp_path / "test.db"), cors_origins=["http://localhost:5173"])


@pytest.fixture
def client(settings, fake_guard):
    return TestClient(create_app(settings=settings, guard_fn=fake_guard))


@pytest.fixture
def start_session(client):
    def start(level_id=1, player_name="tester"):
        r = client.post("/api/sessions", json={"level_id": level_id, "player_name": player_name})
        assert r.status_code == 201, r.text
        return r.json()["session_id"]

    return start
