"""End-to-end check of a running backend, through its HTTP API only.

Plays every attack in levels/attacks.json against the backend and reports what happened,
then plays the campaign as one browser player to check progress. Use it to confirm the
real model works through the real backend (for example on the AI owner's laptop).

Start the backend first, then from the repository root:
    python backend/scripts/e2e_check.py                       # http://localhost:8000
    python backend/scripts/e2e_check.py --base http://10.0.0.5:8000 --trials 3

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
    print("\n== Attacks (one fresh session per try) ==")
    for level in levels:
        for message in attacks.get(str(level["id"]), []):
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
            print(f"L{level['id']} wins {wins}/{trials}  avg {avg}  | {short(message)}")


def run_campaign(api, levels, attacks):
    print("\n== Campaign as one browser player ==")
    status, body = api.call("POST", "/api/players")
    if not api.expect(201, status, body, "POST /api/players"):
        return
    player_id = body["player_id"]
    for level in levels:
        status, body = api.call("POST", "/api/sessions", {
            "level_id": level["id"], "player_name": "e2e-check", "player_id": player_id})
        if status == 409:
            print(f"L{level['id']}: locked (an earlier level was not cleared), stopping")
            break
        if not api.expect(201, status, body, f"start level {level['id']}"):
            break
        session_id, result = body["session_id"], None
        for message in attacks.get(str(level["id"]), []):
            status, result, _ = send(api, session_id, message)
            if not api.expect(200, status, result, f"message on level {level['id']}"):
                result = None
                break
            if result["status"] != "in_progress":
                break
        if result is None:
            break
        extra = f", restart at L{result['restart_level_id']}" if result["status"] == "lost" else ""
        print(f"L{level['id']}: {result['status']} (score {result['score']}{extra}) | {short(result['reply'])}")
        if result["status"] != "won":
            break
    status, body = api.call("GET", f"/api/players/{player_id}/progress")
    if api.expect(200, status, body, "GET progress"):
        states = " ".join(f"L{lv['level_id']}:{lv['status']}" for lv in body["levels"])
        print(f"Progress: {states} | campaign score {body['campaign_score']} | completed {body['completed']}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="http://localhost:8000", help="backend base URL")
    parser.add_argument("--trials", type=int, default=1, help="tries per attack message")
    args = parser.parse_args(argv)

    api = Client(args.base)
    if not check_ready(api):
        return 2
    status, body = api.call("GET", "/api/levels")
    if not api.expect(200, status, body, "GET /api/levels"):
        return 1
    levels = sorted(body["levels"], key=lambda lv: lv["id"])
    with open(ATTACKS_FILE, encoding="utf-8") as f:
        attacks = json.load(f)

    run_attacks(api, levels, attacks, args.trials)
    run_campaign(api, levels, attacks)

    print(f"\n{'All requests worked.' if api.failures == 0 else f'{api.failures} request(s) failed.'}")
    return 0 if api.failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
