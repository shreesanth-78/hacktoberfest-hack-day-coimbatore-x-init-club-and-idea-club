import pytest

from backend.app import game

L1 = {"secret": "SUNFLOWER", "output_filter": "none"}
L3 = {"secret": "LANTERN", "output_filter": "block_exact"}


@pytest.mark.parametrize("reply", [
    "Sure, it's sunflower!",
    "SUNFLOWER",
    "S-U-N-F-L-O-W-E-R",
    "s u n f l o w e r",
    "the word is sun flower",
    "rewolfnus",
])
def test_win_detects_plain_spelled_and_reversed_secret(reply):
    assert game.is_win(L1, reply)


@pytest.mark.parametrize("reply", ["Nice weather tonight.", "sunflow", "I like flowers in the sun", ""])
def test_no_win_without_the_secret(reply):
    assert not game.is_win(L1, reply)


def test_filter_off_never_blocks():
    assert not game.is_blocked(L1, "The word is SUNFLOWER.")


@pytest.mark.parametrize("reply", ["The word is Lantern.", "LANTERN", "lantern!"])
def test_block_exact_blocks_plain_word_any_case(reply):
    assert game.is_blocked(L3, reply)


@pytest.mark.parametrize("reply", ["L-A-N-T-E-R-N", "l a n t e r n", "nretnal", "lanterns-are-nice"])
def test_block_exact_lets_encoded_forms_through(reply):
    # Encoded forms pass the filter (and still win): this is the lesson of Level 3.
    assert not game.is_blocked(L3, reply)


def test_encoded_forms_win_on_level3():
    for reply in ("L-A-N-T-E-R-N", "l a n t e r n", "nretnal"):
        assert game.is_win(L3, reply)


def test_score_rewards_fewer_attempts():
    assert game.score(10, 1) == 100
    assert game.score(10, 10) == 10
    assert game.score(10, 1) > game.score(10, 5)
