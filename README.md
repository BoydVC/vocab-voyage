# Vocab Voyage

Word-adventure learning game for Char (TokenMax burn). Sail EXAMPLE island packs — Roots, Synonyms, Context Clues, SAT-ish starter — with flash cards, multiple choice, fill-in-the-blank, speed runs, and writing nudges.

**Hard rule:** all decks are **EXAMPLE** practice content — not from any school curriculum. Progress lives in `localStorage`. Offline-safe. No accounts. No cloud agents.

## Screens

1. **Home** — hero, stats, island shortcuts, modes  
2. **Map** — voyage islands with mastery bars (EXAMPLE badge)  
3. **Play** — flash / MC / blank / speed / writing nudge  
4. **Progress** — stars, streak, pack mastery, reset  
5. **About** — EXAMPLE-deck disclaimer

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4303/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/vocab-voyage.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/words.json` — EXAMPLE packs (~40 words; embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/vocab-voyage` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
