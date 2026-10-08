"""Run each level's attack messages several times against the real model and check the results.

The model's output varies, so one try proves little. For every message in levels/attacks.json
this runs N fresh conversations and compares the win rate with what the level should do:

  expect "win"   the intended trick: should win in at least 60% of trials
  expect "fail"  a plain or earlier trick: should win in at most 20% of trials
  expect "info"  just printed

Kingdom bosses (levels with "learns": true) are given the earlier winning messages from
attacks.json ("_learned") as learned_attacks, as the backend will do in the real game.

Usage:
    python tools/level_trials.py 3 5          # level 3, 5 trials per message
    python tools/level_trials.py k2 5         # every level of kingdom 2
    python tools/level_trials.py all 4        # all 30 levels
Environment: OLLAMA_MODEL (required), OLLAMA_HOST, OLLAMA_TIMEOUT_SECONDS.
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from ai import guard  # noqa: E402
from smoke_test import is_blocked, is_win  # noqa: E402


def level_ids(arg):
    if arg == "all":
        return list(range(1, 31))
    if arg.startswith("k"):
        k = int(arg[1:])
        return list(range((k - 1) * 6 + 1, k * 6 + 1))
    return [int(arg)]


def one_trial(level, message, learned):
    """Returns True (win), False (no win) or None (the AI call failed)."""
    try:
        reply = guard.guard_reply(level, [], message, learned if level.get("learns") else None)
    except (guard.AIUnavailableError, guard.AITimeoutError):
        return None
    return (not is_blocked(level, reply)) and is_win(level, reply, message)


def main():
    ids = level_ids(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    # Several requests at once keep the GPU busy. Ollama queues what it cannot run in parallel.
    workers = int(os.environ.get("TRIAL_WORKERS", "6"))
    with open(os.path.join(ROOT, "levels", "attacks.json"), encoding="utf-8") as f:
        attacks = json.load(f)
    learned = attacks.get("_learned", [])
    problems = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
      for lid in ids:
        level = guard.load_level(os.path.join(ROOT, "levels", f"level_{lid}.json"))
        print(f"== Level {lid}: {level['title']} ({level.get('difficulty', '')})", flush=True)
        # submit every trial of every attack of this level at once, then collect
        jobs = [(a, [pool.submit(one_trial, level, a["message"], learned) for _ in range(n)]) for a in attacks[str(lid)]]
        for a, futures in jobs:
            results = [f.result() for f in futures]
            errors = results.count(None)
            wins = results.count(True)
            done = n - errors
            rate = wins / done if done else 0.0
            flag = ""
            if a["expect"] == "win" and rate < 0.6:
                flag = "  <-- TOO HARD"
            elif a["expect"] == "fail" and rate > 0.2:
                flag = "  <-- TOO EASY"
            if flag:
                problems.append((lid, a["name"], wins, done, a["expect"]))
            print(f"   {a['expect']:<4} {a['name']:<9} wins {wins}/{done}{flag}", flush=True)
    print("\nSUMMARY:", "all levels match expectations" if not problems else f"{len(problems)} problem(s)")
    for lid, name, wins, done, expect in problems:
        print(f"   level {lid}: '{name}' should {expect} but won {wins}/{done}")


if __name__ == "__main__":
    main()
