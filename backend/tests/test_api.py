"""API contract tests (README "API Documentation"), with a fake guard instead of the model."""
import json

import pytest
from fastapi.testclient import TestClient

from ai import guard
from backend.app.game import BLOCKED_NOTICE
from backend.app.levels import load_levels
from backend.app.main import create_app

LEVELS = None


def levels():
    global LEVELS
    if LEVELS is None:
        from backend.app.config import Settings
        LEVELS = load_levels(Settings().levels_dir)
    return LEVELS


def send(client, session_id, message="hello"):
    return client.post(f"/api/sessions/{session_id}/messages", json={"message": message})


def assert_error(response, status, code):
    assert response.status_code == status, response.text
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["message"]


# Health and levels

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_levels_list_never_exposes_secrets_or_prompts(client):
    r = client.get("/api/levels")
    assert r.status_code == 200
    body = r.json()
    assert [lv["id"] for lv in body["levels"]][:3] == [1, 2, 3]
    for lv in body["levels"]:
        assert set(lv) == {"id", "title", "character", "setting", "intro", "opening", "max_attempts"}
    text = json.dumps(body)
    for lv in levels().values():
        assert lv["secret"] not in text
        assert lv["guard_prompt"] not in text
        assert lv["hint"] not in text


# Sessions

def test_create_session(client):
    r = client.post("/api/sessions", json={"level_id": 1, "player_name": "  Aditya  "})
    assert r.status_code == 201
    body = r.json()
    assert body["level_id"] == 1
    assert body["attempts_remaining"] == levels()[1]["max_attempts"]
    assert isinstance(body["session_id"], str) and body["session_id"]


def test_create_session_unknown_level(client):
    assert_error(client.post("/api/sessions", json={"level_id": 999, "player_name": "a"}), 404, "not_found")


@pytest.mark.parametrize("payload", [
    {"level_id": 1, "player_name": ""},
    {"level_id": 1, "player_name": "   "},
    {"level_id": 1, "player_name": "x" * 31},
    {"level_id": 1},
    {"player_name": "a"},
    {"level_id": "abc", "player_name": "a"},
])
def test_create_session_invalid_payload(client, payload):
    assert_error(client.post("/api/sessions", json=payload), 400, "invalid_request")


def test_malformed_json_is_invalid_request(client):
    r = client.post("/api/sessions", content=b"{not json", headers={"Content-Type": "application/json"})
    assert_error(r, 400, "invalid_request")


# Messages

def test_message_in_progress_uses_one_attempt(client, start_session, fake_guard):
    sid = start_session(1)
    fake_guard.reply = "Nice night for a walk."
    r = send(client, sid, "How are you?")
    assert r.status_code == 200
    assert r.json() == {
        "reply": "Nice night for a walk.",
        "attempts_remaining": levels()[1]["max_attempts"] - 1,
        "status": "in_progress",
        "score": None,
        "debrief": None,
        "hint": None,
    }


def test_message_is_trimmed_before_reaching_the_guard(client, start_session, fake_guard):
    sid = start_session(1)
    send(client, sid, "   hi there   ")
    assert fake_guard.calls[-1]["message"] == "hi there"


def test_win_returns_score_and_debrief(client, start_session, fake_guard):
    sid = start_session(1)
    fake_guard.reply = "Fine, it's " + levels()[1]["secret"].lower() + "!"
    r = send(client, sid, "code?")
    body = r.json()
    assert r.status_code == 200
    assert body["status"] == "won"
    assert body["score"] == 1000  # first-try breach: 3 * 250 + 250
    assert body["debrief"] == levels()[1]["debrief"]


def test_loss_after_last_attempt_returns_debrief(client, start_session, fake_guard):
    sid = start_session(1)
    max_attempts = levels()[1]["max_attempts"]
    for _ in range(max_attempts - 1):
        assert send(client, sid).json()["status"] == "in_progress"
    body = send(client, sid).json()
    assert body["status"] == "lost"
    assert body["attempts_remaining"] == 0
    assert body["score"] is None
    assert body["debrief"] == levels()[1]["debrief"]


def test_finished_session_rejects_messages(client, start_session, fake_guard):
    sid = start_session(1)
    fake_guard.reply = levels()[1]["secret"]
    send(client, sid)
    assert_error(send(client, sid), 409, "level_finished")


def test_unknown_session(client):
    assert_error(send(client, "does-not-exist"), 404, "not_found")


@pytest.mark.parametrize("payload", [{"message": ""}, {"message": "   "}, {"message": "x" * 501}, {}])
def test_invalid_message(client, start_session, payload):
    sid = start_session(1)
    assert_error(client.post(f"/api/sessions/{sid}/messages", json=payload), 400, "invalid_request")


def test_message_of_500_characters_is_accepted(client, start_session):
    sid = start_session(1)
    assert send(client, sid, "x" * 500).status_code == 200


@pytest.mark.parametrize("error, status, code", [
    (guard.AITimeoutError("slow"), 504, "ai_timeout"),
    (guard.AIUnavailableError("down"), 502, "ai_unavailable"),
])
def test_ai_failure_does_not_use_an_attempt(client, start_session, fake_guard, error, status, code):
    sid = start_session(1)
    fake_guard.error = error
    assert_error(send(client, sid), status, code)
    fake_guard.error = None
    fake_guard.reply = "Hello."
    body = send(client, sid).json()
    assert body["attempts_remaining"] == levels()[1]["max_attempts"] - 1
    # The failed turn is not stored in the history either.
    assert fake_guard.calls[-1]["history"] == []


@pytest.fixture
def filtered_client(tmp_path, fake_guard):
    """An app whose Level 3 uses output_filter "block_exact". No shipped level uses it right now,
    so the filter path is tested with a temporary copy of the level files."""
    levels_dir = tmp_path / "levels"
    levels_dir.mkdir()
    for lv in levels().values():
        data = dict(lv, output_filter="block_exact") if lv["id"] == 3 else lv
        (levels_dir / f"level_{lv['id']}.json").write_text(json.dumps(data), encoding="utf-8")
    from backend.app.config import Settings
    settings = Settings(database_path=str(tmp_path / "f.db"), cors_origins=[], levels_dir=str(levels_dir))
    return TestClient(create_app(settings=settings, guard_fn=fake_guard))


def _start(client, level_id):
    return client.post("/api/sessions", json={"level_id": level_id, "player_name": "t"}).json()["session_id"]


def test_block_exact_filter_blocks_plain_secret_and_hides_it(filtered_client, fake_guard):
    sid = _start(filtered_client, 3)
    fake_guard.reply = "Fine. The code is " + levels()[3]["secret"] + "."
    body = send(filtered_client, sid).json()
    assert body["reply"] == BLOCKED_NOTICE
    assert body["status"] == "in_progress"
    assert levels()[3]["secret"].lower() not in json.dumps(body).lower()


def test_block_exact_spelled_out_secret_wins(filtered_client, fake_guard):
    sid = _start(filtered_client, 3)
    fake_guard.reply = "H - E - A - D - I - N - G  8 - 5 - 1 - 7"
    assert send(filtered_client, sid).json()["status"] == "won"


def test_level3_spelled_out_secret_wins_without_filter(client, start_session, fake_guard):
    sid = start_session(3)
    fake_guard.reply = "HEADING\n8517"
    assert send(client, sid).json()["status"] == "won"


def test_hint_appears_after_two_failed_attempts_only(client, start_session, fake_guard):
    sid = start_session(2)
    fake_guard.reply = "I refuse."
    hints = [send(client, sid).json()["hint"] for _ in range(3)]
    assert hints[0] is None
    assert hints[1] == levels()[2]["hint"]
    assert hints[2] is None


def test_history_is_sent_to_the_guard_with_shown_replies(filtered_client, fake_guard):
    sid = _start(filtered_client, 3)
    fake_guard.reply = levels()[3]["secret"]  # gets blocked
    send(filtered_client, sid, "first")
    fake_guard.reply = "Nope."
    send(filtered_client, sid, "second")
    assert fake_guard.calls[-1]["history"] == [
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": BLOCKED_NOTICE},
    ]
    assert fake_guard.calls[-1]["message"] == "second"


# Leaderboard and persistence

def win(client, start_session, fake_guard, name, level_id=1, misses=0):
    sid = start_session(level_id, name)
    fake_guard.reply = "no"
    for _ in range(misses):
        send(client, sid)
    fake_guard.reply = levels()[level_id]["secret"].lower()
    assert send(client, sid).json()["status"] == "won"


def test_leaderboard_sorted_and_filtered(client, start_session, fake_guard):
    win(client, start_session, fake_guard, "slow", misses=2)
    win(client, start_session, fake_guard, "fast", misses=0)
    win(client, start_session, fake_guard, "other-level", level_id=2)
    r = client.get("/api/leaderboard", params={"level_id": 1})
    assert r.status_code == 200
    entries = r.json()["entries"]
    assert [e["player_name"] for e in entries] == ["fast", "slow"]
    assert entries[0] == {"player_name": "fast", "score": 1000, "attempts_used": 1}
    assert entries[1] == {"player_name": "slow", "score": 250, "attempts_used": 3}
    assert len(client.get("/api/leaderboard").json()["entries"]) == 3


def test_leaderboard_excludes_unfinished_and_lost(client, start_session, fake_guard):
    start_session(1, "never-played")
    assert client.get("/api/leaderboard", params={"level_id": 1}).json() == {"entries": []}


def test_leaderboard_invalid_level_id(client):
    assert_error(client.get("/api/leaderboard", params={"level_id": "x"}), 400, "invalid_request")


def test_data_persists_across_restarts(settings, fake_guard):
    first = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    sid = first.post("/api/sessions", json={"level_id": 1, "player_name": "p"}).json()["session_id"]
    fake_guard.reply = levels()[1]["secret"]
    first.post(f"/api/sessions/{sid}/messages", json={"message": "hi"})

    second = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    assert second.get("/api/leaderboard").json()["entries"][0]["player_name"] == "p"
    assert_error(second.post(f"/api/sessions/{sid}/messages", json={"message": "again"}), 409, "level_finished")


# Misc

def test_unknown_path_uses_error_format(client):
    assert_error(client.get("/api/nope"), 404, "not_found")


def test_cors_allows_configured_origin_only(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers
