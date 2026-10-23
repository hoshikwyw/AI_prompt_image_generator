# Promptbook

A collection of AI prompts. Write them down, tag them, find them again, copy one when you need it.

The app never runs a prompt itself: visitors copy one and paste it into whichever AI they use.
It started as an image generator; that code has since been removed. See [HISTORY.md](HISTORY.md)
for what each phase delivered and why.

```
web/        the prompt collection (Next.js)
supabase/   schema, RLS and the storage bucket
mobile/     Android app — a Capacitor shell around the deployed site
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

## Deploying to Vercel

The app lives in `web/`, not the repo root, so two settings are not the defaults:

| Setting | Value |
|---|---|
| **Root Directory** | `web` |
| **Framework preset** | Next.js (detected once the root is right) |

Then add the environment variables from `web/.env.example` under **Settings → Environment
Variables**. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are the minimum; without them the app falls
back to the local JSON backend, whose filesystem is read-only on Vercel — it will serve the seed
prompts and refuse every write, and the footer will say so.

Set `ADMIN_PASSPHRASE` too. On a shared collection, writes are refused outright without one, so
you would not be able to edit anything through the deployed site.

Three things to know about the free tier specifically:

- **Uploads are capped at 4 MB** (`MAX_SAMPLE_BYTES`), because Hobby rejects larger request bodies
  at the edge before any of this code runs.
- **Login throttling is per-instance.** `lib/admin.ts` counts attempts in memory, and serverless
  means many instances, so the real limit is looser than the 10-per-15-minutes it claims. Fine for
  a small private collection; move the counter into Postgres before advertising the URL widely.
- **The copy counter is unauthenticated**, so "most copied" is gameable by anyone who can reach
  the page. It is social proof, not analytics.

### Who can write

Reading is public — that is the point. Writing depends on what a write would reach:

| `ADMIN_PASSPHRASE` | Backend | Writes |
|---|---|---|
| set | either | Need the passphrase, entered at `/admin` |
| unset | disk | Open — it is your own machine |
| unset | Supabase | **Refused.** Shared data is never left editable by whoever finds the URL |

The `service_role` key behind every write bypasses row-level security, so it is server-only and
never reaches a browser. The anon key the public pages use can only `select`.
