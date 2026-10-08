"""Loads and validates the level files in levels/ (format: levels/README.md)."""
import glob
import json
import os
import re

REQUIRED_FIELDS = ("id", "title", "intro", "max_attempts", "secret", "output_filter", "guard_prompt", "debrief")
DEBRIEF_FIELDS = ("title", "technique", "defence")
OUTPUT_FILTERS = ("none", "block_exact")
PUBLIC_FIELDS = ("id", "title", "intro", "max_attempts")


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


def load_levels(levels_dir):
    """Return {level_id: level_dict} for every levels_dir/level_<id>.json."""
    levels = {}
    for path in sorted(glob.glob(os.path.join(levels_dir, "level_*.json"))):
        with open(path, encoding="utf-8") as f:
            try:
                level = json.load(f)
            except json.JSONDecodeError as e:
                raise LevelError(f"{path}: invalid JSON ({e})") from e
        _validate(level, path)
        levels[level["id"]] = level
    if not levels:
        raise LevelError(f"no level files found in {levels_dir}")
    return levels


def public_view(level):
    """The fields that may be sent to the browser. Never the secret or the guard prompt."""
    return {k: level[k] for k in PUBLIC_FIELDS}
