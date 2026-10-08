"""SQLite storage for sessions, chat history and scores.

All SQL lives in this file, so the database can be swapped later without touching the API.
A new connection is opened per operation, which is safe with FastAPI's thread pool.
"""
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    level_id      INTEGER NOT NULL,
    player_name   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'won', 'lost')),
    attempts_used INTEGER NOT NULL DEFAULT 0,
    score         INTEGER,
    created_at    TEXT NOT NULL,
    finished_at   TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_sessions_leaderboard ON sessions(level_id, status, score);
"""


def _now():
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path):
        self.path = path
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            with conn:  # commits on success, rolls back on error
                yield conn
        finally:
            conn.close()

    def create_session(self, level_id, player_name):
        session_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions (id, level_id, player_name, created_at) VALUES (?, ?, ?, ?)",
                (session_id, level_id, player_name, _now()),
            )
        return session_id

    def get_session(self, session_id):
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return dict(row) if row else None

    def get_history(self, session_id):
        """Chat history in the format guard_reply expects: [{"role", "content"}, ...]."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id", (session_id,)
            ).fetchall()
        return [dict(r) for r in rows]

    def record_turn(self, session_id, user_message, shown_reply, attempts_used, status, score):
        """Save one completed turn and the session's new state in a single transaction."""
        now = _now()
        finished_at = now if status != "in_progress" else None
        with self._connect() as conn:
            conn.executemany(
                "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                [(session_id, "user", user_message, now), (session_id, "assistant", shown_reply, now)],
            )
            conn.execute(
                "UPDATE sessions SET attempts_used = ?, status = ?, score = ?, finished_at = ? WHERE id = ?",
                (attempts_used, status, score, finished_at, session_id),
            )

    def leaderboard(self, level_id=None, limit=50):
        sql = "SELECT player_name, score, attempts_used FROM sessions WHERE status = 'won'"
        params = []
        if level_id is not None:
            sql += " AND level_id = ?"
            params.append(level_id)
        sql += " ORDER BY score DESC, attempts_used ASC, finished_at ASC LIMIT ?"
        params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
