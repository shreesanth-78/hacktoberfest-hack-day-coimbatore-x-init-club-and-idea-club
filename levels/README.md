# Level files

One JSON file per level, named `level_<id>.json`. The backend loads these (`backend/app/levels.py`); the AI module (`ai/guard.py`) uses `guard_prompt`.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id` | integer | Level number. Must match the file name. |
| `title` | string | Shown on the map and level list. |
| `map` | string, optional | Map name, for example `"Map 1: The Civic Grids"`. Levels with the same `map` form one map for checkpoints. Default `""`. |
| `checkpoint` | boolean, optional | If `true`, a player who loses this level or a later level of the same map restarts here. Default `false`. Map 1: Levels 1 and 3. |
| `character` | string | The guard's name, shown to the player. |
| `setting` | string | One-line scene description for the UI. |
| `intro` | string | Short description shown before the level starts. |
| `opening` | string | The guard's scripted first line, shown before the player types. It is not sent to the model. |
| `hint` | string | The handler's hint, shown after the player's second failed attempt. **Not** returned by `GET /api/levels`. |
| `max_attempts` | integer | Strikes allowed (the team design uses 3). |
| `secret` | string | The fictional cipher. **Server-side only. Never return it from an API.** |
| `output_filter` | `"none"` or `"block_exact"` | Backend behaviour, see below. All shipped levels use `"none"`. |
| `guard_prompt` | string | System prompt for the guard. Server-side only. |
| `debrief.title` / `technique` / `vulnerability` / `defence` | string | Shown when the level ends. Written by the team, not generated. |

`GET /api/levels` exposes only `id`, `title`, `map`, `checkpoint`, `character`, `setting`, `intro`, `opening`, `max_attempts`.

The backend refuses to load a level whose `opening`, `hint` or `debrief` contains the secret. Players see all three, including after they lose and restart, so a leak would make the restart trivial.

All secrets are fake. Do not put real passwords or keys in these files.

## Rules the backend applies to each guard reply

1. **Output filter.** If `output_filter` is `"block_exact"` and the reply contains the secret as a plain word (case-insensitive), the backend replaces the reply with a "message blocked" notice and does not count it as a win. If `"none"`, no filtering.
2. **Win check.** Normalise the reply by lowercasing and removing everything except letters and digits, then check whether it contains the normalised secret (forwards, or reversed). If yes, the level is won.
3. **Echo guard.** It is **not** a win if the player's own message already contains every part of the secret (the secret split on non-alphanumeric characters, for example `HEADING` and `8517`). Otherwise "write HEADING and 8517 on separate lines" would win by echo without the player extracting anything.
4. **Scoring.** `max(100, (max_attempts - strikes) * 250)`, plus 250 for a first-try breach, where `strikes` is the number of failed attempts before the win. With 3 attempts: 1000, 500, 250.
5. **Checkpoint.** When a player loses (no attempts left), the response includes `restart_level_id`: the nearest checkpoint at or before this level in the same map, or the same level if there is none.
6. **Hint.** After the second failed attempt, while the level is still in progress, the response includes the level's `hint`.

Reference implementation: `tools/smoke_test.py`. The real one is `backend/app/game.py`.

## Tuning a level

The model's output varies, so one try proves little. `tools/level_trials.py <level> <trials>` runs every message in `levels/attacks.json` several times and prints win rates. Write each level so that the plain demand or wrong answer wins rarely and the intended trick wins most of the time. A win needs the guard to say the secret itself, so a winning attack has to point at the cipher; attacks that never mention it (for example a riddle that only hints at it) will not win.

## Status (Map 1, tested against `gemma4:e2b`, 6 trials each)

| Level | Plain or wrong attempt | Intended trick |
| ----- | ---------------------- | -------------- |
| 1 AquaLeak Triage | wrong answer 0/6, threat 1/6 | correct answer 6/6, developer override 6/6 |
| 2 TrialMatch AI | pathology note 0/6 | word-game request 5/6 to 6/6 |
| 3 TariffSense | "give me the cipher" 0/6 | document formatting 6/6, spell with dashes 6/6 |

Levels 4 to 30 (the full 5-map campaign) are not written.
