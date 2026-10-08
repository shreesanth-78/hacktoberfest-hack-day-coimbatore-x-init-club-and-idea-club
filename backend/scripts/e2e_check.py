"""End-to-end check of a running backend, through its HTTP API only.

Plays every attack in levels/attacks.json against the backend and reports what happened,
then plays the campaign (POST /api/campaigns) as one browser player. Use it to confirm the
real model works through the real backend (for example on the AI owner's laptop).

Start the backend first, then from the repository root:
    python backend/scripts/e2e_check.py                       # http://localhost:8000
    python backend/scripts/e2e_check.py --base http://10.0.0.5:8000 --trials 3 --levels 6

Standard library only. Exit code: 0 if every request worked (wins and losses are just
reported), 1 if any request failed (including AI errors 502/504), 2 if the guard is not ready.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ATTACKS_FILE = os.path.join(ROOT, "levels", "attacks.json")


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.failures = 0

    def call(self, method, path, body=None):
        """Return (status, json). Network errors count as failures and return (None, None)."""
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.status, json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read() or b"null")
            except ValueError:
                return e.code, None
        except (urllib.error.URLError, OSError) as e:
            print(f"  ! cannot reach {self.base}{path}: {e}")
            self.failures += 1
            return None, None

    def expect(self, status, got, body, what):
        if got != status:
            print(f"  ! {what}: expected HTTP {status}, got {got}: {body}")
            self.failures += 1
            return False
        return True


def level_attacks(attacks, level_id):
    """Attacks for a level as dicts {message, expect, name}. Plain strings (older format) count as "info"."""
    out = []
    for item in attacks.get(str(level_id), []):
        if isinstance(item, dict):
            out.append({"message": item["message"], "expect": item.get("expect", "info"), "name": item.get("name", "")})
        else:
            out.append({"message": item, "expect": "info", "name": ""})
    return out


def matches(expect, wins, tries):
    """Same thresholds as tools/level_trials.py: an intended trick wins at least 60% of tries,
    a plain or earlier trick at most 20%."""
    if not tries or expect == "info":
        return True
    rate = wins / tries
    return rate >= 0.6 if expect == "win" else rate <= 0.2


def short(text, n=70):
    text = " ".join(str(text).split())
    return text if len(text) <= n else text[: n - 3] + "..."


def send(api, session_id, message):
    start = time.monotonic()
    status, body = api.call("POST", f"/api/sessions/{session_id}/messages", {"message": message})
    return status, body, time.monotonic() - start


def check_ready(api):
    status, body = api.call("GET", "/api/health")
    if not api.expect(200, status, body, "GET /api/health"):
        return False
    status, body = api.call("GET", "/api/health/ai")
    if status != 200:
        reason = (body or {}).get("error", {}).get("message", body)
        print(f"Guard not ready: {reason}")
        return False
    where = f"{body['model']} at {body['host']}" if body["mode"] == "ollama" else "stub replies"
    print(f"Backend OK. Guard mode: {body['mode']} ({where})")
    return True


def run_attacks(api, levels, attacks, trials):
    """Free-play sessions, so learning bosses face these attacks without learned tactics."""
    print("\n== Attacks (one fresh free-play session per try) ==")
    mismatches = 0
    for level in levels:
        for attack in level_attacks(attacks, level["id"]):
            message = attack["message"]
            outcomes, times = [], []
            for _ in range(trials):
                status, body = api.call("POST", "/api/sessions",
                                        {"level_id": level["id"], "player_name": "e2e-check"})
                if not api.expect(201, status, body, f"start level {level['id']}"):
                    continue
                status, body, secs = send(api, body["session_id"], message)
                if not api.expect(200, status, body, f"message on level {level['id']}"):
                    continue
                times.append(secs)
                outcomes.append("WIN" if body["status"] == "won" else "-")
            wins = outcomes.count("WIN")
            avg = f"{sum(times) / len(times):.1f}s" if times else "n/a"
            ok = matches(attack["expect"], wins, len(outcomes))
            mismatches += not ok
            flag = "" if ok else "  <-- not as expected"
            print(f"L{level['id']} {attack['expect']:<4} {attack['name']:<10} wins {wins}/{trials}  avg {avg}{flag}"
                  f"  | {short(message, 50)}")
    print(f"Attacks not as expected: {mismatches} (the model varies; use --trials 3 or more before tuning)")


def run_campaign(api, levels, attacks, max_levels):
    print("\n== Campaign as one browser player ==")
    status, body = api.call("POST", "/api/campaigns", {"player_name": "e2e-check"})
    if not api.expect(201, status, body, "POST /api/campaigns"):
        return
    campaign_id = body["campaign_id"]
    for _ in range(max_levels):
        status, body = api.call("POST", f"/api/campaigns/{campaign_id}/sessions")
        if status == 409:
            break  # campaign completed
        if not api.expect(201, status, body, "enter the current level"):
            break
        level_id, session_id, result = body["level_id"], body["session_id"], None
        tricks = sorted(level_attacks(attacks, level_id), key=lambda a: a["expect"] != "win")  # intended trick first
        for message in [a["message"] for a in tricks][: body["attempts_remaining"]]:
            status, result, _ = send(api, session_id, message)
            if not api.expect(200, status, result, f"message on level {level_id}"):
                result = None
                break
            if result["status"] != "in_progress":
                break
        if result is None or result["campaign"] is None:
            print(f"L{level_id}: not finished with the stored attacks (no more attacks to try), stopping")
            break
        c = result["campaign"]
        flags = [name for name in ("checkpoint_reached", "kingdom_cleared", "campaign_completed") if c[name]]
        print(f"L{level_id}: {c['outcome']} (level {c['level_score']}, total {c['total_score']}, next "
              f"{c['next_level_id']}{', ' + ', '.join(flags) if flags else ''}) | {short(result['reply'])}")
        if c["outcome"] == "lost":
            break
    status, body = api.call("GET", f"/api/campaigns/{campaign_id}")
    if api.expect(200, status, body, "GET campaign"):
        print(f"Campaign: {body['status']}, level {body['current_level_id']} (kingdom {body['current_kingdom']}), "
              f"cleared {len(body['cleared_level_ids'])}, total score {body['total_score']}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="http://localhost:8000", help="backend base URL")
    parser.add_argument("--trials", type=int, default=1, help="tries per attack message")
    parser.add_argument("--levels", type=int, default=0, help="only the first N levels (0 = all)")
    args = parser.parse_args(argv)

    api = Client(args.base)
    if not check_ready(api):
        return 2
    status, body = api.call("GET", "/api/levels")
    if not api.expect(200, status, body, "GET /api/levels"):
        return 1
    levels = sorted(body["levels"], key=lambda lv: lv["id"])
    if args.levels:
        levels = levels[: args.levels]
    with open(ATTACKS_FILE, encoding="utf-8") as f:
        attacks = json.load(f)

    run_attacks(api, levels, attacks, args.trials)
    run_campaign(api, levels, attacks, len(levels))

    print(f"\n{'All requests worked.' if api.failures == 0 else f'{api.failures} request(s) failed.'}")
    return 0 if api.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
