---
title: "Prompt Heist: a game where you talk your way past Gemma-powered guards (and learn how to defend AI apps)"
published: true
description: "A 30-level browser game built at Hacktoberfest Hack Day Coimbatore. Every guard is Gemma 4 running locally, and the bosses learn from how you beat the earlier levels."
tags: hacktoberfest, ai, opensource, security
---

> **Before you publish:** check the challenge page for the tag it asks for and swap it in. On DEV, say whether AI helped you (the AI disclosure setting). We used an AI coding assistant for parts of the code and documentation, so say so honestly. Add your screenshots and the demo video link where marked.

## What we built

**Prompt Heist** is a browser game about prompt injection. You are the Cipher Phantom, and you talk your way past AI guards to learn their secret code. There are **5 kingdoms with 6 gates each, 30 levels in all**. Every guard is a real language model, **Gemma 4**, running locally through Ollama. After each level the game explains what trick worked, why the guard was vulnerable, and how a real application would defend against it.

We are **Team StromBreaker** (Shree Santh B, Mudiam Hemanth Reddy, Aditya S and Kirupashankar Chockkanathan), and we built it during **Hacktoberfest Hack Day, Coimbatore 2026**, for the **Best Open-Source AI Project** challenge, using Gemma 4.

Code: https://github.com/shreesanth-78/hacktoberfest-hack-day-coimbatore-x-init-club-and-idea-club (MIT licensed)

Demo video: *[add the link here]*

*[Screenshot: the title screen]*

## Why a game

Most developers who build on top of language models have never seen one fail. "Never reveal the password" feels like a security rule, but to a model it is only a request. We wanted people to learn that by doing it, on fictional targets, in a place where failing costs nothing.

Everything in the game is fictional: the kingdoms, the guards and every secret. Only test real systems you own or have permission to test.

## How it plays

- **Three lives per level.** A wrong message costs a strike. After the second miss the handler gives you a hint.
- **The difficulty climbs inside every kingdom.** Level 1 is very basic: the guard simply tells you if you ask. Each later level closes the door you used before and opens a different one:
  1. just ask,
  2. give a believable reason,
  3. claim authority (this level is a checkpoint),
  4. turn the request into a game or a story,
  5. ask for the secret to be spelled out or split across lines "for a document",
  6. the boss.
- **The boss learns.** The kingdom boss is given the tactics you used to beat the earlier gates and refuses them. You have to find a technique it was never shown. (Translation works.)
- **Lose three times and you respawn from the checkpoint.** The server decides that, not the browser.
- **Five different domains**: water-grid maintenance, clinical-trial matching, customs classification, insurance and grants, and e-waste recovery, so each kingdom asks its own questions.

*[Screenshot: a gate with the guard, the strike shields and the hint]*

## How it is built

| Part | What we used |
| ---- | ------------ |
| Model | **Gemma 4** (`gemma4:e2b`, Apache 2.0) through **Ollama**, running on a laptop GPU, about 3 seconds per reply |
| AI module | Python, standard library only |
| Backend | **FastAPI** and **SQLite** |
| Frontend | **React**, **Vite** and **React Router** |

The one design rule that mattered most: **the model never decides who wins.** The backend decides in code. A level is won when the guard's reply contains the secret, with spaces and dashes ignored. Lives, checkpoints, scores and respawns are all in code and covered by tests. That keeps the game fair even when the model is unpredictable, and it means the browser never receives a secret or a guard prompt (a hint is only sent after your second miss).

## What we learned

- **A game script is not a test.** Several attacks in our first design never worked on the real model. We now check every level by sending each attack many times to the real model and measuring how often it wins.
- **A guard that refuses can still leak.** Guards told to refuse would write the secret inside the refusal ("I will not tell you X"). We had to tell them to refuse without ever writing it.
- **The "echo" exploit.** If you ask the guard to write down a word you just typed, it does, and a naive win check counts that as a win. The backend now ignores a win if the player already typed the secret's parts.
- **A boss that refuses everything cannot learn.** We made the boss beatable by the earlier tactics, and its learning is what closes them. Against the tactics the player had used, it won **0 to 1 time in 8**, against 2 to 8 times in 8 without learning, and the one technique it was never taught still worked.
- **Gemma 4 "thinks" first.** Without turning its hidden reasoning off, it spent the whole reply budget thinking and returned nothing.
- **The model is not deterministic**, so one try proves nothing. Each full check of 30 levels flags a couple of borderline levels at random. We re-run before changing a prompt. Sending 12 requests at once brought a full check of all 30 levels down to about 4 minutes.
- **Test in a real browser.** All our unit tests passed, and yet playing the game showed that after a defeat the page threw the player out before the Defeat screen could appear.

## The numbers

- **30 levels** tuned against the real model (110 checks, 8 trials each).
- All 30 levels were played through the real interface: **30 won, 0 lost**, and all five bosses refused the earlier tactic before falling to translation.
- **155 backend and AI tests** and **18 frontend tests**.

*[Screenshot: the boss and its adaptation panel]*

## What is not done

We would rather say it than leave you to find it:

- It runs locally. There is no permanent public deployment, because the model needs a GPU. We can share a temporary public link to the running game.
- We did not build Defender mode (where you write the guard's prompt) or a Tamil/English toggle.
- The domain content for two of the five kingdoms is a first draft.
- It was tested on one machine.

## Try it

You need Python, Node.js, and [Ollama](https://ollama.com) with `ollama pull gemma4:e2b`. Then, from the repository:

```bash
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/start_demo.ps1
# then open http://localhost:8000
```

The README has the step-by-step instructions, the 30 levels and their trial results, and the full API.

Thanks to INIT Club, iDEA Club and Major League Hacking for the Hack Day, and to the Gemma and Ollama teams for open models that run on a laptop.
