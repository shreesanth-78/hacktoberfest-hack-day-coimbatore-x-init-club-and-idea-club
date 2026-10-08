"""Loads and validates the level files in levels/ (format: levels/README.md)."""
import glob
import json
import os
import re

from .game import normalise

REQUIRED_FIELDS = ("id", "title", "intro", "max_attempts", "secret", "output_filter", "guard_prompt", "debrief")
DEBRIEF_FIELDS = ("title", "technique", "defence")
OUTPUT_FILTERS = ("none", "block_exact")
PUBLIC_FIELDS = ("id", "title", "intro", "max_attempts", "map", "map_title", "checkpoint", "opening")

# Optional campaign fields. Levels without them belong to map 0, "Training".
OPTIONAL_DEFAULTS = {"map": 0, "map_title": "Training", "checkpoint": False, "opening": ""}


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
    if not isinstance(level["map"], int) or level["map"] < 0:
        raise LevelError(f"{path}: map must be a non-negative integer")
    if not isinstance(level["checkpoint"], bool):
        raise LevelError(f"{path}: checkpoint must be true or false")
    # Players see the opening at the start and the debrief even after losing, so neither may leak the secret.
    secret = normalise(str(level["secret"]))
    if secret in normalise(level["opening"]):
        raise LevelError(f"{path}: opening must not contain the secret")
    if any(secret in normalise(level["debrief"][f]) for f in DEBRIEF_FIELDS):
        raise LevelError(f"{path}: debrief must not contain the secret")


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
    titles = {}
    for level in levels.values():
        if titles.setdefault(level["map"], level["map_title"]) != level["map_title"]:
            raise LevelError(f"level {level['id']}: map {level['map']} has more than one map_title")
    return levels


def restart_level_id(levels, level):
    """Where a player who lost `level` restarts: the nearest checkpoint at or before it
    in the same map, or the same level if the map has no earlier checkpoint."""
    checkpoints = [
        lv["id"] for lv in levels.values()
        if lv["map"] == level["map"] and lv["checkpoint"] and lv["id"] <= level["id"]
    ]
    return max(checkpoints) if checkpoints else level["id"]


def public_view(level):
    """The fields that may be sent to the browser. Never the secret or the guard prompt."""
    return {k: level[k] for k in PUBLIC_FIELDS}
