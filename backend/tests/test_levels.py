import json

import pytest

from backend.app.config import Settings
from backend.app.levels import LevelError, load_levels, public_view

VALID = {
    "id": 1, "title": "t", "intro": "i", "max_attempts": 3, "secret": "S",
    "output_filter": "none", "guard_prompt": "p",
    "debrief": {"title": "a", "technique": "b", "defence": "c"},
}


def write(tmp_path, name, data):
    (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")


def test_real_level_files_load():
    levels = load_levels(Settings().levels_dir)
    assert {1, 2, 3} <= set(levels)


def test_public_view_hides_secret_and_prompt():
    view = public_view(VALID)
    assert set(view) == {"id", "title", "intro", "max_attempts"}


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
