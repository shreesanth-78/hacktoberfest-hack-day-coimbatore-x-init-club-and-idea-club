"""Loads and validates the level files in levels/ (format: levels/README.md)."""
import glob
import json
import os
import re

from .game import normalise

REQUIRED_FIELDS = (
    "id", "title", "character", "setting", "intro", "opening", "hint",
    "max_attempts", "secret", "output_filter", "guard_prompt", "debrief",
)
DEBRIEF_FIELDS = ("title", "technique", "vulnerability", "defence")
OUTPUT_FILTERS = ("none", "block_exact")
PUBLIC_FIELDS = ("id", "title", "map", "checkpoint", "character", "setting", "intro", "opening", "max_attempts")

# Optional campaign fields. `map` is the map's display name and groups levels for checkpoints.
OPTIONAL_DEFAULTS = {"map": "", "checkpoint": False}


class LevelError(Exception):
    """A level file is missing or malformed."""


def _validate(level, path):
    missing = [f for f in REQUIRED_FIELDS if f not in level]
    if missing:
        raise LevelError(f"{path}: missing fields {missing}")
    match = re.fullmatch(r"level_(\d+)\.json", os.path.basename(path))
    if not match or int(match.group(1)) != level["id"]:
        raise LevelError(f"{path}: id {level['id']} does not match the file name")
    if level["output_filter"] not in OUTPUT_FILTERS:
        raise LevelError(f"{path}: output_filter must be one of {OUTPUT_FILTERS}")
    if not isinstance(level["max_attempts"], int) or level["max_attempts"] < 1:
        raise LevelError(f"{path}: max_attempts must be a positive integer")
    if not str(level["secret"]).strip():
        raise LevelError(f"{path}: secret is empty")
    missing = [f for f in DEBRIEF_FIELDS if f not in level["debrief"]]
    if missing:
        raise LevelError(f"{path}: debrief is missing {missing}")
    if not isinstance(level["map"], str):
        raise LevelError(f"{path}: map must be a string")
    if not isinstance(level["checkpoint"], bool):
        raise LevelError(f"{path}: checkpoint must be true or false")
    # The player sees the opening, the hint and the debrief (even after losing and restarting),
    # so none of them may contain the secret.
    secret = normalise(str(level["secret"]))
    shown = {"opening": level["opening"], "hint": level["hint"]}
    shown.update({f"debrief.{f}": level["debrief"][f] for f in DEBRIEF_FIELDS})
    for name, text in shown.items():
        if secret in normalise(str(text)):
            raise LevelError(f"{path}: {name} must not contain the secret")


def load_levels(levels_dir):
    """Return {level_id: level_dict} for every levels_dir/level_<id>.json."""
    levels = {}
    for path in sorted(glob.glob(os.path.join(levels_dir, "level_*.json"))):
        with open(path, encoding="utf-8") as f:
            try:
                level = json.load(f)
            except json.JSONDecodeError as e:
                raise LevelError(f"{path}: invalid JSON ({e})") from e
        level = {**OPTIONAL_DEFAULTS, **level}
        _validate(level, path)
        levels[level["id"]] = level
    if not levels:
        raise LevelError(f"no level files found in {levels_dir}")
    # File names sort as text (level_1, level_10, level_11, ...), so sort by id explicitly.
    return dict(sorted(levels.items()))


def restart_level_id(levels, level):
    """Where a player who lost `level` restarts: the nearest checkpoint at or before it
    in the same map, or the same level if the map has no earlier checkpoint."""
    checkpoints = [
        lv["id"] for lv in levels.values()
        if lv["map"] == level["map"] and lv["checkpoint"] and lv["id"] <= level["id"]
    ]
    return max(checkpoints) if checkpoints else level["id"]


def public_view(level):
    """The fields that may be sent to the browser. Never the secret, the guard prompt or the hint."""
    return {k: level[k] for k in PUBLIC_FIELDS}
