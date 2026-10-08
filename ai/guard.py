"""AI module: asks the local model to play the guard.

Public interface (agreed with the backend owner):

    guard_reply(level, history, user_message) -> str

`level` is the dict loaded from levels/level_<id>.json.
`history` is a list of {"role": "user" | "assistant", "content": str}.
Raises AIUnavailableError or AITimeoutError on failure.

Uses only the standard library and Ollama's local HTTP API.
Set GUARD_STUB=1 to return canned replies without a model (for development).
"""
import json
import os
import socket
import urllib.error
import urllib.request

MAX_REPLY_TOKENS = 80  # keeps replies short and fast (team design: num_predict 80)


class AIUnavailableError(Exception):
    """Ollama is unreachable, or returned something unusable."""


class AITimeoutError(Exception):
    """The model did not answer within the timeout."""


def load_level(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _stub_reply(level, user_message):
    return f"[stub] Gus here. You said: {user_message[:80]}"


def guard_reply(level, history, user_message):
    if os.environ.get("GUARD_STUB") == "1":
        return _stub_reply(level, user_message)

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "")
    timeout = float(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "60"))
    if not model:
        raise AIUnavailableError("OLLAMA_MODEL is not set")

    messages = [{"role": "system", "content": level["guard_prompt"]}]
    messages += list(history)
    messages.append({"role": "user", "content": user_message})
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": False,
        "think": False,  # Gemma 4 can spend the whole token budget thinking and return no reply
        "options": {"num_predict": MAX_REPLY_TOKENS},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{host}/api/chat", data=payload, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (socket.timeout, TimeoutError) as e:
        raise AITimeoutError("model timed out") from e
    except urllib.error.URLError as e:
        if isinstance(e.reason, (socket.timeout, TimeoutError)):
            raise AITimeoutError("model timed out") from e
        raise AIUnavailableError(f"cannot reach Ollama at {host}") from e
    except (ValueError, OSError) as e:
        raise AIUnavailableError("invalid response from Ollama") from e

    reply = (data.get("message") or {}).get("content", "").strip()
    if not reply:
        raise AIUnavailableError("empty reply from model")
    return reply
