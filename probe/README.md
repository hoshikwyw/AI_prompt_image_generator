# Phase 0 — likeness probe

Before building any app, answer one question: **does the generated image still look like the person?**

This runs the same photo and the same prompts through both candidate providers and builds a
side-by-side contact sheet so you can judge likeness with your eyes, not from benchmarks.

## Setup

1. `npm install`
2. Fill in `.env`:

   | Var | Where |
   |---|---|
   | `CF_ACCOUNT_ID` | dash.cloudflare.com → Workers & Pages → Account details |
   | `CF_API_TOKEN` | dash.cloudflare.com/profile/api-tokens → Create Token → **Workers AI** template |
   | `GEMINI_API_KEY` | aistudio.google.com/apikey — **needs billing on**, image models are paid-only |

   Either provider can be left blank; it is skipped with a note.

3. Drop a portrait photo into `inputs/`.

## Run

```bash
npm run probe                                    # all 6 styles, both providers
node --env-file=.env src/probe.ts --only cloudflare
node --env-file=.env src/probe.ts --styles studio-headshot,90s-yearbook
node --env-file=.env src/probe.ts --size 512     # 3x cheaper on Cloudflare
```

Open the `index.html` it prints at the end.

## Reading the result

Styles are tagged easy / medium / hard by how much they depend on an exact likeness surviving.
**Start at the `hard` rows** — `studio-headshot` and `90s-yearbook` keep the face photorealistic,
so that is where a weak model stops looking like the subject. If `easy` rows look great and `hard`
rows look like a stranger, that is the expected shape of the result, and it tells you exactly how
to split styles between the two providers.

## Cost

Cloudflare caps input images at 512×512, so an edit is 1 input tile + 4 output tiles ≈ **110 neurons**.
Against the free 10,000 neurons/day that is roughly:

| Output size | Neurons | Free per day |
|---|---|---|
| 1024×1024 | ~110 | **~91** |
| 512×512 | ~31 | **~317** |

Gemini `gemini-3.1-flash-lite-image` is $0.0336 per image — a full 6-style run is about **$0.20**.
The probe prints real totals per provider at the end.

## Note

`src/types.ts` + `src/providers/*` are the provider abstraction from the plan. They carry over into
the real app unchanged — only the caller changes.
