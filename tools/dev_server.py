"""TEMPORARY dev stand-in for the backend (standard library only).

Implements the proposed API contract from README.md in memory so that:
  - the frontend owner can build against it before the real backend exists,
  - the backend owner can see how ai/guard.py plugs in.
It is NOT the real backend: sessions and scores live in memory and the scoring
formula is a placeholder. Replace it with the real backend, then delete it.

Run:   python tools/dev_server.py            (default port 8000)
Stub:  set GUARD_STUB=1 to run without a model.
Model: set OLLAMA_MODEL (for example gemma4:e2b).
"""
import glob
import json
import os
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from ai import guard  # noqa: E402
from smoke_test import is_blocked, is_win  # noqa: E402

CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")]
LEVELS = {}
for path in sorted(glob.glob(os.path.join(ROOT, "levels", "level_*.json"))):
    lv = guard.load_level(path)
    LEVELS[lv["id"]] = lv
SESSIONS = {}
SCORES = []
BLOCKED_NOTICE = "[Message blocked by the bank's security filter]"


def level_score(max_attempts, strikes):
    """Team design: max(100, (max_attempts - strikes) * 250), plus 250 for a first-try breach."""
    return max(100, (max_attempts - strikes) * 250 + (250 if strikes == 0 else 0))


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin", "")
        if origin in CORS_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _send(self, status, obj):
        data = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def _err(self, status, code, message):
        self._send(status, {"error": {"code": code, "message": message}})

    def _body(self):
        try:
            n = int(self.headers.get("Content-Length", "0"))
            return json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, UnicodeDecodeError):
            return None

    def log_message(self, *a):
        pass  # never log request bodies (they may contain secrets)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/health":
            return self._send(200, {"status": "ok"})
        if url.path == "/api/levels":
            return self._send(200, {"levels": [
                {k: lv[k] for k in ("id", "title", "character", "setting", "intro", "opening", "max_attempts")}
                for lv in LEVELS.values()]})
        if url.path == "/api/leaderboard":
            q = parse_qs(url.query).get("level_id", [None])[0]
            rows = [s for s in SCORES if q is None or str(s["level_id"]) == q]
            rows.sort(key=lambda s: -s["score"])
            return self._send(200, {"entries": [
                {k: s[k] for k in ("player_name", "score", "attempts_used")} for s in rows]})
        self._err(404, "not_found", "Unknown path")

    def do_POST(self):
        url = urlparse(self.path)
        body = self._body()
        if body is None or not isinstance(body, dict):
            return self._err(400, "invalid_request", "Body must be a JSON object")
        if url.path == "/api/sessions":
            return self._new_session(body)
        m = re.fullmatch(r"/api/sessions/([\w-]+)/messages", url.path)
        if m:
            return self._message(m.group(1), body)
        self._err(404, "not_found", "Unknown path")

    def _new_session(self, body):
        lv = LEVELS.get(body.get("level_id"))
        name = str(body.get("player_name", "")).strip()
        if lv is None:
            return self._err(404, "not_found", "Unknown level")
        if not 1 <= len(name) <= 30:
            return self._err(400, "invalid_request", "player_name must be 1-30 characters")
        sid = uuid.uuid4().hex
        SESSIONS[sid] = {"level": lv, "player": name, "history": [], "used": 0, "status": "in_progress"}
        self._send(201, {"session_id": sid, "level_id": lv["id"], "attempts_remaining": lv["max_attempts"]})

    def _message(self, sid, body):
        s = SESSIONS.get(sid)
        if s is None:
            return self._err(404, "not_found", "Unknown session")
        if s["status"] != "in_progress":
            return self._err(409, "level_finished", "This level is already finished")
        msg = str(body.get("message", "")).strip()
        if not 1 <= len(msg) <= 500:
            return self._err(400, "invalid_request", "message must be 1-500 characters")
        lv = s["level"]
        try:
            reply = guard.guard_reply(lv, s["history"], msg)
        except guard.AITimeoutError:
            return self._err(504, "ai_timeout", "The guard took too long to answer")
        except guard.AIUnavailableError:
            return self._err(502, "ai_unavailable", "The guard is unavailable")
        s["used"] += 1  # only after a successful AI call
        remaining = lv["max_attempts"] - s["used"]
        if is_blocked(lv, reply):
            shown, won = BLOCKED_NOTICE, False
        else:
            shown, won = reply, is_win(lv, reply, msg)
        s["history"] += [{"role": "user", "content": msg}, {"role": "assistant", "content": shown}]
        score = None
        if won:
            s["status"], score = "won", level_score(lv["max_attempts"], s["used"] - 1)
            SCORES.append({"level_id": lv["id"], "player_name": s["player"], "score": score, "attempts_used": s["used"]})
        elif remaining <= 0:
            s["status"] = "lost"
        done = s["status"] != "in_progress"
        # The handler's hint appears once the player has two failed attempts and is still playing.
        hint = lv.get("hint") if (not done and s["used"] == 2) else None
        self._send(200, {
            "reply": shown, "attempts_remaining": remaining, "status": s["status"],
            "score": score, "debrief": lv["debrief"] if done else None, "hint": hint,
        })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Dev server on http://localhost:{port} (stub={os.environ.get('GUARD_STUB') == '1'})")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
