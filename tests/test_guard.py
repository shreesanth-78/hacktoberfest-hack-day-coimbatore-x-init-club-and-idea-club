import io
import json
import os
import sys
import unittest
import urllib.error
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ai import guard  # noqa: E402

LEVEL_PATH = os.path.join(os.path.dirname(__file__), "..", "levels", "level_1.json")


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class GuardReplyTests(unittest.TestCase):
    def setUp(self):
        self.level = guard.load_level(LEVEL_PATH)
        self.env = mock.patch.dict(os.environ, {"OLLAMA_MODEL": "test-model"}, clear=False)
        self.env.start()
        os.environ.pop("GUARD_STUB", None)

    def tearDown(self):
        self.env.stop()

    def test_level_file_has_required_fields(self):
        for key in ("id", "title", "character", "setting", "intro", "opening", "hint", "max_attempts",
                    "secret", "output_filter", "guard_prompt", "debrief"):
            self.assertIn(key, self.level)
        for key in ("title", "technique", "vulnerability", "defence"):
            self.assertIn(key, self.level["debrief"])

    def test_stub_mode_needs_no_model(self):
        with mock.patch.dict(os.environ, {"GUARD_STUB": "1"}):
            self.assertTrue(guard.guard_reply(self.level, [], "hello").startswith("[stub]"))

    def test_returns_model_text_and_sends_system_prompt_first(self):
        body = json.dumps({"message": {"content": " Hi there! "}}).encode()
        with mock.patch("urllib.request.urlopen", return_value=FakeResponse(body)) as m:
            out = guard.guard_reply(self.level, [{"role": "user", "content": "a"}], "hello")
        self.assertEqual(out, "Hi there!")
        sent = json.loads(m.call_args[0][0].data)
        self.assertEqual(sent["messages"][0]["role"], "system")
        self.assertEqual(sent["messages"][-1], {"role": "user", "content": "hello"})
        self.assertFalse(sent["stream"])
        self.assertIs(sent["think"], False)

    def test_unreachable_raises_unavailable(self):
        with mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("refused")):
            with self.assertRaises(guard.AIUnavailableError):
                guard.guard_reply(self.level, [], "hi")

    def test_timeout_raises_timeout(self):
        with mock.patch("urllib.request.urlopen", side_effect=TimeoutError()):
            with self.assertRaises(guard.AITimeoutError):
                guard.guard_reply(self.level, [], "hi")

    def test_empty_reply_raises_unavailable(self):
        body = json.dumps({"message": {"content": "  "}}).encode()
        with mock.patch("urllib.request.urlopen", return_value=FakeResponse(body)):
            with self.assertRaises(guard.AIUnavailableError):
                guard.guard_reply(self.level, [], "hi")

    def test_missing_model_raises_unavailable(self):
        with mock.patch.dict(os.environ, {"OLLAMA_MODEL": ""}):
            with self.assertRaises(guard.AIUnavailableError):
                guard.guard_reply(self.level, [], "hi")


if __name__ == "__main__":
    unittest.main()
