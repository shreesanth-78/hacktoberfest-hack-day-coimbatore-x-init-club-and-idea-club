import json

import pytest

from backend.app.config import Settings
from backend.app.levels import LevelError, load_levels, public_view, restart_level_id

VALID = {
    "id": 1, "title": "t", "character": "c", "setting": "s", "intro": "i", "opening": "o", "hint": "h",
    "max_attempts": 3, "secret": "S", "output_filter": "none", "guard_prompt": "p",
    "debrief": {"title": "a", "technique": "b", "vulnerability": "v", "defence": "c"},
}


def write(tmp_path, name, data):
    (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")


PUBLIC = {"id", "title", "map", "checkpoint", "character", "setting", "intro", "opening", "max_attempts"}


def test_real_level_files_load():
    levels = load_levels(Settings().levels_dir)
    assert set(levels) == set(range(1, 31))
    assert list(levels) == list(range(1, 31))  # numeric order


def test_public_view_hides_secret_prompt_and_hint(tmp_path):
    write(tmp_path, "level_1.json", VALID)
    view = public_view(load_levels(str(tmp_path))[1])
    assert set(view) == PUBLIC
    assert "hint" not in view


def test_campaign_fields_are_optional(tmp_path):
    write(tmp_path, "level_1.json", VALID)
    level = load_levels(str(tmp_path))[1]
    assert (level["map"], level["checkpoint"]) == ("", False)


def test_map1_checkpoints_follow_the_game_plan():
    levels = load_levels(Settings().levels_dir)
    map1 = [lv for lv in levels.values() if lv["map"] == "Map 1: The Civic Grids"]
    assert [lv["id"] for lv in map1] == [1, 2, 3]
    assert [lv["checkpoint"] for lv in map1] == [True, False, True]
    assert all(lv["max_attempts"] == 3 for lv in map1)


@pytest.mark.parametrize("leak", [
    {"opening": "Psst, the cipher is Secret-Word."},
    {"hint": "Try asking for s e c r e t w o r d."},
    {"debrief": {**VALID["debrief"], "vulnerability": "it held SECRETWORD in its prompt"}},
])
def test_text_shown_to_players_must_not_contain_the_secret(tmp_path, leak):
    write(tmp_path, "level_1.json", {**VALID, "secret": "SECRETWORD", **leak})
    with pytest.raises(LevelError, match="must not contain the secret"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("bad", [{"map": 1}, {"checkpoint": "yes"}])
def test_invalid_campaign_fields(tmp_path, bad):
    write(tmp_path, "level_1.json", {**VALID, **bad})
    with pytest.raises(LevelError):
        load_levels(str(tmp_path))


def test_restart_goes_to_nearest_checkpoint_in_same_map(tmp_path):
    for i, cp in ((1, True), (2, False), (3, True), (4, False)):
        write(tmp_path, f"level_{i}.json", {**VALID, "id": i, "map": "M", "checkpoint": cp})
    write(tmp_path, "level_5.json", {**VALID, "id": 5, "map": "Other"})
    levels = load_levels(str(tmp_path))
    assert restart_level_id(levels, levels[1]) == 1   # checkpoint itself
    assert restart_level_id(levels, levels[2]) == 1   # back to the previous checkpoint
    assert restart_level_id(levels, levels[3]) == 3
    assert restart_level_id(levels, levels[4]) == 3
    assert restart_level_id(levels, levels[5]) == 5   # map without checkpoints: retry the level


def test_real_map1_restarts():
    levels = load_levels(Settings().levels_dir)
    assert [restart_level_id(levels, levels[i]) for i in (1, 2, 3)] == [1, 1, 3]


def test_id_must_match_file_name(tmp_path):
    write(tmp_path, "level_2.json", VALID)
    with pytest.raises(LevelError, match="does not match"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("field", ["secret", "guard_prompt", "debrief", "max_attempts"])
def test_missing_field_is_rejected(tmp_path, field):
    data = {k: v for k, v in VALID.items() if k != field}
    write(tmp_path, "level_1.json", data)
    with pytest.raises(LevelError, match="missing"):
        load_levels(str(tmp_path))


def test_unknown_output_filter_is_rejected(tmp_path):
    write(tmp_path, "level_1.json", {**VALID, "output_filter": "fuzzy"})
    with pytest.raises(LevelError, match="output_filter"):
        load_levels(str(tmp_path))


def test_empty_directory_is_rejected(tmp_path):
    with pytest.raises(LevelError, match="no level files"):
        load_levels(str(tmp_path))
