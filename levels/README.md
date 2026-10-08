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

`GET /api/levels` may expose only `id`, `title`, `intro`, `max_attempts`.

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
