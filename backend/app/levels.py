"""Loads and validates the level files in levels/ (format: levels/README.md, docs/BACKEND_CAMPAIGN_SPEC.md)."""
import glob
import json
import os
import re

from .game import normalise

LEVELS_PER_KINGDOM = 6
CHECKPOINT_POSITION = 3
BOSS_POSITION = 6

REQUIRED_FIELDS = (
    "id", "title", "character", "setting", "intro", "opening", "hint",
    "max_attempts", "secret", "output_filter", "guard_prompt", "debrief",
    "kingdom", "kingdom_name", "domain", "position", "checkpoint", "boss", "learns", "difficulty",
)
DEBRIEF_FIELDS = ("title", "technique", "vulnerability", "defence")
OUTPUT_FILTERS = ("none", "block_exact")
PUBLIC_FIELDS = (
    "id", "title", "kingdom", "kingdom_name", "domain", "position", "checkpoint", "boss", "difficulty",
    "character", "setting", "intro", "opening", "max_attempts",
)  # never secret, guard_prompt, hint or learns


class LevelError(Exception):
    """A level file is missing or malformed."""


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _validate(level, path):
    missing = [f for f in REQUIRED_FIELDS if f not in level]
    if missing:
        raise LevelError(f"{path}: missing fields {missing}")
    match = re.fullmatch(r"level_(\d+)\.json", os.path.basename(path))
    if not match or int(match.group(1)) != level["id"]:
        raise LevelError(f"{path}: id {level['id']} does not match the file name")
    if level["output_filter"] not in OUTPUT_FILTERS:
        raise LevelError(f"{path}: output_filter must be one of {OUTPUT_FILTERS}")
    if not _is_int(level["max_attempts"]) or level["max_attempts"] < 1:
        raise LevelError(f"{path}: max_attempts must be a positive integer")
    if not str(level["secret"]).strip():
        raise LevelError(f"{path}: secret is empty")
    missing = [f for f in DEBRIEF_FIELDS if f not in level["debrief"]]
    if missing:
        raise LevelError(f"{path}: debrief is missing {missing}")

    kingdom, position = level["kingdom"], level["position"]
    if not _is_int(kingdom) or kingdom < 1:
        raise LevelError(f"{path}: kingdom must be a positive integer")
    if not _is_int(position) or not 1 <= position <= LEVELS_PER_KINGDOM:
        raise LevelError(f"{path}: position must be 1 to {LEVELS_PER_KINGDOM}")
    if level["id"] != (kingdom - 1) * LEVELS_PER_KINGDOM + position:
        raise LevelError(f"{path}: id must be (kingdom - 1) * {LEVELS_PER_KINGDOM} + position")
    for flag in ("checkpoint", "boss", "learns"):
        if not isinstance(level[flag], bool):
            raise LevelError(f"{path}: {flag} must be true or false")
    # The campaign rules key off these flags, so they must agree with the position.
    if level["checkpoint"] != (position == CHECKPOINT_POSITION):
        raise LevelError(f"{path}: checkpoint must be true exactly at position {CHECKPOINT_POSITION}")
    if level["boss"] != (position == BOSS_POSITION):
        raise LevelError(f"{path}: boss must be true exactly at position {BOSS_POSITION}")

    # The player sees the opening, the hint and the debrief (even after losing and respawning),
    # so none of them may contain the secret.
    secret = normalise(str(level["secret"]))
    shown = {"opening": level["opening"], "hint": level["hint"]}
    shown.update({f"debrief.{f}": level["debrief"][f] for f in DEBRIEF_FIELDS})
    for name, text in shown.items():
        if secret in normalise(str(text)):
            raise LevelError(f"{path}: {name} must not contain the secret")


def load_levels(levels_dir):
    """Return {level_id: level_dict} for every levels_dir/level_<id>.json, in numeric id order."""
    levels = {}
    for path in glob.glob(os.path.join(levels_dir, "level_*.json")):
        with open(path, encoding="utf-8") as f:
            try:
                level = json.load(f)
            except json.JSONDecodeError as e:
                raise LevelError(f"{path}: invalid JSON ({e})") from e
        _validate(level, path)
        levels[level["id"]] = level
    if not levels:
        raise LevelError(f"no level files found in {levels_dir}")
    names = {}
    for level in levels.values():
        if names.setdefault(level["kingdom"], level["kingdom_name"]) != level["kingdom_name"]:
            raise LevelError(f"level {level['id']}: kingdom {level['kingdom']} has more than one kingdom_name")
    # File names sort as text (level_1, level_10, level_11, ...), so sort by id explicitly.
    return dict(sorted(levels.items()))


def public_view(level):
    """The fields that may be sent to the browser."""
    return {k: level[k] for k in PUBLIC_FIELDS}
