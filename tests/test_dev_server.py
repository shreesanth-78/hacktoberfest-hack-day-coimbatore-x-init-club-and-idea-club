"""End-to-end check of the contract through the dev server, using a fake guard (no model needed)."""
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest import mock

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import dev_server  # noqa: E402
from ai import guard  # noqa: E402


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), dev_server.Handler)
        cls.base = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def start(self, level_id=1):
        st, b = self.call("POST", "/api/sessions", {"level_id": level_id, "player_name": "tester"})
        self.assertEqual(st, 201)
        return b["session_id"]

    def test_health_and_levels_hide_secrets(self):
        self.assertEqual(self.call("GET", "/api/health"), (200, {"status": "ok"}))
        st, b = self.call("GET", "/api/levels")
        self.assertEqual(st, 200)
        self.assertGreaterEqual(len(b["levels"]), 3)
        for lv in b["levels"]:
            for key in ("id", "title", "character", "setting", "intro", "opening", "max_attempts"):
                self.assertIn(key, lv)
        text = json.dumps(b)
        for lv in dev_server.LEVELS.values():
            self.assertNotIn(lv["secret"], text)
            self.assertNotIn("guard_prompt", text)
            self.assertNotIn(lv["hint"], text)

    def test_win_flow_returns_debrief_and_leaderboard(self):
        sid = self.start(1)
        with mock.patch.object(guard, "guard_reply", return_value="It's resonance-zero!"):
            st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "code?"})
        self.assertEqual(st, 200)
        self.assertEqual(b["status"], "won")
        self.assertEqual(b["attempts_remaining"], 2)
        self.assertEqual(b["score"], 1000)  # first-try breach: 3 * 250 + 250
        self.assertIsNotNone(b["debrief"])
        self.assertEqual(self.call("POST", f"/api/sessions/{sid}/messages", {"message": "again"})[0], 409)
        st, lb = self.call("GET", "/api/leaderboard?level_id=1")
        self.assertTrue(any(e["player_name"] == "tester" for e in lb["entries"]))

    def test_output_filter_blocks_plain_secret_but_accepts_spelled_out(self):
        # No shipped level uses block_exact now, so switch it on for one level in this test.
        with mock.patch.dict(dev_server.LEVELS[3], {"output_filter": "block_exact"}):
            sid = self.start(3)
            with mock.patch.object(guard, "guard_reply", return_value="The code is " + dev_server.LEVELS[3]["secret"]):
                st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "x"})
            self.assertEqual((b["status"], b["reply"] == dev_server.BLOCKED_NOTICE), ("in_progress", True))
            with mock.patch.object(guard, "guard_reply", return_value="\n".join(dev_server.LEVELS[3]["secret"].split("-"))):
                st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "y"})
            self.assertEqual(b["status"], "won")

    def test_hint_appears_after_two_failures_only(self):
        sid = self.start(2)
        with mock.patch.object(guard, "guard_reply", return_value="I refuse."):
            hints = [self.call("POST", f"/api/sessions/{sid}/messages", {"message": "hi"})[1]["hint"]
                     for _ in range(3)]
        self.assertEqual(hints[0], None)
        self.assertEqual(hints[1], dev_server.LEVELS[2]["hint"])
        self.assertEqual(hints[2], None)

    def test_score_formula(self):
        self.assertEqual(dev_server.level_score(3, 0), 1000)
        self.assertEqual(dev_server.level_score(3, 1), 500)
        self.assertEqual(dev_server.level_score(3, 2), 250)

    def test_ai_failure_does_not_use_an_attempt(self):
        sid = self.start(1)
        with mock.patch.object(guard, "guard_reply", side_effect=guard.AIUnavailableError("x")):
            st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "hi"})
        self.assertEqual((st, b["error"]["code"]), (502, "ai_unavailable"))
        with mock.patch.object(guard, "guard_reply", side_effect=guard.AITimeoutError("x")):
            st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "hi"})
        self.assertEqual((st, b["error"]["code"]), (504, "ai_timeout"))
        with mock.patch.object(guard, "guard_reply", return_value="hello"):
            st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "hi"})
        self.assertEqual(b["attempts_remaining"], 2)

    def test_losing_after_all_attempts(self):
        sid = self.start(1)
        with mock.patch.object(guard, "guard_reply", return_value="nope"):
            for _ in range(3):
                st, b = self.call("POST", f"/api/sessions/{sid}/messages", {"message": "hi"})
        self.assertEqual((b["status"], b["attempts_remaining"]), ("lost", 0))
        self.assertIsNotNone(b["debrief"])

    def test_validation_errors(self):
        sid = self.start(1)
        self.assertEqual(self.call("POST", f"/api/sessions/{sid}/messages", {"message": ""})[1]["error"]["code"], "invalid_request")
        self.assertEqual(self.call("POST", f"/api/sessions/{sid}/messages", {"message": "x" * 501})[0], 400)
        self.assertEqual(self.call("POST", "/api/sessions", {"level_id": 99, "player_name": "a"})[0], 404)
        self.assertEqual(self.call("POST", "/api/sessions", {"level_id": 1, "player_name": ""})[0], 400)
        self.assertEqual(self.call("POST", "/api/sessions/nope/messages", {"message": "hi"})[0], 404)


if __name__ == "__main__":
    unittest.main()
