#!/usr/bin/env node
/**
 * Uploads a folder of sample images to their prompts, through a running copy
 * of the site — so each goes through the same route as an upload from the
 * browser: format check, re-encode, EXIF stripped, resized.
 *
 *   npm run samples:upload -- --dry-run        say what would happen
 *   npm run samples:upload                     upload
 *   npm run samples:upload -- --force          also to prompts that have samples
 *   npm run samples:upload -- path/to/folder   another folder (default: samples/)
 *
 * Name each file after its prompt's id: `golden-hour-saree.png`, and
 * `golden-hour-saree-2.png` for a second. JPEG, PNG, WebP or AVIF.
 *
 * Needs the site running (`npm run dev`, or SITE_BASE=https://… for another)
 * and ADMIN_PASSPHRASE in .env.local, the same one the site uses.
 *
 * A prompt that already has samples is skipped unless --force: an image has
 * no natural key, so a second run would otherwise upload everything twice.
 */
import "./load-env.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const folder = path.resolve(args.find((a) => !a.startsWith("--")) ?? "samples");
const base = (process.env.SITE_BASE || "http://localhost:3000").replace(/\/$/, "");
const passphrase = process.env.ADMIN_PASSPHRASE ?? "";

/** The site's own cap (MAX_SAMPLE_BYTES), with a little room. */
const MAX_BYTES = 4 * 1024 * 1024 - 64 * 1024;
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

// --- what is in the folder ----------------------------------------------------
let names;
try {
  names = (await readdir(folder)).filter((n) => TYPES[path.extname(n).toLowerCase()]).sort();
} catch {
  die(`No folder at ${folder}. Create it and put the images in, named after their prompts.`);
}
if (names.length === 0) die(`No JPEG, PNG, WebP or AVIF files in ${folder}.`);

// --- the prompts the site knows -----------------------------------------------
const ids = new Set();
try {
  for (let cursor = null; ; ) {
    const res = await fetch(`${base}/api/v1/prompts?limit=100&sort=oldest${cursor ? `&cursor=${cursor}` : ""}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = await res.json();
    for (const p of page.data) ids.add(p.id);
    cursor = page.meta.nextCursor;
    if (!cursor) break;
  }
} catch (err) {
  die(`Could not reach the site at ${base} (${err.message}). Start it with \`npm run dev\` first.`);
}

/** `golden-hour-saree-2.png` → golden-hour-saree; an id that itself ends in a number wins. */
function promptIdOf(name) {
  const stem = path.basename(name, path.extname(name)).toLowerCase();
  if (ids.has(stem)) return stem;
  const numbered = /^(.*)-\d+$/.exec(stem);
  return numbered && ids.has(numbered[1]) ? numbered[1] : null;
}

/**
 * The plain name first, then -2, -3…: the first sample becomes the card's
 * cover. Alphabetical order put `x-2.png` before `x.png` ("-" sorts before
 * "."), so the second picture became the cover.
 */
const order = (name) => Number(/-(\d+)\.[^.]+$/.exec(name)?.[1] ?? 1);
names.sort((a, b) => order(a) - order(b) || a.localeCompare(b));

const plan = new Map();
const unknown = [];
for (const name of names) {
  const id = promptIdOf(name);
  if (!id) unknown.push(name);
  else plan.set(id, [...(plan.get(id) ?? []), name]);
}

console.log(`\n${names.length} image(s) in ${folder}, for ${plan.size} prompt(s), uploading to ${base}`);
if (dryRun) console.log("Dry run — nothing will be uploaded.");
for (const name of unknown) console.log(`  ? ${name}: no prompt with that id — skipped`);

// --- sign in ------------------------------------------------------------------
let cookie = "";
if (!dryRun) {
  if (!passphrase) die("ADMIN_PASSPHRASE is not set in .env.local — the site needs it to accept uploads.");
  const res = await fetch(`${base}/api/admin/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  if (!res.ok) die(`Sign-in failed (HTTP ${res.status}): ${(await res.json().catch(() => ({}))).error ?? ""}`);
  cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
}

// --- upload -------------------------------------------------------------------
let uploaded = 0;
let skipped = 0;
for (const [id, files] of plan) {
  if (!force) {
    const existing = await (await fetch(`${base}/api/prompts/${id}/images`)).json();
    if (existing.images?.length) {
      console.log(`  - ${id}: already has ${existing.images.length} sample(s) — skipped (use --force to add anyway)`);
      skipped += files.length;
      continue;
    }
  }
  for (const name of files) {
    let bytes = await readFile(path.join(folder, name));
    let type = TYPES[path.extname(name).toLowerCase()];
    // AI tools often export large PNGs. Shrunk here only to fit the upload
    // cap; the site re-encodes it to its own size and format anyway.
    if (bytes.length > MAX_BYTES) {
      bytes = await sharp(bytes).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
      type = "image/jpeg";
    }
    if (dryRun) {
      console.log(`  + ${id}: ${name} (${Math.round(bytes.length / 1024)} KB)`);
      uploaded++;
      continue;
    }
    const form = new FormData();
    form.append("image", new Blob([bytes], { type }), name);
    const res = await fetch(`${base}/api/prompts/${id}/images`, { method: "POST", headers: { cookie }, body: form });
    if (res.ok) {
      console.log(`  + ${id}: ${name}`);
      uploaded++;
    } else {
      console.log(`  ! ${id}: ${name} — ${(await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`}`);
      skipped++;
    }
  }
}

console.log(`\n${dryRun ? "Would upload" : "Uploaded"} ${uploaded}, skipped ${skipped + unknown.length}.\n`);
