"""Campaign rules (docs/BACKEND_CAMPAIGN_SPEC.md): one browser's run through the kingdoms.

Pure functions: they decide what changes; backend/app/db.py stores it in one transaction.
The three team decisions from the spec are the constants below.
"""
CHECKPOINT_BONUS = 500
KINGDOM_BONUS = 1000            # spec: TBC with the team
RESPAWN_AFTER_CHECKPOINT = True  # spec question 1: False would replay the checkpoint level itself


def first_level_id(levels):
    return min(levels)


def _next_level_id(levels, level_id):
    later = [i for i in levels if i > level_id]
    return min(later) if later else None


def _first_of_kingdom(levels, kingdom):
    return min(i for i, lv in levels.items() if lv["kingdom"] == kingdom)


def on_win(levels, level, checkpoint_level_id):
    """What a win on the campaign's current level changes."""
    bonuses = {"checkpoint": 0, "kingdom": 0}
    checkpoint_reached = kingdom_cleared = False
    if level["checkpoint"] and checkpoint_level_id != level["id"]:
        checkpoint_level_id = level["id"]
        bonuses["checkpoint"] = CHECKPOINT_BONUS
        checkpoint_reached = True
    if level["boss"]:
        bonuses["kingdom"] = KINGDOM_BONUS
        kingdom_cleared = True
        checkpoint_level_id = None  # the next kingdom starts without a checkpoint
    next_id = _next_level_id(levels, level["id"])
    return {
        "next_level_id": next_id,
        "checkpoint_level_id": checkpoint_level_id,
        "bonuses": bonuses,
        "checkpoint_reached": checkpoint_reached,
        "kingdom_cleared": kingdom_cleared,
        "campaign_completed": next_id is None,
    }


def respawn_level_id(levels, level, checkpoint_level_id):
    """Where the player restarts after losing `level` (3 strikes)."""
    has_checkpoint = (
        checkpoint_level_id is not None
        and levels[checkpoint_level_id]["kingdom"] == level["kingdom"]
        and checkpoint_level_id <= level["id"]
    )
    if not has_checkpoint:
        return _first_of_kingdom(levels, level["kingdom"])
    if RESPAWN_AFTER_CHECKPOINT:
        return min(_next_level_id(levels, checkpoint_level_id), level["id"])
    return checkpoint_level_id


def on_loss(levels, level, checkpoint_level_id):
    """What a loss on the campaign's current level changes. Wins in this kingdom from the
    respawn level on are discarded, so the boss only learns from wins the player kept."""
    respawn = respawn_level_id(levels, level, checkpoint_level_id)
    return {
        "next_level_id": respawn,
        "checkpoint_level_id": checkpoint_level_id,
        "discard_wins_from": respawn,
    }


def cleared_level_ids(levels, current_level_id, completed):
    return [i for i in levels if i < current_level_id or completed]
