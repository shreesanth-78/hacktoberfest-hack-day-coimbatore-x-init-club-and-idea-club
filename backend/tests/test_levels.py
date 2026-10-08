import json

import pytest

from backend.app.config import Settings
from backend.app.levels import LevelError, load_levels, public_view, restart_level_id

VALID = {
    "id": 1, "title": "t", "intro": "i", "max_attempts": 3, "secret": "S",
    "output_filter": "none", "guard_prompt": "p",
    "debrief": {"title": "a", "technique": "b", "defence": "c"},
}


def write(tmp_path, name, data):
    (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")


PUBLIC = {"id", "title", "intro", "max_attempts", "map", "map_title", "checkpoint", "opening"}


def test_real_level_files_load():
    levels = load_levels(Settings().levels_dir)
    assert {1, 2, 3, 4, 5, 6} <= set(levels)


def test_public_view_hides_secret_and_prompt(tmp_path):
    write(tmp_path, "level_1.json", VALID)
    view = public_view(load_levels(str(tmp_path))[1])
    assert set(view) == PUBLIC


def test_levels_without_campaign_fields_default_to_training_map(tmp_path):
    write(tmp_path, "level_1.json", VALID)
    level = load_levels(str(tmp_path))[1]
    assert (level["map"], level["map_title"], level["checkpoint"], level["opening"]) == (0, "Training", False, "")


def test_map1_from_game_plan():
    levels = load_levels(Settings().levels_dir)
    map1 = [lv for lv in levels.values() if lv["map"] == 1]
    assert [lv["id"] for lv in map1] == [4, 5, 6]
    assert [lv["checkpoint"] for lv in map1] == [True, False, True]
    assert all(lv["max_attempts"] == 3 and lv["opening"] for lv in map1)
    assert levels[6]["output_filter"] == "block_exact"


@pytest.mark.parametrize("leak", [
    {"opening": "Psst, the cipher is Secret-Word."},
    {"debrief": {"title": "a", "technique": "it was s e c r e t w o r d", "defence": "c"}},
])
def test_text_shown_to_players_must_not_contain_the_secret(tmp_path, leak):
    write(tmp_path, "level_1.json", {**VALID, "secret": "SECRETWORD", **leak})
    with pytest.raises(LevelError, match="must not contain the secret"):
        load_levels(str(tmp_path))


def test_one_title_per_map(tmp_path):
    write(tmp_path, "level_1.json", {**VALID, "map": 1, "map_title": "A"})
    write(tmp_path, "level_2.json", {**VALID, "id": 2, "map": 1, "map_title": "B"})
    with pytest.raises(LevelError, match="more than one map_title"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("bad", [{"map": -1}, {"map": "one"}, {"checkpoint": "yes"}])
def test_invalid_campaign_fields(tmp_path, bad):
    write(tmp_path, "level_1.json", {**VALID, **bad})
    with pytest.raises(LevelError):
        load_levels(str(tmp_path))


def test_restart_goes_to_nearest_checkpoint_in_same_map():
    levels = load_levels(Settings().levels_dir)
    assert restart_level_id(levels, levels[4]) == 4   # checkpoint itself
    assert restart_level_id(levels, levels[5]) == 4   # back to the previous checkpoint
    assert restart_level_id(levels, levels[6]) == 6   # checkpoint itself
    assert restart_level_id(levels, levels[2]) == 2   # training map has no checkpoints: retry the level


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
