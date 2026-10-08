"""SQLite storage for sessions, chat history and scores.

All SQL lives in this file, so the database can be swapped later without touching the API.
A new connection is opened per operation, which is safe with FastAPI's thread pool.
"""
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id               TEXT PRIMARY KEY,
    current_level_id INTEGER NOT NULL,
    created_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    level_id      INTEGER NOT NULL,
    player_name   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'won', 'lost')),
    attempts_used INTEGER NOT NULL DEFAULT 0,
    score         INTEGER,
    created_at    TEXT NOT NULL,
    finished_at   TEXT,
    player_id     TEXT REFERENCES players(id)
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

# Columns added after the first release. Older database files get them on startup.
MIGRATIONS = [("sessions", "player_id", "TEXT REFERENCES players(id)")]
POST_MIGRATION = "CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id, level_id, status);"


def _now():
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path):
        self.path = path
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            for table, column, decl in MIGRATIONS:
                existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
                if column not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
            conn.executescript(POST_MIGRATION)

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

    def create_player(self, first_level_id):
        player_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO players (id, current_level_id, created_at) VALUES (?, ?, ?)",
                (player_id, first_level_id, _now()),
            )
        return player_id

    def get_player(self, player_id):
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        return dict(row) if row else None

    def best_scores(self, player_id):
        """{level_id: best winning score} for this player."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT level_id, MAX(score) AS best FROM sessions"
                " WHERE player_id = ? AND status = 'won' GROUP BY level_id",
                (player_id,),
            ).fetchall()
        return {r["level_id"]: r["best"] for r in rows}

    def winning_messages(self, player_id):
        """The player's message that won each won session, oldest first: [{"level_id", "message"}].

        For guards that learn from the player's earlier wins (planned by the AI owner).
        """
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT s.level_id, m.content AS message FROM sessions s
                   JOIN messages m ON m.id = (
                       SELECT MAX(id) FROM messages WHERE session_id = s.id AND role = 'user')
                   WHERE s.player_id = ? AND s.status = 'won'
                   ORDER BY s.finished_at, m.id""",
                (player_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def create_session(self, level_id, player_name, player_id=None):
        session_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions (id, level_id, player_name, created_at, player_id) VALUES (?, ?, ?, ?, ?)",
                (session_id, level_id, player_name, _now(), player_id),
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

    def record_turn(self, session_id, user_message, shown_reply, attempts_used, status, score, progress=None):
        """Save one completed turn and the session's new state in a single transaction.

        progress, if given, is (player_id, expected_frontier, new_frontier). The player's frontier is
        moved only if it still equals expected_frontier, so two finished sessions cannot both move it.
        """
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
            if progress is not None:
                player_id, expected, new = progress
                conn.execute(
                    "UPDATE players SET current_level_id = ? WHERE id = ? AND current_level_id = ?",
                    (new, player_id, expected),
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
