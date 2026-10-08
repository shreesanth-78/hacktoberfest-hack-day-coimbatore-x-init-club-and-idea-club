"""Run a set of attack messages against a level several times and report win rates.

Because the model's output varies, one try proves little. This runs each message
N times (fresh conversation each time) so the AI owner can tune a level.

Usage:
    python tools/level_trials.py 3 5          # level 3, 5 trials per message
Environment: OLLAMA_MODEL (required), OLLAMA_HOST, OLLAMA_TIMEOUT_SECONDS.
Attack messages come from levels/attacks.json (a list per level id).
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from ai import guard  # noqa: E402
from smoke_test import is_blocked, is_win  # noqa: E402


def main():
    lid = int(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    level = guard.load_level(os.path.join(ROOT, "levels", f"level_{lid}.json"))
    with open(os.path.join(ROOT, "levels", "attacks.json"), encoding="utf-8") as f:
        attacks = json.load(f)[str(lid)]
    for msg in attacks:
        wins = blocked = 0
        for _ in range(n):
            try:
                reply = guard.guard_reply(level, [], msg)
            except (guard.AIUnavailableError, guard.AITimeoutError) as e:
                print(f"  error: {e}")
                continue
            if is_blocked(level, reply):
                blocked += 1
            elif is_win(level, reply, msg):
                wins += 1
        print(f"L{lid} wins {wins}/{n} blocked {blocked}/{n} | {msg}")


if __name__ == "__main__":
    main()
