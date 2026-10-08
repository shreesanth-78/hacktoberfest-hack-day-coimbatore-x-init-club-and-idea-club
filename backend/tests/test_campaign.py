"""Campaign API and rules (docs/BACKEND_CAMPAIGN_SPEC.md), with the fake guard.

Real level files: 5 kingdoms x 6 levels, checkpoints at 3, 9, 15, 21, 27, bosses at 6, 12, 18, 24, 30.
"""
import sqlite3

import pytest
from fastapi.testclient import TestClient

from ai import guard
from backend.app import campaign as rules
from backend.app.config import Settings
from backend.app.db import Database
from backend.app.levels import load_levels
from backend.app.main import create_app

LEVELS = load_levels(Settings().levels_dir)
FIRST_TRY, SECOND_TRY = 1000, 500


def new_campaign(client, name="Phantom"):
    r = client.post("/api/campaigns", json={"player_name": name})
    assert r.status_code == 201, r.text
    return r.json()["campaign_id"]


def state(client, cid):
    r = client.get(f"/api/campaigns/{cid}")
    assert r.status_code == 200, r.text
    return r.json()


def enter(client, cid):
    r = client.post(f"/api/campaigns/{cid}/sessions")
    assert r.status_code == 201, r.text
    return r.json()


def say(client, sid, message):
    r = client.post(f"/api/sessions/{sid}/messages", json={"message": message})
    assert r.status_code == 200, r.text
    return r.json()


def win(client, fake_guard, cid, misses=0):
    """Win the campaign's current level. The winning message is 'trick <level id>'."""
    s = enter(client, cid)
    fake_guard.reply = "No."
    for _ in range(misses):
        say(client, s["session_id"], "let me in")
    fake_guard.reply = "Fine: " + LEVELS[s["level_id"]]["secret"]
    body = say(client, s["session_id"], f"trick {s['level_id']}")
    assert body["status"] == "won", body
    return body


def lose(client, fake_guard, cid):
    s = enter(client, cid)
    fake_guard.reply = "No."
    body = None
    for _ in range(s["attempts_remaining"]):
        body = say(client, s["session_id"], "let me in")
    assert body["status"] == "lost", body
    return body


def win_until(client, fake_guard, cid, level_id):
    """Win levels until the campaign's current level is level_id."""
    while state(client, cid)["current_level_id"] != level_id:
        win(client, fake_guard, cid)


# Starting and resuming

def test_new_campaign_state(client):
    cid = new_campaign(client)
    assert state(client, cid) == {
        "campaign_id": cid, "player_name": "Phantom", "status": "in_progress", "current_level_id": 1,
        "current_kingdom": 1, "checkpoint_level_id": None, "cleared_level_ids": [], "total_score": 0,
    }


@pytest.mark.parametrize("payload", [{}, {"player_name": ""}, {"player_name": "x" * 31}])
def test_invalid_player_name(client, payload):
    r = client.post("/api/campaigns", json=payload)
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_request"


def test_unknown_campaign(client):
    for r in (client.get("/api/campaigns/nope"), client.post("/api/campaigns/nope/sessions")):
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "not_found"


def test_entering_returns_the_current_level_and_resumes_an_open_session(client, fake_guard):
    cid = new_campaign(client)
    first = enter(client, cid)
    assert first["level_id"] == 1
    assert first["attempts_remaining"] == 3
    assert first["level"]["opening"] == LEVELS[1]["opening"]
    assert "secret" not in first["level"] and "hint" not in first["level"]
    say(client, first["session_id"], "hello")
    again = enter(client, cid)  # e.g. after a page reload
    assert again["session_id"] == first["session_id"]
    assert again["attempts_remaining"] == 2


# Spec section 6

def test_1_clearing_level_3_sets_checkpoint_and_bonus(client, fake_guard):
    cid = new_campaign(client)
    win(client, fake_guard, cid)
    win(client, fake_guard, cid)
    body = win(client, fake_guard, cid)
    c = body["campaign"]
    assert c["checkpoint_reached"] is True
    assert c["bonuses"] == {"checkpoint": 500, "kingdom": 0}
    assert c["total_score"] == 3 * FIRST_TRY + 500
    assert c["next_level_id"] == 4
    s = state(client, cid)
    assert s["checkpoint_level_id"] == 3
    assert s["cleared_level_ids"] == [1, 2, 3]
    assert s["total_score"] == 3500


def test_2_loss_respawns_after_checkpoint_or_at_kingdom_start(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 5)
    c = lose(client, fake_guard, cid)["campaign"]
    assert (c["outcome"], c["respawn"], c["next_level_id"], c["level_score"]) == ("lost", True, 4, 0)
    assert state(client, cid)["current_level_id"] == 4

    cid2 = new_campaign(client)
    win(client, fake_guard, cid2)
    assert lose(client, fake_guard, cid2)["campaign"]["next_level_id"] == 1
    assert state(client, cid2)["current_level_id"] == 1


def test_3_respawn_resets_lives_and_discards_later_wins(client, fake_guard, settings):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 5)  # won 1-4
    lose(client, fake_guard, cid)          # respawn at 4
    assert enter(client, cid)["attempts_remaining"] == 3
    kept = Database(settings.database_path).campaign_wins(cid, 1)
    assert [w["level_id"] for w in kept] == [1, 2, 3]  # the level 4 win is gone


def test_4_clearing_the_boss_clears_the_kingdom(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 6)
    c = win(client, fake_guard, cid)["campaign"]
    assert c["kingdom_cleared"] is True
    assert c["bonuses"] == {"checkpoint": 0, "kingdom": 1000}
    assert c["next_level_id"] == 7
    s = state(client, cid)
    assert (s["current_level_id"], s["current_kingdom"], s["checkpoint_level_id"]) == (7, 2, None)
    assert s["total_score"] == 6 * FIRST_TRY + 500 + 1000


def test_5_clearing_level_30_completes_the_campaign(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 30)
    c = win(client, fake_guard, cid)["campaign"]
    assert c["campaign_completed"] is True
    assert c["next_level_id"] is None
    s = state(client, cid)
    assert s["status"] == "completed"
    assert s["cleared_level_ids"] == list(range(1, 31))
    assert s["total_score"] == 30 * FIRST_TRY + 5 * 500 + 5 * 1000
    r = client.post(f"/api/campaigns/{cid}/sessions")
    assert r.status_code == 409


def test_6_boss_learns_only_from_this_kingdoms_kept_wins(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 6)
    assert all(call["learned_attacks"] is None for call in fake_guard.calls)  # levels 1-5 never learn
    win(client, fake_guard, cid)
    expected = [{"message": f"trick {i}", "technique": LEVELS[i]["debrief"]["technique"]} for i in range(1, 6)]
    assert fake_guard.calls[-1]["learned_attacks"] == expected

    win_until(client, fake_guard, cid, 12)
    win(client, fake_guard, cid)
    learned = fake_guard.calls[-1]["learned_attacks"]
    assert [a["message"] for a in learned] == [f"trick {i}" for i in range(7, 12)]  # kingdom 1 never leaks in


def test_6b_boss_does_not_learn_discarded_wins(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 5)
    lose(client, fake_guard, cid)            # level 4 win discarded, respawn at 4
    fake_guard.reply = "No."
    win(client, fake_guard, cid, misses=1)   # level 4 again
    win(client, fake_guard, cid)             # level 5
    win(client, fake_guard, cid)             # boss
    assert [a["message"] for a in fake_guard.calls[-1]["learned_attacks"]] == [f"trick {i}" for i in range(1, 6)]


def test_7_free_play_never_touches_campaigns(client, fake_guard, settings):
    sid = client.post("/api/sessions", json={"level_id": 6, "player_name": "guest"}).json()["session_id"]
    fake_guard.reply = "Fine: " + LEVELS[6]["secret"]
    body = say(client, sid, "trick")
    assert body["status"] == "won"
    assert body["campaign"] is None
    assert fake_guard.calls[-1]["learned_attacks"] is None  # free play bosses do not learn
    conn = sqlite3.connect(settings.database_path)
    assert conn.execute("SELECT COUNT(*) FROM campaigns").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM campaign_wins").fetchone()[0] == 0


# Beyond the spec

def test_campaign_object_only_when_a_campaign_level_ends(client, fake_guard):
    cid = new_campaign(client)
    s = enter(client, cid)
    fake_guard.reply = "No."
    assert say(client, s["session_id"], "hi")["campaign"] is None


def test_replays_cannot_farm_points(client, fake_guard):
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 4)
    base = state(client, cid)["total_score"]               # levels 1-3 + checkpoint bonus
    for _ in range(3):                                     # win 4 then lose 5, three times
        win(client, fake_guard, cid, misses=1)             # 500 each time
        lose(client, fake_guard, cid)
    assert state(client, cid)["total_score"] == base + SECOND_TRY  # level 4 counted once
    win(client, fake_guard, cid)                           # first try: best score now 1000
    assert state(client, cid)["total_score"] == base + FIRST_TRY


def test_ai_failure_changes_nothing(client, fake_guard):
    cid = new_campaign(client)
    s = enter(client, cid)
    fake_guard.error = guard.AITimeoutError("slow")
    r = client.post(f"/api/sessions/{s['session_id']}/messages", json={"message": "hi"})
    assert r.status_code == 504
    fake_guard.error = None
    assert enter(client, cid)["attempts_remaining"] == 3
    assert state(client, cid)["current_level_id"] == 1


def test_stale_campaign_session_is_locked(client, fake_guard, settings):
    cid = new_campaign(client)
    win(client, fake_guard, cid)  # campaign moves to level 2
    # A leftover open session for level 1 (for example from a race or an old tab).
    stale = Database(settings.database_path).create_session(1, "Phantom", cid)
    r = client.post(f"/api/sessions/{stale}/messages", json={"message": "hi"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "level_locked"


def test_two_finishes_on_the_same_level_move_the_campaign_once(settings):
    db = Database(settings.database_path)
    cid = db.create_campaign("p", 1)
    a, b = db.create_session(1, "p", cid), db.create_session(1, "p", cid)
    change = {"campaign_id": cid, "expected_level_id": 1, "current_level_id": 2, "checkpoint_level_id": None,
              "status": "in_progress", "bonus": 0,
              "win": {"level_id": 1, "kingdom": 1, "score": 1000, "attempts_used": 1, "message": "m"}}
    assert db.record_turn(a, "m", "r", 1, "won", 1000, campaign=change) == 1000
    assert db.record_turn(b, "m", "r", 1, "won", 1000, campaign=change) is None  # stale: ignored
    assert db.get_campaign(cid)["current_level_id"] == 2
    assert len(db.campaign_wins(cid, 1)) == 1


def test_replay_checkpoint_option(client, fake_guard, monkeypatch):
    # Spec question 1: the team may prefer replaying the checkpoint level itself.
    monkeypatch.setattr(rules, "RESPAWN_AFTER_CHECKPOINT", False)
    cid = new_campaign(client)
    win_until(client, fake_guard, cid, 5)
    assert lose(client, fake_guard, cid)["campaign"]["next_level_id"] == 3
    c = win(client, fake_guard, cid)["campaign"]           # level 3 again
    assert c["bonuses"]["checkpoint"] == 0                 # the bonus is not paid twice


def test_campaign_leaderboard(client, fake_guard):
    low, high = new_campaign(client, "low"), new_campaign(client, "high")
    win(client, fake_guard, low, misses=2)
    win_until(client, fake_guard, high, 3)
    r = client.get("/api/campaigns/leaderboard")
    assert r.status_code == 200
    assert r.json()["entries"][:2] == [
        {"player_name": "high", "total_score": 2000, "status": "in_progress", "levels_cleared": 2},
        {"player_name": "low", "total_score": 250, "status": "in_progress", "levels_cleared": 1},
    ]


def test_campaign_survives_restart(settings, fake_guard):
    first = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    cid = new_campaign(first)
    win(first, fake_guard, cid)
    second = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    assert state(second, cid)["current_level_id"] == 2


# Older database files

@pytest.mark.parametrize("extra", ["", ", player_id TEXT"])  # before PR #5, and from PR #5
def test_old_database_is_upgraded(tmp_path, extra):
    path = str(tmp_path / "old.db")
    conn = sqlite3.connect(path)
    conn.executescript(f"""
        CREATE TABLE sessions (id TEXT PRIMARY KEY, level_id INTEGER NOT NULL, player_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress', attempts_used INTEGER NOT NULL DEFAULT 0,
            score INTEGER, created_at TEXT NOT NULL, finished_at TEXT{extra});
        INSERT INTO sessions (id, level_id, player_name, status, score, created_at)
            VALUES ('old', 1, 'veteran', 'won', 1000, '2026-10-08');
    """)
    conn.close()
    db = Database(path)
    cid = db.create_campaign("new", 1)
    db.create_session(1, "new", cid)
    assert db.leaderboard(1)[0]["player_name"] == "veteran"
    Database(path)  # running the migration twice is harmless
