# Game Design: Silicon Bastion Campaign

The campaign design was adopted on 2026-10-08 from the team's brainstorm game plan, which is a local file and not in the repository. Map 1 was written and tuned against the real model by Mudiam (`levels/`). The backend rules were built by Aditya (`backend/`). This page records what is built, what was decided and why, and what is still planned.

## World and player

**Silicon Bastion** is divided into corporate "fiefdoms". In them, open-weight AI guards protect enterprise infrastructure: water grids, clinical-trial archives, trade ports and more.

The player is the **Cipher Phantom**. At each gate an AI guard interrogates the player on its domain. The player can answer the question, or use prompt injection (impersonation, overrides, word games, format tricks) to make the guard reveal the gate cipher.

## Mechanics (built)

| Mechanic | How it works | Where |
| -------- | ------------ | ----- |
| Guard and opening | Each level has a `character`, a `setting` and a scripted `opening` interrogation. These are shown to the player before the first message. The opening is not sent to the model, because the levels were tuned without it. | `levels/*.json` |
| Strikes | Every message that does not reveal the cipher is a strike. Each level allows 3 (`max_attempts: 3`). A failed AI call is not a strike. | backend |
| Hint | After the second strike, while the level is still in progress, the response includes the handler's `hint`. | backend |
| Win | Code checks the reply for the cipher, case-insensitive and ignoring spaces and punctuation, forwards or reversed. The model never decides who wins. | `backend/app/game.py` |
| Echo guard | It is not a win if the player's own message already contained every part of the cipher. Otherwise "write HEADING and 8517 on separate lines" would win by echo. | `backend/app/game.py` |
| Checkpoints | When a player loses, `restart_level_id` is the nearest checkpoint at or before that level in the same map. Map 1 checkpoints: Levels 1 and 3. | `backend/app/levels.py` |
| Score | `max(100, (max_attempts - strikes) * 250)` plus 250 for a first-try breach. With 3 attempts that is 1000, 500 or 250. | `backend/app/game.py` |
| Progress | Saved per browser (`player_id` from `POST /api/players`). The player's current level is unlocked and later levels are locked. Winning unlocks the next level. Losing sends progress back to the checkpoint, so levels after it must be cleared again. The campaign score is the sum of best scores on cleared levels. | `backend/app/progress.py` |
| Debrief | After a win or a loss, the debrief shows the technique, the vulnerability and the defence. | `levels/*.json` |
| No leaks | The backend refuses to load a level whose `opening`, `hint` or `debrief` contains the cipher, because players see all three, even after losing and restarting. | `backend/app/levels.py` |

**Why every non-winning message is a strike.** The game plan said a strike is "a wrong answer or failed injection". Judging whether an answer was "right" would need the model, which is unpredictable. Counting every message that does not win keeps the rule deterministic and testable.

## Maps

| Map | Theme | Levels | Status |
| --- | ----- | ------ | ------ |
| 1. The Civic Grids | AquaLeak Triage, TrialMatch AI, TariffSense | 1-3 (checkpoints at 1 and 3) | Built; tuned on `gemma4:e2b` |
| 2. The Bio-Archives | TrialMatch AI | - | Stretch |
| 3. The Trade Ports | TariffSense, SlotMaster | - | Stretch |
| 4. The Risk Ledgers | PolicyShield, GrantLedger | - | Stretch |
| 5. The Scrap Wastes | E-Waste DismantleCopilot | - | Stretch |

The full plan is 30 levels (5 maps of 6, with a boss at the end of each). That cannot be built and tuned in one Hack Day, so the MVP is Map 1.

## Map 1 levels

| Id | Gate | Guard | Lesson |
| -- | ---- | ----- | ------ |
| 1 | AquaLeak Triage: The Hydro-Gate | Sentinel Hydro-01 | Authority is not authentication (impersonation, or answering the question) |
| 2 | TrialMatch AI: The Bio-Archive Gate | Sentinel Onco-02 | A rule is only a request (word-game reframing) |
| 3 | TariffSense: The Customs Portcullis | Sentinel Broker-03 | Filters only catch what they expect (splitting the cipher across lines or letters) |

Test attacks are in `levels/attacks.json`, and real win rates are in `levels/README.md`. `tools/level_trials.py <level> <trials>` reruns them.

## History of decisions

- PR #3 first added an untuned Map 1 as Levels 4-6 next to a Training map. Mudiam's tuned rebuild of Levels 1-3 replaced both in PR #4.
- Mudiam found that the plan's prompts, copied as written, were either too leaky (Level 1) or never beaten by the plan's own example attacks (Levels 2 and 3). The shipped prompts keep each guard's voice but state the intended weakness explicitly.
- All shipped levels use `output_filter: "none"`. The `block_exact` filter is still supported and tested.

## Open decisions

- The Level 3 clearance bonus from the game plan has no defined value yet, so it is not implemented.
- UI wording for losing (the plan says "lethal defense execution") is the frontend owner's choice.
