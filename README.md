# AI image generator

Pick a style, upload your photo, get it restyled with your face preserved.

Invite-only tool. See [HISTORY.md](HISTORY.md) for what each phase delivered and why.

```
probe/   Phase 0 — provider comparison harness (does the result still look like you?)
web/     Phase 1 — the app
```

## Providers

| | Model | Cost | Notes |
|---|---|---|---|
| **Cloudflare** | FLUX.2 [klein] 4B | **free** — ~91 images/day | Input capped at 512×512 |
| **Gemini** | `gemini-3.1-flash-lite-image` | $0.0336/image | Needs billing enabled |

Gemini has **no free tier for image models** as of 2026. Cloudflare's 10,000 neurons/day is the
free layer; Gemini is the quality tier for styles that need photorealistic likeness.

Each style in `web/lib/prompts.ts` declares which provider it uses. If that provider has no
credentials, it falls back to whichever one does.

## Quick start

```bash
cd web
cp .env.example .env.local     # add CF_ACCOUNT_ID + CF_API_TOKEN (free)
npm install
npm run dev
```

Only one provider needs configuring. With neither, the gallery renders and tells you what to add.

## Writing style prompts

Write the **transformation**, not the scene:

- ✅ "Restyle the person in this photo as X, keeping their facial features"
- ❌ "a portrait of a man in style X" — makes the model ignore the upload and invent a stranger

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
