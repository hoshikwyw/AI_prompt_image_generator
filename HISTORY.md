# Project history

Running log of what each phase delivered. Newest at the bottom.

---

## Phase 0 — Provider probe · 2026-08-29

**Goal:** answer one question before building anything — *does the generated image still look
like the person?*

### Context that shaped the design

Research during planning found that **Gemini no longer has a free tier for image generation**.
Every image model on `ai.google.dev/gemini-api/docs/pricing` reads "Free Tier: not available", and
`gemini-2.5-flash-image-preview` was shut down 2026-01-15. This invalidated the original premise,
so "who pays per image" became the first architectural decision rather than an afterthought.

The free option that survives is **Cloudflare Workers AI + FLUX.2 [klein] 4B**, which unifies
generation and editing in one model and rides a free allowance of 10,000 neurons/day.

Most "free image API" lists are text-to-image only and therefore useless here — this app needs
img2img with an input image.

### Delivered — `probe/`

| File | Purpose |
|---|---|
| `src/types.ts` | `ImageProvider` interface — the abstraction the app is built on |
| `src/providers/cloudflare.ts` | FLUX.2 klein 4B via multipart REST |
| `src/providers/gemini.ts` | `gemini-3.1-flash-lite-image`, with model-id auto-discovery on 404 |
| `src/prompts.ts` | 6 styles tagged easy/medium/hard by likeness difficulty |
| `src/probe.ts` | CLI + side-by-side HTML contact sheet generator |

### Key findings

- Cloudflare's endpoint is **multipart/form-data, not JSON**, even for a bare prompt.
  Reference images go in as `input_image_0`..`input_image_3`.
- **Input images are capped at 512×512.** This makes an edit 1 input tile + 4 output tiles
  ≈ **110 neurons**, i.e. **~91 free images/day** at 1024px (~317/day at 512px) — better than the
  ~79/day first estimated. It is also the biggest risk to likeness, since the model only ever sees
  a small version of the face.
- Klein is distilled: steps fixed at 4, no quality dial.
- Gemini pricing: `gemini-3.1-flash-lite-image` at $0.0336/image.

### Verification

Both providers reached their live APIs and returned correct auth errors (Cloudflare `7003 could
not route`, Gemini `400 invalid key`), proving URL construction, multipart body, and SDK wiring.
Runs on Node 24 native TS stripping, no build step.

**Not yet run against real credentials** — needs the user's Cloudflare token, Gemini key, and a
real portrait photo.

---

## Phase 1 — Working app, seed prompts, no database · 2026-08-29

**Goal:** a runnable app covering the whole flow — pick a style, upload a photo, generate, download
— using only a free Cloudflare token.

### Delivered — `web/`

Next.js 16.3.3 · React 19.2.8 · Tailwind 4 · TypeScript.

| Path | Purpose |
|---|---|
| `lib/types.ts` | Provider interface + `Job` shape (mirrors the future `generations` table) |
| `lib/providers/*` | Ported unchanged from the probe |
| `lib/providers/index.ts` | Registry + **fallback** to any configured provider |
| `lib/prompts.ts` | 6 seed styles; columns match the future `prompts` table |
| `lib/jobs.ts` | Disk-backed job store under `.data/` |
| `lib/image.ts` | Server-side resize/EXIF via sharp — the trust boundary |
| `app/page.tsx` | Gallery |
| `app/create/[slug]/page.tsx` | Style page |
| `components/Studio.tsx` | Upload, client-side downscale, submit, poll, result |
| `app/result/[id]/page.tsx` | Shareable permalink |
| `app/api/generate/route.ts` | Validates, creates job, runs generation via `after()` |
| `app/api/jobs/[id]/route.ts` | Poll endpoint |
| `app/api/image/[id]/route.ts` | Serves bytes; `?download` for attachment |

### Decisions

- **Async from the start.** `POST /api/generate` returns `202 {id}` immediately and generation runs
  in Next's `after()`, with the client polling. No queue infrastructure, but the job record already
  has the shape a queue needs, so adding QStash later is a small change rather than a rewrite.
- **No database yet**, per plan. Styles come from a seed file; jobs live on disk.
- **Uploaded photos are never written to disk.** The input buffer lives only in the request closure.
- **`promptSnapshot` frozen at submit time**, so editing a style later never rewrites past results.
- **Provider fallback**: a style tagged `gemini` still runs if only Cloudflare is configured, and
  the job records the provider *actually* used.
- **Client-side downscale to 1024px** via canvas with `imageOrientation: "from-image"`, so phone
  photos upload fast and do not arrive sideways.

### Verification

- `npm run build` passes; TypeScript clean; all 6 style pages prerendered.
- Endpoints exercised against a running production server:

  | Case | Result |
  |---|---|
  | `GET /`, `GET /create/oil-painting` | 200 |
  | `POST /api/generate` no provider | 503 + setup instructions |
  | unknown slug / no photo | 404 / 400 |
  | `GET /api/jobs/<unknown>` | 404 |
  | full job run (dummy creds) | 202 → `running` → `failed`, persisted to `.data/` |
  | gemini-tagged style, only CF configured | fell back to cloudflare, recorded correctly |

**Not yet verified against real credentials** — no successful generation has been produced.

### Next

Phase 2: Supabase (Postgres + auth allowlist), `/admin/prompts` CRUD with Test Run, per-user
quota + global budget cap, BYOK settings, auto-expiry of results.

---

## Phase 2 — Prompt collection, generation parked · 2026-09-07

**Goal:** no provider key was available, so the app became the thing that has to exist before
generation is worth running — a library of the prompts themselves.

### Context that shaped the design

Phase 1 ended without a single successful generation, because it needed credentials nobody had.
Rather than stall, the work moved to the half that needs no key: collecting, tagging and searching
prompts. The six Phase 1 styles stopped being hard-coded configuration and became the first six
rows of an editable collection.

Generation was **parked, not deleted** — `lib/providers/`, `lib/image.ts`, `lib/jobs.ts`, the
`/api/generate`, `/api/jobs` and `/api/image` routes and all of `probe/` are still in the tree,
now unreachable from the UI.

### Delivered — `web/`

| Path | Purpose |
|---|---|
| `lib/prompt.ts` | The `Prompt` shape, `validateDraft`, and pure `filterPrompts` / `tagCounts` / `parseFilter` |
| `lib/store.ts` | The collection in `.data/collection.json` — read, write, import |
| `lib/seed.ts` | First-run contents, mapped from the Phase 1 styles |
| `app/page.tsx` + `components/Library.tsx` | Search, category and tag filters, four sorts, favourites |
| `components/PromptCard.tsx` · `PromptActions.tsx` | Card with body preview; optimistic copy + favourite |
| `app/prompts/[id]/` | Detail page, edit page, danger zone |
| `components/PromptForm.tsx` · `DeletePrompt.tsx` | One form for create and edit; two-step delete |
| `components/ImportExport.tsx` | Export as a file, import by merge or replace |
| `app/api/prompts/**` | List/create, get/patch/delete, copy counter, export, import |

Removed from the UI: `app/create/[slug]`, `app/result/[id]`, `components/Studio.tsx`.

### Decisions

- **Filtering is one function, used twice.** `filterPrompts` runs on the client for instant search
  and in the API route for programmatic use, so the two views of the collection cannot disagree.
  The client holds the whole collection — it is a few kilobytes, and a search box that waits on a
  round trip per keystroke feels broken.
- **Filters live in the URL** via `replaceState`, so a filtered view is a shareable link without a
  navigation per keystroke. The server parses the same query on first render.
- **The id is the slug of the original title and never moves.** Renaming a prompt does not break a
  link someone saved.
- **`new` and `edit` are reserved slugs.** `/prompts/new` is the create form, so a prompt titled
  "New" would have claimed a URL it could never be reached at.
- **Validation is shared and total.** `validateDraft` coerces untrusted JSON and never throws;
  PATCH validates the *merged result*, not the patch, so a one-field edit cannot leave a prompt
  invalid. `id`, `createdAt` and `copies` stay store-owned even when a client posts them back.
- **Favourite is set, not toggled**, so a retried request is idempotent.
- **Copy counting is fire-and-forget.** The text is already on the clipboard; a lost count is not
  worth interrupting anyone over.
- **Import skips bad rows rather than failing the file** — one malformed entry should not cost you
  the other ninety-nine — and an export round-trips: `favorite`, `copies` and `createdAt` survive.
- **Writes are serialised** through one promise chain and land write-then-rename, so two concurrent
  requests cannot interleave into a truncated file.

### Verification

`npm run build`, `tsc --noEmit` and eslint clean (bar nine pre-existing `no-explicit-any` errors in
the dormant provider files). Exercised against a running production server:

| Case | Result |
|---|---|
| Shared filter links (`?q=`, `?category=`, `?tag=`, `?favorites=1`) | render already filtered server-side |
| Mangled `?category=junk` | falls back to the whole library |
| Create / retitle / delete | 201 with slug id · id survives the rename · 204 then 404 |
| Duplicate titles, prompt titled "New" | `my-test-prompt-2`, `new-2` |
| 3 concurrent copy counts | all 3 land |
| Invalid input, malformed JSON, unknown id, path traversal | 422 with field errors · 400 · 404 · 404 |
| Export → re-import | 6 updated, 0 added, no duplicates; favourite and copies preserved |
| Import with two bad rows | 1 added, 2 skipped with reasons |
| Import over the 2000 cap | 413 |
| `/create/*`, `/result/*` | 404 — no UI path reaches the providers |

**Still not verified against real credentials** — no image has ever been generated. Nothing in this
phase changes that.

### Next

Phase 3, when a key exists: run a collected prompt against a provider, and record the result
against the prompt so "does this one actually work" has an answer. Then Supabase (Postgres + auth
allowlist), per-user quota and a global budget cap.
