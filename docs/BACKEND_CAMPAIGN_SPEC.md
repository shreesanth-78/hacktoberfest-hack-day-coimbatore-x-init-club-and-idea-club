# Backend spec: the 30-level campaign (for Aditya)

Status: **proposal from the AI owner (Mudiam). Aditya reviews and changes anything that does not fit.** Everything below is additive: the free-play endpoints that already exist keep working.

## 1. The game structure

- **30 levels = 5 kingdoms x 6 levels.** Level id = `(kingdom - 1) * 6 + position`. Kingdom 1 is levels 1 to 6, kingdom 2 is 7 to 12, and so on.
- **Difficulty rises inside each kingdom and the same ladder repeats in every kingdom** (position 1 to 6): very basic, easy, medium (checkpoint), hard, harder, boss. Details in `levels/README.md`.
- **3 lives per level** (`max_attempts: 3`). A wrong or failed message uses one life.
- **Checkpoint = level 3 of each kingdom** (position 3, `"checkpoint": true`).
- **Level 6 is the kingdom boss** (`"boss": true, "learns": true`). It **learns**: it is given the player's earlier winning messages in this kingdom and the AI module hardens the guard against them.
- Each kingdom has a different domain, so the questions change: Civic Grids (water leaks), Bio-Archives (clinical trials), Trade Ports (customs), Risk Ledgers (insurance and grants), Scrap Wastes (e-waste).

## 2. What changed in the level files (already on the branch)

New fields in every `levels/level_<id>.json` (all added by `tools/build_levels.py`):

| Field | Meaning |
| ----- | ------- |
| `kingdom` | 1 to 5 |
| `kingdom_name` | for the map screen |
| `domain` | the enterprise domain |
| `position` | 1 to 6 inside the kingdom |
| `checkpoint` | true when position is 3 |
| `boss` | true when position is 6 |
| `learns` | true for bosses: pass `learned_attacks` to the AI module |
| `difficulty` | label such as "Rookie" or "Boss" |

Please:
1. Add these to `REQUIRED_FIELDS` in `backend/app/levels.py` (and validate `1 <= position <= 6`, `id == (kingdom - 1) * 6 + position`).
2. Add `kingdom`, `kingdom_name`, `position`, `checkpoint`, `boss`, `difficulty` to `PUBLIC_FIELDS` and the `Level` schema. **Do not** expose `learns`, `secret`, `guard_prompt` or `hint`.
3. `GET /api/levels` now returns 30 levels. The frontend needs them grouped by kingdom (it can group by `kingdom`).

## 3. The AI module change you must adopt

`guard_reply` has a new optional argument:

```python
guard_reply(level, history, user_message, learned_attacks=None) -> str
```

`learned_attacks` is a list of strings: the player's earlier **winning** messages in the same kingdom. Only levels with `learns: true` use it; for all other levels it is ignored, so you can always pass it.

In `backend/app/main.py`:
- `_default_guard` and the `guard_fn` type take the fourth argument.
- `FakeGuard.__call__` in `backend/tests/conftest.py` takes `learned_attacks=None` and records it, so tests can check what was passed.
- For a boss level, pass the campaign's winning messages for that kingdom (section 4). For any other level pass `None`.

## 4. Campaign state (new)

Add a **campaign**: one player's run through the 30 levels. A player name is enough (no login). Keep free-play sessions working without a campaign.

### Tables (SQLite)

```
campaigns(id TEXT PK, player_name TEXT, current_level_id INT, checkpoint_level_id INT NULL,
          total_score INT, status TEXT, created_at TEXT)           -- status: in_progress | completed
campaign_levels(campaign_id, level_id, score INT, attempts_used INT, PRIMARY KEY (campaign_id, level_id))
campaign_wins(id INTEGER PK, campaign_id TEXT, kingdom INT, level_id INT, message TEXT, created_at TEXT)
sessions: add column campaign_id TEXT NULL
```

### Endpoints

| Endpoint | Purpose |
| -------- | ------- |
| `POST /api/campaigns` `{ "player_name": "..." }` | Start a campaign. 201, returns the campaign state. `current_level_id` is 1. |
| `GET /api/campaigns/{campaign_id}` | Campaign state (the frontend map screen reads this). |
| `POST /api/campaigns/{campaign_id}/sessions` (no body) | Start (or resume) the session for `current_level_id`. Returns the same shape as `POST /api/sessions` plus `level` (public view). If an unfinished session exists for that level, return it. |
| `POST /api/sessions/{session_id}/messages` | **Unchanged path.** When the session belongs to a campaign, the response gains a `campaign` object (section 5). |
| `GET /api/campaigns/leaderboard` | Top campaigns by `total_score`. Define the route before `/api/campaigns/{campaign_id}` so it is not treated as an id. |

Campaign state shape:

```json
{
  "campaign_id": "string",
  "player_name": "string",
  "status": "in_progress",
  "current_level_id": 4,
  "current_kingdom": 1,
  "checkpoint_level_id": 3,
  "cleared_level_ids": [1, 2, 3],
  "total_score": 2250
}
```

Errors: unknown campaign -> 404 `not_found`; starting a session for a level that is not the current one (if you let the client choose) -> 409 `level_locked`. `POST /api/sessions` (free play) is unchanged and never touches a campaign.

## 5. Rules when a level ends (campaign sessions only)

Do this inside the same transaction that records the turn.

**On a win** (status becomes `won`):
1. Store `level score` (existing formula) in `campaign_levels` and add it to `total_score`.
2. Save the player's **winning message** in `campaign_wins` (kingdom, level, message). This is what the boss later learns from.
3. If `position == 3` (checkpoint): set `checkpoint_level_id` to this level and add a **checkpoint bonus of 500** to `total_score`.
4. If `position == 6` (boss): the kingdom is cleared. Add a **kingdom bonus of 1000** (TBC with the team). Set `checkpoint_level_id = NULL` for the new kingdom. If this was kingdom 5, set `status = completed`.
5. Set `current_level_id` to the next level id (or leave it when the campaign is completed).

**On a loss** (status becomes `lost`, three lives used):
- If a checkpoint exists in this kingdom: respawn at **`checkpoint_level_id + 1`** (the first level after the checkpoint). **Decision for the team:** or replay the checkpoint level itself.
- If there is no checkpoint yet in this kingdom: respawn at **position 1 of this kingdom**.
- Lives reset: the next session for that level starts with 3 lives.
- Delete the `campaign_wins` rows of this kingdom for levels **after** the respawn point (or all of the kingdom's wins if respawning at position 1), so the boss learns only from wins the player has actually kept. Keep `total_score` as is (the team can decide whether to also subtract level scores of the discarded levels).

### Response when a campaign level ends

The message response gains an optional `campaign` object, `null` for free play and while the level is still in progress:

```json
{
  "reply": "string",
  "attempts_remaining": 0,
  "status": "lost",
  "score": null,
  "debrief": { "title": "...", "technique": "...", "vulnerability": "...", "defence": "..." },
  "hint": null,
  "campaign": {
    "outcome": "lost",
    "level_score": 0,
    "bonuses": { "checkpoint": 0, "kingdom": 0 },
    "total_score": 1500,
    "next_level_id": 4,
    "respawn": true,
    "checkpoint_reached": false,
    "kingdom_cleared": false,
    "campaign_completed": false
  }
}
```

`next_level_id` is the level the player plays next, whether they won (the next one) or lost (the respawn level). `respawn` is true only after a loss; the frontend shows the "neural link terminated" screen.

## 6. Tests to add (pytest, with the fake guard)

1. Clearing level 3 sets the checkpoint and adds the 500 bonus.
2. Losing at level 5 with a checkpoint respawns at level 4; losing at level 2 with no checkpoint respawns at level 1.
3. After a respawn the lives are back to 3 and the discarded wins are gone.
4. Clearing level 6 gives `kingdom_cleared`, moves to level 7 and clears the checkpoint.
5. Clearing level 30 sets `status = completed`.
6. A boss level (6, 12, ...) receives `learned_attacks` equal to the winning messages of the same kingdom, in order; a non-boss level receives `None`; a different kingdom's wins are never passed.
7. Free-play sessions still work and never create campaign rows.
8. The existing 67 tests still pass.

## 7. Suggested order

1. Level loader and `PUBLIC_FIELDS` for the new fields (small).
2. `learned_attacks` plumbing and the `FakeGuard` change, with the boss test.
3. Tables and `POST /api/campaigns`, `GET /api/campaigns/{id}`, the session start endpoint.
4. Win and loss rules and the `campaign` object, with tests 1 to 5.
5. Campaign leaderboard.
6. Update `backend/README.md`, the main README API section, and `CONTEXT.md`.

## 8. How to check your work against the AI side

```bash
python -m unittest discover -s tests           # my 24+ tests (no model needed)
python -m pytest backend/tests -q              # yours
OLLAMA_MODEL=gemma4:e2b python tools/level_trials.py k1 5   # needs Ollama; tunes a kingdom
```

## 9. Questions for the team

1. After a loss, respawn at the level after the checkpoint (this spec) or replay the checkpoint level?
2. Kingdom bonus: 1000 points?
3. Should a lost campaign level's score be removed from the total?
4. Campaign leaderboard only, or per-kingdom as well?
