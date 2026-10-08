"""Per-browser progress: players, level locking, frontier moves, campaign score, winning messages."""
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.app import progress
from backend.app.config import Settings
from backend.app.db import Database
from backend.app.levels import load_levels
from backend.app.main import create_app

LEVELS = load_levels(Settings().levels_dir)  # Map 1: levels 1-3, checkpoints at 1 and 3


def new_player(client):
    r = client.post("/api/players")
    assert r.status_code == 201, r.text
    return r.json()["player_id"]


def start(client, player_id, level_id, name="phantom"):
    return client.post("/api/sessions", json={"level_id": level_id, "player_name": name, "player_id": player_id})


def play(client, fake_guard, player_id, level_id, outcome, misses=0):
    """Play a level to a win or a loss. Returns the final message response body."""
    r = start(client, player_id, level_id)
    assert r.status_code == 201, r.text
    sid = r.json()["session_id"]
    fake_guard.reply = "No."
    body = None
    if outcome == "lost":
        for _ in range(LEVELS[level_id]["max_attempts"]):
            body = client.post(f"/api/sessions/{sid}/messages", json={"message": "let me in"}).json()
        assert body["status"] == "lost"
        return body
    for _ in range(misses):
        client.post(f"/api/sessions/{sid}/messages", json={"message": "let me in"})
    fake_guard.reply = "Fine: " + LEVELS[level_id]["secret"]
    body = client.post(f"/api/sessions/{sid}/messages", json={"message": f"winning trick {level_id}"}).json()
    assert body["status"] == "won"
    return body


def get_progress(client, player_id):
    r = client.get(f"/api/players/{player_id}/progress")
    assert r.status_code == 200, r.text
    return r.json()


def statuses(prog):
    return [lv["status"] for lv in prog["levels"]]


# Pure rules

def test_next_level_and_completion():
    assert progress.first_level_id(LEVELS) == 1
    assert progress.next_level_id(LEVELS, 1) == 2
    assert progress.next_level_id(LEVELS, 3) == 4  # past the last level: campaign complete


@pytest.mark.parametrize("frontier, level_id, status, expected", [
    (1, 1, "won", 2),
    (2, 2, "won", 3),
    (2, 2, "lost", 1),          # back to the checkpoint at level 1
    (3, 3, "lost", 3),          # level 3 is itself a checkpoint
    (3, 1, "won", None),        # replaying an earlier level does not move the frontier
    (3, 1, "lost", None),
    (2, 2, "in_progress", None),
])
def test_new_frontier(frontier, level_id, status, expected):
    assert progress.new_frontier(LEVELS, frontier, LEVELS[level_id], status) == expected


# API

def test_new_player_starts_at_level_1(client):
    prog = get_progress(client, new_player(client))
    assert prog["current_level_id"] == 1
    assert prog["completed"] is False
    assert prog["campaign_score"] == 0
    assert statuses(prog) == ["unlocked", "locked", "locked"]


def test_player_ids_are_unique(client):
    assert new_player(client) != new_player(client)


def test_locked_level_cannot_be_started(client):
    r = start(client, new_player(client), 2)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "level_locked"


def test_unknown_player(client):
    assert client.get("/api/players/nope/progress").status_code == 404
    r = start(client, "nope", 1)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_sessions_without_player_id_are_unchanged(client):
    # Old clients keep working: no player, no locking.
    r = client.post("/api/sessions", json={"level_id": 3, "player_name": "guest"})
    assert r.status_code == 201


def test_winning_unlocks_the_next_level_and_scores(client, fake_guard):
    pid = new_player(client)
    play(client, fake_guard, pid, 1, "won")              # first try: 1000
    prog = get_progress(client, pid)
    assert prog["current_level_id"] == 2
    assert statuses(prog) == ["cleared", "unlocked", "locked"]
    assert prog["levels"][0]["best_score"] == 1000
    assert prog["campaign_score"] == 1000
    assert start(client, pid, 2).status_code == 201


def test_losing_sends_frontier_back_to_checkpoint(client, fake_guard):
    pid = new_player(client)
    play(client, fake_guard, pid, 1, "won")
    body = play(client, fake_guard, pid, 2, "lost")
    assert body["restart_level_id"] == 1
    prog = get_progress(client, pid)
    assert prog["current_level_id"] == 1
    assert statuses(prog) == ["unlocked", "locked", "locked"]
    assert prog["campaign_score"] == 0                  # level 1 is no longer cleared
    assert prog["levels"][0]["best_score"] == 1000      # but its best score is remembered
    assert start(client, pid, 2).status_code == 409


def test_checkpoint_at_level_3_is_kept(client, fake_guard):
    pid = new_player(client)
    for level_id in (1, 2):
        play(client, fake_guard, pid, level_id, "won")
    play(client, fake_guard, pid, 3, "lost")
    assert get_progress(client, pid)["current_level_id"] == 3


def test_full_campaign_completes(client, fake_guard):
    pid = new_player(client)
    play(client, fake_guard, pid, 1, "won")              # 1000
    play(client, fake_guard, pid, 2, "won", misses=1)    # 500
    play(client, fake_guard, pid, 3, "won", misses=2)    # 250
    prog = get_progress(client, pid)
    assert prog["completed"] is True
    assert prog["current_level_id"] is None
    assert statuses(prog) == ["cleared"] * 3
    assert prog["campaign_score"] == 1750


def test_replaying_an_earlier_level_does_not_reset_progress(client, fake_guard):
    pid = new_player(client)
    play(client, fake_guard, pid, 1, "won", misses=2)    # 250
    play(client, fake_guard, pid, 2, "won")
    play(client, fake_guard, pid, 1, "lost")             # replay loss: frontier stays at 3
    play(client, fake_guard, pid, 1, "won")              # replay win: best score improves
    prog = get_progress(client, pid)
    assert prog["current_level_id"] == 3
    assert prog["levels"][0]["best_score"] == 1000


def test_two_open_sessions_on_the_frontier_move_it_once(client, fake_guard):
    pid = new_player(client)
    a = start(client, pid, 1).json()["session_id"]
    b = start(client, pid, 1).json()["session_id"]
    fake_guard.reply = "Fine: " + LEVELS[1]["secret"]
    client.post(f"/api/sessions/{a}/messages", json={"message": "trick"})      # frontier 1 -> 2
    client.post(f"/api/sessions/{b}/messages", json={"message": "trick"})      # replay now: no move
    assert get_progress(client, pid)["current_level_id"] == 2


def test_players_progress_is_separate(client, fake_guard):
    one, two = new_player(client), new_player(client)
    play(client, fake_guard, one, 1, "won")
    assert get_progress(client, two)["current_level_id"] == 1


def test_progress_survives_restart(settings, fake_guard):
    first = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    pid = new_player(first)
    play(first, fake_guard, pid, 1, "won")
    second = TestClient(create_app(settings=settings, guard_fn=fake_guard))
    assert get_progress(second, pid)["current_level_id"] == 2


# Winning messages (for the AI owner's learning boss)

def test_winning_messages_lists_the_message_that_won_each_level(settings, client, fake_guard):
    pid = new_player(client)
    play(client, fake_guard, pid, 1, "won", misses=1)
    play(client, fake_guard, pid, 2, "lost")
    play(client, fake_guard, pid, 1, "won")
    db = Database(settings.database_path)
    assert db.winning_messages(pid) == [
        {"level_id": 1, "message": "winning trick 1"},
        {"level_id": 1, "message": "winning trick 1"},
    ]
    assert db.winning_messages(new_player(client)) == []


# Older database files

def test_old_database_gets_player_column(tmp_path):
    path = str(tmp_path / "old.db")
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE sessions (id TEXT PRIMARY KEY, level_id INTEGER NOT NULL, player_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress', attempts_used INTEGER NOT NULL DEFAULT 0,
            score INTEGER, created_at TEXT NOT NULL, finished_at TEXT);
        INSERT INTO sessions (id, level_id, player_name, status, score, created_at)
            VALUES ('old', 1, 'veteran', 'won', 1000, '2026-10-08');
    """)
    conn.close()
    db = Database(path)
    db.create_session(1, "new", db.create_player(1))
    assert db.leaderboard(1)[0]["player_name"] == "veteran"
    Database(path)  # running the migration twice is harmless


def test_frontier_moves_only_if_unchanged_since_read(settings):
    # Two sessions read frontier 1 at the same time; only the first finish may move it.
    db = Database(settings.database_path)
    pid = db.create_player(1)
    a, b = db.create_session(1, "p", pid), db.create_session(1, "p", pid)
    db.record_turn(a, "x", "y", 1, "won", 1000, progress=(pid, 1, 2))
    db.record_turn(b, "x", "y", 3, "lost", None, progress=(pid, 1, 1))   # stale read: ignored
    assert db.get_player(pid)["current_level_id"] == 2
