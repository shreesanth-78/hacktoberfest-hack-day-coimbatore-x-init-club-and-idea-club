"""Game rules: output filter, win check and scoring.

Implements the rules in levels/README.md (reference version: tools/smoke_test.py).
"""
import re

BLOCKED_NOTICE = "[Message blocked by the bank's security filter]"


def normalise(text):
    """Lowercase and keep only letters and digits."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def is_blocked(level, reply):
    """True if the level filters exact matches and the reply says the secret as a whole word."""
    if level.get("output_filter") != "block_exact":
        return False
    pattern = r"\b" + re.escape(level["secret"]) + r"\b"
    return re.search(pattern, reply, re.IGNORECASE) is not None


def is_win(level, reply):
    """True if the normalised reply contains the secret, forwards or reversed."""
    text = normalise(reply)
    secret = normalise(level["secret"])
    return secret in text or secret[::-1] in text


def score(max_attempts, attempts_used):
    """Fewer attempts give a higher score. Placeholder formula, same as tools/dev_server.py."""
    return 10 * (max_attempts - attempts_used + 1)
