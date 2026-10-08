"""Per-browser campaign progress rules.

Each player has a frontier: the furthest level they may play. Levels before it are cleared,
the frontier itself is unlocked, and later levels are locked.
  - Winning the frontier level moves the frontier to the next level.
  - Losing the frontier level moves it back to that level's checkpoint (see levels.restart_level_id).
  - Replaying an earlier level never moves the frontier.
"""
from .levels import restart_level_id


def first_level_id(levels):
    return min(levels)


def next_level_id(levels, level_id):
    """The level after level_id. After the last level it is last + 1, which reads as 'campaign
    complete' and automatically becomes the next level if more levels are added later."""
    later = [i for i in levels if i > level_id]
    return min(later) if later else level_id + 1


def new_frontier(levels, frontier, level, status):
    """The frontier after a finished level, or None if it does not change."""
    if level["id"] != frontier or status == "in_progress":
        return None
    if status == "won":
        return next_level_id(levels, level["id"])
    return restart_level_id(levels, level)


def is_unlocked(frontier, level_id):
    return level_id <= frontier


def summary(levels, frontier, best_scores):
    """Progress view for the API. best_scores maps level_id -> best winning score."""
    rows = []
    for level_id in sorted(levels):
        if level_id < frontier:
            status = "cleared"
        elif level_id == frontier:
            status = "unlocked"
        else:
            status = "locked"
        rows.append({"level_id": level_id, "status": status, "best_score": best_scores.get(level_id)})
    completed = frontier > max(levels)
    return {
        "current_level_id": None if completed else frontier,
        "completed": completed,
        "campaign_score": sum(r["best_score"] or 0 for r in rows if r["status"] == "cleared"),
        "levels": rows,
    }
