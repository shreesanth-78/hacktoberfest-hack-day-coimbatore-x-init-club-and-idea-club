"""SQLite storage for sessions, chat history, scores and campaigns.

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
CREATE TABLE IF NOT EXISTS campaigns (
    id                  TEXT PRIMARY KEY,
    player_name         TEXT NOT NULL,
    current_level_id    INTEGER NOT NULL,
    checkpoint_level_id INTEGER,
    bonus_score         INTEGER NOT NULL DEFAULT 0,
    total_score         INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaign_levels (
    campaign_id   TEXT NOT NULL REFERENCES campaigns(id),
    level_id      INTEGER NOT NULL,
    score         INTEGER NOT NULL,
    attempts_used INTEGER NOT NULL,
    PRIMARY KEY (campaign_id, level_id)
);
CREATE TABLE IF NOT EXISTS campaign_wins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    kingdom     INTEGER NOT NULL,
    level_id    INTEGER NOT NULL,
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_sessions_leaderboard ON sessions(level_id, status, score);
CREATE INDEX IF NOT EXISTS idx_campaigns_leaderboard ON campaigns(total_score);
CREATE INDEX IF NOT EXISTS idx_campaign_wins ON campaign_wins(campaign_id, kingdom, id);
"""

# Columns added after the first release. Older database files get them on startup.
MIGRATIONS = [("sessions", "campaign_id", "TEXT REFERENCES campaigns(id)")]
POST_MIGRATION = "CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions(campaign_id, level_id, status);"


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

    # Sessions and messages

    def create_session(self, level_id, player_name, campaign_id=None):
        session_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions (id, level_id, player_name, created_at, campaign_id) VALUES (?, ?, ?, ?, ?)",
                (session_id, level_id, player_name, _now(), campaign_id),
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

    def record_turn(self, session_id, user_message, shown_reply, attempts_used, status, score, campaign=None):
        """Save one completed turn and the session's new state in a single transaction.

        campaign, if given, is the change a finished campaign level makes (built in main.py from
        backend/app/campaign.py). It is applied only if the campaign is still on
        campaign["expected_level_id"], so two sessions finishing at once cannot both move it.
        Returns the campaign's new total score, or None if no campaign change was applied.
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
            if campaign is None:
                return None
            return self._apply_campaign(conn, campaign, now)

    def _apply_campaign(self, conn, c, now):
        moved = conn.execute(
            """UPDATE campaigns SET current_level_id = ?, checkpoint_level_id = ?, status = ?,
                      bonus_score = bonus_score + ?, updated_at = ?
               WHERE id = ? AND current_level_id = ? AND status = 'in_progress'""",
            (c["current_level_id"], c["checkpoint_level_id"], c["status"], c["bonus"], now,
             c["campaign_id"], c["expected_level_id"]),
        ).rowcount
        if not moved:
            return None
        if c.get("win"):
            w = c["win"]
            conn.execute(
                """INSERT INTO campaign_levels (campaign_id, level_id, score, attempts_used) VALUES (?, ?, ?, ?)
                   ON CONFLICT (campaign_id, level_id) DO UPDATE SET
                       attempts_used = CASE WHEN excluded.score > score THEN excluded.attempts_used ELSE attempts_used END,
                       score = MAX(score, excluded.score)""",
                (c["campaign_id"], w["level_id"], w["score"], w["attempts_used"]),
            )
            conn.execute(
                "INSERT INTO campaign_wins (campaign_id, kingdom, level_id, message, created_at) VALUES (?, ?, ?, ?, ?)",
                (c["campaign_id"], w["kingdom"], w["level_id"], w["message"], now),
            )
        if c.get("discard"):
            d = c["discard"]
            conn.execute(
                "DELETE FROM campaign_wins WHERE campaign_id = ? AND kingdom = ? AND level_id >= ?",
                (c["campaign_id"], d["kingdom"], d["from_level_id"]),
            )
        # Each level counts once (its best score) plus bonuses, so replays cannot farm points.
        conn.execute(
            """UPDATE campaigns SET total_score = bonus_score +
                   (SELECT COALESCE(SUM(score), 0) FROM campaign_levels WHERE campaign_id = ?)
               WHERE id = ?""",
            (c["campaign_id"], c["campaign_id"]),
        )
        return conn.execute("SELECT total_score FROM campaigns WHERE id = ?", (c["campaign_id"],)).fetchone()[0]

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

    # Campaigns

    def create_campaign(self, player_name, first_level_id):
        campaign_id = uuid.uuid4().hex
        now = _now()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO campaigns (id, player_name, current_level_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (campaign_id, player_name, first_level_id, now, now),
            )
        return campaign_id

    def get_campaign(self, campaign_id):
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
        return dict(row) if row else None

    def open_campaign_session(self, campaign_id, level_id):
        """The newest unfinished session of this campaign for level_id, or None."""
        with self._connect() as conn:
            row = conn.execute(
                """SELECT * FROM sessions WHERE campaign_id = ? AND level_id = ? AND status = 'in_progress'
                   ORDER BY created_at DESC LIMIT 1""",
                (campaign_id, level_id),
            ).fetchone()
        return dict(row) if row else None

    def campaign_wins(self, campaign_id, kingdom):
        """Winning messages kept in this kingdom, oldest first: [{"level_id", "message"}]."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT level_id, message FROM campaign_wins WHERE campaign_id = ? AND kingdom = ? ORDER BY id",
                (campaign_id, kingdom),
            ).fetchall()
        return [dict(r) for r in rows]

    def campaign_leaderboard(self, limit=50):
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT c.player_name, c.total_score, c.status,
                          (SELECT COUNT(*) FROM campaign_levels l
                           WHERE l.campaign_id = c.id AND (l.level_id < c.current_level_id OR c.status = 'completed'))
                          AS levels_cleared
                   FROM campaigns c
                   ORDER BY c.total_score DESC, levels_cleared DESC, c.created_at ASC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]
