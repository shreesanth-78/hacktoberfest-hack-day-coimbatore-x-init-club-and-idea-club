""".env loading and the guard readiness check (GET /api/health/ai)."""
import json
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from fastapi.testclient import TestClient

from backend.app import ai_status
from backend.app.config import load_env_file
from backend.app.main import create_app

# .env loading

def test_env_file_is_loaded_without_overriding(tmp_path, monkeypatch):
    for key in ("PH_A", "PH_B", "PH_C", "PH_D", "PH_SET"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("PH_SET", "from-shell")
    env = tmp_path / ".env"
    env.write_text(
        "# comment\n\nPH_A=1\nexport PH_B = two words \nPH_C=\"quoted # value\"\n"
        "PH_D='single'\nPH_SET=from-file\nnot a variable\n",
        encoding="utf-8",
    )
    loaded = load_env_file(str(env))
    assert set(loaded) == {"PH_A", "PH_B", "PH_C", "PH_D"}
    import os
    assert os.environ["PH_A"] == "1"
    assert os.environ["PH_B"] == "two words"
    assert os.environ["PH_C"] == "quoted # value"
    assert os.environ["PH_D"] == "single"
    assert os.environ["PH_SET"] == "from-shell"  # the shell wins


def test_missing_env_file_is_fine(tmp_path):
    assert load_env_file(str(tmp_path / "nope.env")) == []


def test_env_example_parses(tmp_path, monkeypatch):
    # The documented setup is "copy .env.example to .env", so the example must load cleanly.
    from backend.app.config import REPO_ROOT
    example = open(f"{REPO_ROOT}/.env.example", encoding="utf-8").read()
    keys = [l.split("=", 1)[0] for l in example.splitlines() if l and not l.startswith("#") and "=" in l]
    for key in keys:
        monkeypatch.delenv(key, raising=False)
    (tmp_path / ".env").write_text(example, encoding="utf-8")
    assert set(load_env_file(str(tmp_path / ".env"))) == set(keys)
    assert {"OLLAMA_HOST", "OLLAMA_MODEL", "DATABASE_PATH", "CORS_ORIGINS"} <= set(keys)


# Readiness check against a fake Ollama

@pytest.fixture
def fake_ollama():
    """A local HTTP server answering /api/tags. Set .body to control the response."""
    state = {"body": {"models": [{"name": "gemma4:e2b"}]}}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            raw = state["body"] if isinstance(state["body"], bytes) else json.dumps(state["body"]).encode()
            self.send_response(200 if self.path == "/api/tags" else 404)
            self.end_headers()
            self.wfile.write(raw)

        def log_message(self, *a):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    state["host"] = f"http://127.0.0.1:{srv.server_address[1]}"
    yield state
    srv.shutdown()


@pytest.fixture
def ollama_env(monkeypatch, fake_ollama):
    monkeypatch.delenv("GUARD_STUB", raising=False)
    monkeypatch.setenv("OLLAMA_HOST", fake_ollama["host"])
    monkeypatch.setenv("OLLAMA_MODEL", "gemma4:e2b")
    return fake_ollama


def test_stub_mode_is_ready(monkeypatch):
    monkeypatch.setenv("GUARD_STUB", "1")
    assert ai_status.check()["mode"] == "stub"


def test_ready_when_model_is_pulled(ollama_env):
    assert ai_status.check() == {"mode": "ollama", "model": "gemma4:e2b", "host": ollama_env["host"]}


def test_untagged_model_matches_latest(ollama_env, monkeypatch):
    ollama_env["body"] = {"models": [{"name": "gemma4:latest"}]}
    monkeypatch.setenv("OLLAMA_MODEL", "gemma4")
    assert ai_status.check()["model"] == "gemma4"


def test_not_ready_when_model_missing(ollama_env):
    ollama_env["body"] = {"models": [{"name": "llama3:8b"}]}
    with pytest.raises(ai_status.AINotReady, match="ollama pull gemma4:e2b"):
        ai_status.check()


def test_not_ready_when_model_not_set(ollama_env, monkeypatch):
    monkeypatch.setenv("OLLAMA_MODEL", "")
    with pytest.raises(ai_status.AINotReady, match="OLLAMA_MODEL is not set"):
        ai_status.check()


def test_not_ready_when_ollama_unreachable(monkeypatch):
    with socket.socket() as s:  # a port with nothing listening
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    monkeypatch.delenv("GUARD_STUB", raising=False)
    monkeypatch.setenv("OLLAMA_HOST", f"http://127.0.0.1:{port}")
    monkeypatch.setenv("OLLAMA_MODEL", "gemma4:e2b")
    with pytest.raises(ai_status.AINotReady, match="cannot reach Ollama"):
        ai_status.check()


def test_not_ready_on_garbage_response(ollama_env):
    ollama_env["body"] = b"<html>not json</html>"
    with pytest.raises(ai_status.AINotReady, match="unexpected response"):
        ai_status.check()


# Endpoint

def test_health_ai_endpoint_ok(settings, fake_guard):
    client = TestClient(create_app(settings=settings, guard_fn=fake_guard,
                                   ai_check=lambda: {"mode": "stub", "model": None, "host": None}))
    r = client.get("/api/health/ai")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "mode": "stub", "model": None, "host": None}


def test_health_ai_endpoint_not_ready(settings, fake_guard):
    def down():
        raise ai_status.AINotReady("cannot reach Ollama at http://10.0.0.5:11434")

    client = TestClient(create_app(settings=settings, guard_fn=fake_guard, ai_check=down))
    r = client.get("/api/health/ai")
    assert r.status_code == 503
    assert r.json() == {"error": {"code": "ai_not_ready", "message": "cannot reach Ollama at http://10.0.0.5:11434"}}


def test_health_ai_endpoint_with_real_check_and_fake_ollama(settings, fake_guard, ollama_env):
    client = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    assert client.get("/api/health/ai").json()["mode"] == "ollama"
