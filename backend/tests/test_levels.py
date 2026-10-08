import json

import pytest

from backend.app.config import Settings
from backend.app.levels import LevelError, load_levels, public_view

VALID = {
    "id": 1, "title": "t", "character": "c", "setting": "s", "intro": "i", "opening": "o", "hint": "h",
    "max_attempts": 3, "secret": "S", "output_filter": "none", "guard_prompt": "p",
    "debrief": {"title": "a", "technique": "b", "vulnerability": "v", "defence": "c"},
    "kingdom": 1, "kingdom_name": "K", "domain": "D", "position": 1,
    "checkpoint": False, "boss": False, "learns": False, "difficulty": "Rookie",
}
PUBLIC = {"id", "title", "kingdom", "kingdom_name", "domain", "position", "checkpoint", "boss", "difficulty",
          "character", "setting", "intro", "opening", "max_attempts"}


def write(tmp_path, name, data):
    (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")


def level_at(kingdom, position, **extra):
    return {**VALID, "id": (kingdom - 1) * 6 + position, "kingdom": kingdom, "position": position,
            "checkpoint": position == 3, "boss": position == 6, "learns": position == 6, **extra}


def test_real_level_files_load_in_numeric_order():
    levels = load_levels(Settings().levels_dir)
    assert list(levels) == list(range(1, 31))  # not file-name order (1, 10, 11, ...)


def test_real_levels_follow_the_kingdom_layout():
    levels = load_levels(Settings().levels_dir)
    assert [i for i, lv in levels.items() if lv["checkpoint"]] == [3, 9, 15, 21, 27]
    assert [i for i, lv in levels.items() if lv["boss"]] == [6, 12, 18, 24, 30]
    assert all(lv["learns"] == lv["boss"] for lv in levels.values())
    assert len({lv["kingdom_name"] for lv in levels.values()}) == 5
    assert all(lv["max_attempts"] == 3 for lv in levels.values())


def test_public_view_hides_secret_prompt_hint_and_learns(tmp_path):
    write(tmp_path, "level_1.json", VALID)
    view = public_view(load_levels(str(tmp_path))[1])
    assert set(view) == PUBLIC


def test_id_must_match_file_name(tmp_path):
    write(tmp_path, "level_2.json", VALID)
    with pytest.raises(LevelError, match="does not match"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("field", ["secret", "guard_prompt", "debrief", "max_attempts", "kingdom", "position", "learns"])
def test_missing_field_is_rejected(tmp_path, field):
    write(tmp_path, "level_1.json", {k: v for k, v in VALID.items() if k != field})
    with pytest.raises(LevelError, match="missing"):
        load_levels(str(tmp_path))


def test_id_must_follow_kingdom_and_position(tmp_path):
    write(tmp_path, "level_8.json", level_at(2, 2))  # (2 - 1) * 6 + 2 = 8
    assert list(load_levels(str(tmp_path))) == [8]
    write(tmp_path, "level_8.json", {**level_at(2, 2), "position": 1})  # would be id 7
    with pytest.raises(LevelError, match=r"\(kingdom - 1\) \* 6 \+ position"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("bad, match", [
    ({"position": 7}, "position must be 1 to 6"),
    ({"position": 0}, "position must be 1 to 6"),
    ({"kingdom": 0}, "kingdom must be a positive integer"),
    ({"learns": "yes"}, "learns must be true or false"),
    ({"checkpoint": True}, "checkpoint must be true exactly at position 3"),
    ({"boss": True}, "boss must be true exactly at position 6"),
])
def test_invalid_campaign_fields(tmp_path, bad, match):
    write(tmp_path, "level_1.json", {**VALID, **bad})
    with pytest.raises(LevelError, match=match):
        load_levels(str(tmp_path))


def test_one_name_per_kingdom(tmp_path):
    write(tmp_path, "level_1.json", level_at(1, 1, kingdom_name="A"))
    write(tmp_path, "level_2.json", level_at(1, 2, kingdom_name="B"))
    with pytest.raises(LevelError, match="more than one kingdom_name"):
        load_levels(str(tmp_path))


def test_unknown_output_filter_is_rejected(tmp_path):
    write(tmp_path, "level_1.json", {**VALID, "output_filter": "fuzzy"})
    with pytest.raises(LevelError, match="output_filter"):
        load_levels(str(tmp_path))


@pytest.mark.parametrize("leak", [
    {"opening": "Psst, the cipher is Secret-Word."},
    {"hint": "Try asking for s e c r e t w o r d."},
    {"debrief": {**VALID["debrief"], "vulnerability": "it held SECRETWORD in its prompt"}},
])
def test_text_shown_to_players_must_not_contain_the_secret(tmp_path, leak):
    write(tmp_path, "level_1.json", {**VALID, "secret": "SECRETWORD", **leak})
    with pytest.raises(LevelError, match="must not contain the secret"):
        load_levels(str(tmp_path))


def test_empty_directory_is_rejected(tmp_path):
    with pytest.raises(LevelError, match="no level files"):
        load_levels(str(tmp_path))
