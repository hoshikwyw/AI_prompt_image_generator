#!/usr/bin/env node
/**
 * Generates sample images for prompts with Google's Gemini image model, into
 * samples/ — ready for `npm run samples:upload`.
 *
 *   npm run samples:generate -- --dry-run            say what would happen
 *   npm run samples:generate                         generate the missing ones
 *   npm run samples:generate -- --only=elven-queen   just these (comma-separated)
 *   npm run samples:generate -- --force              replace ones already made
 *
 * Needs GEMINI_API_KEY in .env.local (Google AI Studio → Get API key). Each
 * image is billed to that key's project. Reads the prompts from a running copy
 * of the site (`npm run dev`, or SITE_BASE=https://…).
 *
 * Photo-edit prompts ("using the woman in this photo…") are run on a photo,
 * as a reader would: samples/source/<prompt-id>.jpg if there is one, otherwise
 * samples/source/<audience>.jpg — female, male, couple or any. Without a photo
 * the prompt is skipped: run on its text alone it would invent a stranger,
 * which is not what the prompt does. Only use photos you may publish.
 *
 * Gemini adds an invisible SynthID watermark to every image it makes.
 */
import "./load-env.mjs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);
const base = (process.env.SITE_BASE || "http://localhost:3000").replace(/\/$/, "");
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
// The model the Gemini docs recommend for new projects; override to try another.
const model = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";

const outDir = path.resolve("samples");
const sourceDir = path.join(outDir, "source");
const PHOTO_TYPES = [".jpg", ".jpeg", ".png", ".webp"];
const ASPECTS = new Set(["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The prompt as a reader would paste it, made concrete: brackets dropped from
 * the parts meant to be changed ("[a bowl of ramen]" → "a bowl of ramen"),
 * and Midjourney flags removed — an `--ar` is passed as the aspect ratio.
 */
function prepare(body) {
  const ar = /--ar\s+(\d+:\d+)/.exec(body)?.[1];
  const text = body
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\s--[a-z]+(?:\s+(?!--)\S+)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return { text, aspect: ar && ASPECTS.has(ar) ? ar : undefined };
}

/** samples/source/<id>.* first, then samples/source/<audience>.*. */
async function sourcePhotoFor(prompt) {
  let names = [];
  try {
    names = await readdir(sourceDir);
  } catch {
    return null;
  }
  for (const stem of [prompt.id, prompt.audience]) {
    const name = names.find((n) => path.basename(n, path.extname(n)).toLowerCase() === stem && PHOTO_TYPES.includes(path.extname(n).toLowerCase()));
    if (name) return path.join(sourceDir, name);
  }
  return null;
}

/** What the bytes are, whatever the response did or did not say. */
function extensionOf(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return ".png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return ".jpg";
  if (bytes.toString("latin1", 8, 12) === "WEBP") return ".webp";
  return ".png";
}

/** The first image in an Interactions response. */
function imageFrom(interaction) {
  if (interaction?.output_image?.data) return interaction.output_image.data;
  for (const step of interaction?.steps ?? []) {
    for (const block of step.content ?? []) if (block.type === "image" && block.data) return block.data;
  }
  return null;
}

/** The key has no quota for this model: every later request would fail too. */
class QuotaError extends Error {}

async function generate(text, aspect, photo) {
  const input = photo
    ? [
        { type: "image", mime_type: "image/jpeg", data: photo.toString("base64") },
        { type: "text", text },
      ]
    : text;
  const body = {
    model,
    input,
    // JPEG: the only output this model accepts ("image/png" is a 400).
    response_format: { type: "image", mime_type: "image/jpeg", image_size: "1K", ...(aspect && { aspect_ratio: aspect }) },
  };

  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    if (res.ok) {
      const data = imageFrom(await res.json());
      if (!data) throw new Error("the response held no image (the request may have been declined)");
      return Buffer.from(data, "base64");
    }
    const detail = (await res.json().catch(() => ({})))?.error?.message ?? res.statusText;
    // Out of quota, not just busy: a "limit: 0" free tier, or a wait of hours.
    // Waiting would only hang the script, so stop and say what to do.
    const retryAfter = Number(res.headers.get("retry-after")) * 1000;
    if (res.status === 429 && (/limit: 0\b/.test(detail) || retryAfter > 120_000)) {
      throw new QuotaError(detail);
    }
    // Busy or briefly rate-limited: wait and retry a few times before giving up.
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const wait = retryAfter || attempt * 15_000;
      console.log(`    … ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
}

// --- the prompts --------------------------------------------------------------
const prompts = [];
try {
  for (let cursor = null; ; ) {
    const res = await fetch(`${base}/api/v1/prompts?limit=100&sort=oldest${cursor ? `&cursor=${cursor}` : ""}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = await res.json();
    prompts.push(...page.data);
    cursor = page.meta.nextCursor;
    if (!cursor) break;
  }
} catch (err) {
  die(`Could not reach the site at ${base} (${err.message}). Start it with \`npm run dev\` first.`);
}
const chosen = only ? prompts.filter((p) => only.includes(p.id)) : prompts;
for (const id of only ?? []) if (!prompts.some((p) => p.id === id)) console.log(`  ? ${id}: no prompt with that id`);
if (!dryRun && !apiKey) die("GEMINI_API_KEY is not set in .env.local — get one at aistudio.google.com.");

await mkdir(outDir, { recursive: true });
const existing = new Set((await readdir(outDir)).map((n) => path.basename(n, path.extname(n))));

console.log(`\n${chosen.length} prompt(s), model ${model}, into ${outDir}`);
if (dryRun) console.log("Dry run — nothing will be generated or billed.");

let made = 0;
let skipped = 0;
let failed = 0;
for (const prompt of chosen) {
  if (existing.has(prompt.id) && !force) {
    console.log(`  - ${prompt.id}: samples/${prompt.id}.* already exists — skipped (use --force to replace)`);
    skipped++;
    continue;
  }
  const { text, aspect } = prepare(prompt.prompt);
  const editsPhoto = prompt.tags.includes("photo-edit");
  let photo = null;
  if (editsPhoto) {
    const file = await sourcePhotoFor(prompt);
    if (!file) {
      console.log(`  ! ${prompt.id}: edits a photo — add samples/source/${prompt.id}.jpg or samples/source/${prompt.audience}.jpg — skipped`);
      skipped++;
      continue;
    }
    // Smaller and EXIF-free before it leaves the machine: no location data
    // goes to Google, and the request stays light.
    if (!dryRun) photo = await sharp(await readFile(file)).rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    console.log(`  ${dryRun ? "+" : "…"} ${prompt.id}: from ${path.relative(outDir, file)}${aspect ? `, ${aspect}` : ""}`);
  } else {
    console.log(`  ${dryRun ? "+" : "…"} ${prompt.id}: text only${aspect ? `, ${aspect}` : ""}`);
  }
  if (dryRun) {
    made++;
    continue;
  }
  try {
    const bytes = await generate(text, aspect, photo);
    const file = path.join(outDir, `${prompt.id}${extensionOf(bytes)}`);
    await writeFile(file, bytes);
    console.log(`    saved ${path.basename(file)} (${Math.round(bytes.length / 1024)} KB)`);
    made++;
  } catch (err) {
    console.log(`    failed: ${err.message}`);
    failed++;
    if (err instanceof QuotaError) {
      console.log(
        "\nThis key has no image quota (Gemini's free tier allows none for image models)." +
          "\nEnable billing for its project at https://ai.dev/rate-limit, then run this again.",
      );
      break;
    }
  }
}

console.log(
  `\n${dryRun ? "Would generate" : "Generated"} ${made}, skipped ${skipped}${failed ? `, failed ${failed}` : ""}.` +
    (made && !dryRun ? " Look them over in samples/, then: npm run samples:upload -- --caption \"Made with Gemini\"" : "") +
    "\n",
);
