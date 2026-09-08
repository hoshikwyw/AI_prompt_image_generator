# Promptbook

A collection of AI prompts. Write them down, tag them, find them again, copy one when you need it.

This started as an image generator. With no provider key available, Phase 2 turned it into the
library that has to exist first anyway — the prompts you would have run. Phase 3 gave it a shared
backend, so a collection can be published rather than kept on one laptop. Generation is parked, not
deleted. See [HISTORY.md](HISTORY.md) for what each phase delivered and why.

```
probe/      Phase 0 — provider comparison harness (dormant)
web/        Phase 1 — the generator app · Phase 2 — the prompt collection
supabase/   Phase 3 — schema, RLS and the storage bucket
```

## Quick start

```bash
cd web
npm install
npm run dev
```

No keys, no database, no setup. The collection lives in `web/.data/collection.json`, seeded on
first run with the six styles Phase 1 shipped with. To share it instead, see
[Going shared](#going-shared).

## What it does

| | |
|---|---|
| **Library** | Search across title, text, notes and tags; filter by category, tag or favourite; sort four ways. Filters live in the URL, so a view is a link you can send. |
| **Copy** | One click puts the prompt text on the clipboard and counts the use — "most copied" is the honest measure of which prompts earn their place. |
| **Edit** | Add, edit and delete from the browser. Renaming keeps the id, so a link you saved keeps working. |
| **Samples** | Attach images showing what a prompt produced. The first becomes the card's tile. |
| **Import / export** | The whole collection as one JSON file, and back again. Merge by default, or replace everything. |
| **Two backends** | A local JSON file, or Supabase. Same behaviour either way; the footer says which is live. |

## Writing prompts

Write the **transformation**, not the scene:

- ✅ "Restyle the person in this photo as X, keeping their facial features"
- ❌ "a portrait of a man in style X" — makes the model ignore the upload and invent a stranger

Use **notes** for what the prompt needs and what it gets wrong. That is the part you forget, and
the part that saves you the second time.

## Data

The store has two backends behind one interface, chosen from the environment at startup:

| | Where | When |
|---|---|---|
| **disk** | `web/.data/collection.json`, plus `.data/images/` | No Supabase credentials set |
| **supabase** | Postgres, plus the `prompt-samples` storage bucket | `SUPABASE_URL` + `SUPABASE_ANON_KEY` set |

Both share their id allocation and import rules, so a prompt created against Postgres is
indistinguishable from one created against the file. Swapping is a restart, not a migration —
though `npm run supabase:migrate` exists to carry an existing local collection across.

```
lib/prompt.ts        the Prompt shape, validation, pure filter/sort helpers
lib/store/shared.ts  the rules both backends must agree on
lib/store/disk.ts    the local JSON collection
lib/store/supabase.ts  Postgres + storage
lib/admin.ts         who may write
```

## Going shared

1. Create a Supabase project, then apply `supabase/migrations/` — see
   [supabase/README.md](supabase/README.md).
2. Fill in `web/.env.local` from `web/.env.example`.
3. Check it: `cd web && npm run supabase:check`.
4. Carry your local collection across, if you have one: `npm run supabase:migrate -- --dry-run`
   first, then without the flag.

### Who can write

Reading is public — that is the point. Writing depends on what a write would reach:

| `ADMIN_PASSPHRASE` | Backend | Writes |
|---|---|---|
| set | either | Need the passphrase, entered at `/admin` |
| unset | disk | Open — it is your own machine |
| unset | Supabase | **Refused.** Shared data is never left editable by whoever finds the URL |

The `service_role` key behind every write bypasses row-level security, so it is server-only and
never reaches a browser. The anon key the public pages use can only `select`.

## Image generation

Parked, and still here. `web/lib/providers/`, `web/lib/image.ts`, `web/lib/jobs.ts`, the
`/api/generate`, `/api/jobs` and `/api/image` routes, and the whole `probe/` harness are untouched
and unreachable from the UI. Note that `/api/generate` still reads the old seed file rather than
the collection — wiring it to collected prompts is Phase 4 work.

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
