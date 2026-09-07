# Promptbook

A collection of AI prompts. Write them down, tag them, find them again, copy one when you need it.

This started as an image generator. With no provider key available, Phase 2 turned it into the
library that has to exist first anyway — the prompts you would have run. Generation is parked, not
deleted. See [HISTORY.md](HISTORY.md) for what each phase delivered and why.

```
probe/   Phase 0 — provider comparison harness (dormant)
web/     Phase 1 — the generator app · Phase 2 — the prompt collection
```

## Quick start

```bash
cd web
npm install
npm run dev
```

No keys, no database, no setup. The collection lives in `web/.data/collection.json`, seeded on
first run with the six styles Phase 1 shipped with.

## What it does

| | |
|---|---|
| **Library** | Search across title, text, notes and tags; filter by category, tag or favourite; sort four ways. Filters live in the URL, so a view is a link you can send. |
| **Copy** | One click puts the prompt text on the clipboard and counts the use — "most copied" is the honest measure of which prompts earn their place. |
| **Edit** | Add, edit and delete from the browser. Renaming keeps the id, so a link you saved keeps working. |
| **Import / export** | The whole collection as one JSON file, and back again. Merge by default, or replace everything. |

## Writing prompts

Write the **transformation**, not the scene:

- ✅ "Restyle the person in this photo as X, keeping their facial features"
- ❌ "a portrait of a man in style X" — makes the model ignore the upload and invent a stranger

Use **notes** for what the prompt needs and what it gets wrong. That is the part you forget, and
the part that saves you the second time.

## Data

One file, `web/.data/collection.json`, gitignored. Back it up by exporting; move it to another
machine by importing. Every read and write goes through `web/lib/store.ts`, so swapping the file
for Postgres later is a change to that one module.

```
lib/prompt.ts   the Prompt shape, validation, and the pure filter/sort helpers
lib/store.ts    the collection: read, write, import
lib/seed.ts     what a fresh collection starts with
```

## Image generation

Parked, and still here. `web/lib/providers/`, `web/lib/image.ts`, `web/lib/jobs.ts`, the
`/api/generate`, `/api/jobs` and `/api/image` routes, and the whole `probe/` harness are untouched
and unreachable from the UI.

| | Model | Cost | Notes |
|---|---|---|---|
| **Cloudflare** | FLUX.2 [klein] 4B | **free** — ~91 images/day | Input capped at 512×512 |
| **Gemini** | `gemini-3.1-flash-lite-image` | $0.0336/image | Needs billing enabled |

Gemini has **no free tier for image models** as of 2026. Cloudflare's 10,000 neurons/day is the
free layer. When a key turns up, `web/.env.example` says what to fill in, and the prompts to run
are already in the collection.

## Phase 0 probe

Before trusting a provider, compare them on your own face:

```bash
cd probe
npm install
cp .env.example .env           # add keys
# drop a portrait into inputs/
npm run probe
```

Opens an HTML contact sheet of every style × every provider. Read the **hard** rows first —
that is where a weak model stops looking like the subject.
