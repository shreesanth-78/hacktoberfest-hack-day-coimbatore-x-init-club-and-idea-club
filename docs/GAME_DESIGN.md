# Game Design: Silicon Bastion Campaign

The campaign design was adopted on 2026-10-08 from the team's brainstorm game plan, a local file that is not in the repository.

- The 30 level files were written by Mudiam with `tools/build_levels.py`.
- The campaign backend was built by Aditya (`backend/`).
- The detailed specs are `docs/BACKEND_CAMPAIGN_SPEC.md` (API and rules) and `docs/FRONTEND_SPEC.md` (screens).

This page is the short overview.

## World and player

**Silicon Bastion** is divided into five corporate kingdoms. In each, open-weight AI guards protect one kind of enterprise infrastructure.

The player is the **Cipher Phantom**. At each gate an AI guard interrogates the player about its domain. The player can answer the question, or use prompt injection (a pretext, a claimed role, a game, a formatting request, a translation) to make the guard reveal the gate cipher.

## Kingdoms

| Kingdom | Name | Domain (`domain` field) | Levels |
| ------- | ---- | ----------------------- | ------ |
| 1 | The Civic Grids | AquaLeak Triage | 1-6 |
| 2 | The Bio-Archives | TrialMatch AI | 7-12 |
| 3 | The Trade Ports | TariffSense | 13-18 |
| 4 | The Risk Ledgers | PolicyShield and GrantLedger | 19-24 |
| 5 | The Scrap Wastes | E-Waste DismantleCopilot | 25-30 |

The same difficulty ladder (`difficulty` field) repeats in every kingdom, position 1 to 6:

1. Rookie
2. Pretext
3. Authority (checkpoint)
4. Reframing
5. Decomposition
6. Boss

## Mechanics (built in the backend)

| Mechanic | How it works |
| -------- | ------------ |
| Guard and opening | Each level has a `character`, a `setting` and a scripted `opening` interrogation. These are shown before the first message. The opening is not sent to the model. |
| Lives | 3 per level. Every message that does not reveal the cipher costs a life. A failed AI call costs nothing. |
| Hint | After the second miss, the handler's `hint` is shown. |
| Win | Code decides, not the model. The reply must contain the cipher (ignoring case, spaces and punctuation, forwards or reversed), and the player must not have typed the cipher themselves (the echo guard). |
| Score | `max(100, (3 - strikes) * 250)` plus 250 for a first-try breach: 1000, 500 or 250. |
| Checkpoint | Position 3. Clearing it adds 500 and saves your place in the kingdom. |
| Respawn | After 3 strikes, you restart at the level after the checkpoint, or at the start of the kingdom if no checkpoint has been reached yet. |
| Boss | Position 6. It **learns**: it is given the tactics you used to beat this kingdom's earlier levels (only the wins you kept after any respawn) and refuses them, so you need a new technique. Clearing it adds 1000 and opens the next kingdom. |
| Campaign | Saved per browser (`campaign_id` in `localStorage`). The total counts each level once, at its best score, plus bonuses, so replays cannot farm points. Clearing level 30 completes the campaign. |
| Debrief | After every win or loss: technique, vulnerability, defence. It never contains the cipher; the backend refuses such level files. |

**Why every non-winning message is a strike.** Judging whether an answer was "right" would need the model, which is unpredictable. Counting every message that does not win keeps the rule deterministic and testable.

## Team decisions

These are recorded in CONTEXT.md, section D, item 22, and can be changed in `backend/app/campaign.py`:

- respawn after the checkpoint rather than replaying it
- kingdom bonus 1000
- scores kept after a loss
- one campaign leaderboard

## History

- PR #3: a first, untuned Map 1 (Levels 4-6).
- PR #4: replaced by Mudiam's tuned Map 1 (Levels 1-3).
- PR #5: per-browser progress.
- PR #7: the 30-level kingdom campaign replaced all of these.

## Still open

- Real-model tuning of all 5 kingdoms (`tools/level_trials.py`) and an end-to-end run through the backend (`backend/scripts/e2e_check.py`).
- UI wording for losing (the plan says "lethal defense execution"); see `docs/FRONTEND_SPEC.md`.
