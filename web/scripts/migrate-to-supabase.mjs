#!/usr/bin/env node
/**
 * Push the local collection into Supabase.
 *
 *   npm run supabase:migrate -- --dry-run    say what would happen, change nothing
 *   npm run supabase:migrate                 upsert prompts, upload missing images
 *   npm run supabase:migrate -- --replace    wipe the remote collection first
 *
 * Safe to run twice. Prompts upsert by id and keep their original `created_at`;
 * images are only uploaded for prompts that have none in Supabase yet, since an
 * uploaded image has no natural key to deduplicate on and a second run would
 * otherwise pile up copies.
 *
 * This talks to Postgres directly rather than through lib/store, because the
 * app's module graph is server-only Next code. The column mapping below is the
 * one thing it duplicates; the migration in supabase/migrations is the source
 * of truth for those names.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const root = new URL("..", import.meta.url);

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(new URL(file, root), "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No env file is a problem the checks below report properly.
  }
}

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = process.env.SUPABASE_BUCKET || "prompt-samples";

const dryRun = process.argv.includes("--dry-run");
const replace = process.argv.includes("--replace");

if (!url || !serviceKey) {
  console.error(
    "\nSUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see web/.env.example).\n",
  );
  process.exit(1);
}

const collectionPath = path.join(process.cwd(), ".data", "collection.json");
let collection;
try {
  collection = JSON.parse(await readFile(collectionPath, "utf8"));
} catch {
  console.error(`\nNo local collection at ${collectionPath} — nothing to migrate.\n`);
  process.exit(1);
}

const prompts = Array.isArray(collection.prompts) ? collection.prompts : [];
const images = Array.isArray(collection.images) ? collection.images : [];

const toRow = (p) => ({
  id: p.id,
  title: p.title,
  summary: p.summary ?? "",
  body: p.body,
  notes: p.notes ?? "",
  category: p.category ?? "other",
  tags: p.tags ?? [],
  target_model: p.targetModel ?? "any",
  source: p.source ?? "",
  accent: p.accent ?? "",
  favorite: Boolean(p.favorite),
  copies: Number.isFinite(p.copies) ? p.copies : 0,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nMigrating ${prompts.length} prompt(s) and ${images.length} image(s) to ${url}`);
if (dryRun) console.log("Dry run — nothing will be written.\n");

// --- what is already there --------------------------------------------------
const { data: existing, error: readError } = await db.from("prompts").select("id, created_at");
if (readError) {
  console.error(`\nCould not read the remote collection: ${readError.message}\n`);
  process.exit(1);
}
const remoteCreatedAt = new Map((existing ?? []).map((r) => [r.id, r.created_at]));

const { data: remoteImages, error: imageReadError } = await db
  .from("prompt_images")
  .select("prompt_id, storage_path");
if (imageReadError) {
  console.error(`\nCould not read remote images: ${imageReadError.message}\n`);
  process.exit(1);
}
const promptsWithImages = new Set((remoteImages ?? []).map((r) => r.prompt_id));

// --- replace ----------------------------------------------------------------
if (replace && remoteCreatedAt.size > 0) {
  console.log(`  replace: removing ${remoteCreatedAt.size} remote prompt(s) and their images`);
  if (!dryRun) {
    const paths = (remoteImages ?? []).map((r) => r.storage_path);
    if (paths.length > 0) await db.storage.from(bucket).remove(paths);
    // Image rows cascade with the prompts.
    const { error } = await db.from("prompts").delete().neq("id", "");
    if (error) {
      console.error(`\nCould not clear the remote collection: ${error.message}\n`);
      process.exit(1);
    }
    remoteCreatedAt.clear();
    promptsWithImages.clear();
  }
}

// --- prompts ----------------------------------------------------------------
let added = 0;
let updated = 0;
const rows = prompts.map((p) => {
  const remote = remoteCreatedAt.get(p.id);
  if (remote === undefined) added++;
  else updated++;
  // An existing row keeps the creation date it already has.
  return { ...toRow(p), created_at: remote ?? p.createdAt };
});

if (!dryRun) {
  for (let i = 0; i < rows.length; i += 250) {
    const { error } = await db.from("prompts").upsert(rows.slice(i, i + 250), { onConflict: "id" });
    if (error) {
      console.error(`\nPrompt upsert failed: ${error.message}\n`);
      process.exit(1);
    }
  }
}
console.log(`  prompts: ${added} added, ${updated} updated`);

// --- images -----------------------------------------------------------------
let uploaded = 0;
let skipped = 0;
const promptIds = new Set(prompts.map((p) => p.id));

for (const image of images) {
  if (!promptIds.has(image.promptId)) {
    skipped++;
    continue;
  }
  // Its prompt already has images remotely: assume this one is among them
  // rather than risk a duplicate on every run.
  if (promptsWithImages.has(image.promptId)) {
    skipped++;
    continue;
  }

  const local = path.join(process.cwd(), ".data", "images", image.file);
  let bytes;
  try {
    bytes = await readFile(local);
  } catch {
    console.log(`  ! missing file for image ${image.id} (${image.file}) — skipped`);
    skipped++;
    continue;
  }

  const extension = path.extname(image.file).replace(".", "") || "webp";
  const storagePath = `${image.promptId}/${randomUUID()}.${extension}`;

  if (!dryRun) {
    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: image.mime ?? "image/webp", upsert: false });
    if (uploadError) {
      console.log(`  ! upload failed for ${image.file}: ${uploadError.message}`);
      skipped++;
      continue;
    }

    const { error } = await db.from("prompt_images").insert({
      prompt_id: image.promptId,
      storage_path: storagePath,
      caption: image.caption ?? "",
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      mime: image.mime,
      position: image.position ?? 0,
      created_at: image.createdAt,
    });
    if (error) {
      // Never leave an object with no row pointing at it.
      await db.storage.from(bucket).remove([storagePath]);
      console.log(`  ! row insert failed for ${image.file}: ${error.message}`);
      skipped++;
      continue;
    }
  }
  uploaded++;
}
console.log(`  images:  ${uploaded} uploaded, ${skipped} skipped`);

console.log(
  dryRun
    ? "\nDry run finished. Re-run without --dry-run to apply.\n"
    : "\nDone. Set SUPABASE_URL and SUPABASE_ANON_KEY and restart to serve from Supabase.\n",
);
