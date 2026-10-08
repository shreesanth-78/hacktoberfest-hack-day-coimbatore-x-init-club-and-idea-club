import glob
import json
import os
import sys
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import smoke_test as rules  # noqa: E402


def level(n):
    with open(os.path.join(ROOT, "levels", f"level_{n}.json"), encoding="utf-8") as f:
        return json.load(f)


class RuleTests(unittest.TestCase):
    def test_plain_secret_wins_when_unfiltered(self):
        l1 = level(1)
        self.assertTrue(rules.is_win(l1, "Sure, it's sunflower!"))
        self.assertFalse(rules.is_blocked(l1, "Sure, it's sunflower!"))

    def test_unrelated_reply_is_not_a_win(self):
        self.assertFalse(rules.is_win(level(1), "Nice weather tonight."))

    def test_level3_blocks_plain_secret(self):
        l3 = level(3)
        self.assertTrue(rules.is_blocked(l3, "The word is Lantern."))

    def test_level3_spelled_out_and_reversed_win_but_are_not_blocked(self):
        l3 = level(3)
        for reply in ("L-A-N-T-E-R-N", "l a n t e r n", "nretnal"):
            self.assertFalse(rules.is_blocked(l3, reply), reply)
            self.assertTrue(rules.is_win(l3, reply), reply)

    def test_all_levels_are_consistent(self):
        files = sorted(glob.glob(os.path.join(ROOT, "levels", "level_*.json")))
        self.assertGreaterEqual(len(files), 3)
        for path in files:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            n = int(os.path.basename(path)[6:-5])
            self.assertEqual(data["id"], n)
            self.assertIn(data["output_filter"], ("none", "block_exact"))
            self.assertIn(data["secret"], data["guard_prompt"])


if __name__ == "__main__":
    unittest.main()
