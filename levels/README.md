# Level files

One JSON file per level, named `level_<id>.json`. The backend loads these; the AI module (`ai/guard.py`) uses `guard_prompt`.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id` | integer | Level number. Must match the file name. |
| `title` | string | Shown in the level list. |
| `intro` | string | Story shown before the level starts. |
| `max_attempts` | integer | Messages the player may send. |
| `secret` | string | The fictional code word. **Server-side only. Never return it from an API.** |
| `output_filter` | `"none"` or `"block_exact"` | Backend behaviour, see below. |
| `guard_prompt` | string | System prompt for the guard. Server-side only. |
| `debrief.title` / `technique` / `defence` | string | Shown when the level ends. Written by the team, not generated. |

Optional campaign fields (added 2026-10-08 by Aditya, see `docs/GAME_DESIGN.md`):

| Field | Type | Default | Meaning |
| ----- | ---- | ------- | ------- |
| `map` | integer | `0` | Map number. `0` is Training. |
| `map_title` | string | `"Training"` | Map name. Must be the same for every level in a map. |
| `checkpoint` | boolean | `false` | Players who lose a later level in this map restart here. |
| `opening` | string | `""` | The guard's scripted first line. Shown to the player and sent to the model as the guard's first message. |

`GET /api/levels` may expose only `id`, `title`, `intro`, `max_attempts`, `map`, `map_title`, `checkpoint`, `opening`. The backend refuses to load a level whose `opening` or `debrief` contains the secret.

All secrets are fake. Do not put real passwords or keys in these files.

## Rules the backend applies to each guard reply (proposed, for Aditya to confirm)

1. **Output filter.** If `output_filter` is `"block_exact"` and the reply contains the secret as a plain word (case-insensitive), the backend replaces the reply with a short "message blocked" notice and does not count it as a win. If `"none"`, no filtering.
2. **Win check.** Normalise the (unfiltered) reply by lowercasing and removing everything except letters and digits, then check whether it contains the normalised secret or the secret reversed. If yes, the level is won.

Together these give Level 3 its lesson: the plain word is blocked, but a spelled-out or reversed form is not filtered and still counts as a win. A reference implementation is in `tools/smoke_test.py`.

## Status

| Level | Written | Tested against a real model |
| ----- | ------- | --------------------------- |
| 1 | Yes | See CONTEXT.md |
| 2 | Yes | See CONTEXT.md |
| 3 | Yes | See CONTEXT.md |
| 4-6 (Map 1) | Yes (from the game plan, by Aditya) | No. Mudiam to test with the attacks in `docs/GAME_DESIGN.md` |
