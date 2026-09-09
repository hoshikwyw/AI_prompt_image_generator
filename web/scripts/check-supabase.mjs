#!/usr/bin/env node
/**
 * Setup check: does the schema in supabase/migrations actually exist in the
 * project the env vars point at?
 *
 * Run after applying the migration:  npm run supabase:check
 *
 * Prints what it found and exits non-zero on the first real problem, so it is
 * usable as a gate before pointing the app at a project. Never prints a key.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Next loads .env.local itself; a bare node script has to do it by hand.
for (const file of [".env.local", ".env"]) {
  try {
    // Split on \r?\n: a file edited on Windows can carry CRLF, and a trailing
    // \r left on the line would otherwise beat the value regex below.
    for (const line of readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split(
      /\r?\n/,
    )) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Missing env file is fine; the checks below report what is absent.
  }
}

const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = process.env.SUPABASE_BUCKET || "prompt-samples";

const ok = (msg) => console.log(`  ok    ${msg}`);
const warn = (msg) => console.log(`  warn  ${msg}`);
const fail = (msg) => {
  console.log(`  FAIL  ${msg}`);
  process.exitCode = 1;
};

console.log("\nSupabase setup check\n");

if (!url || !anonKey) {
  fail("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  console.log("\n  Copy web/.env.example to web/.env.local and fill it in.\n");
  process.exit(1);
}
ok(`project ${url}`);

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, anonKey, options);
const admin = serviceKey ? createClient(url, serviceKey, options) : null;

// --- tables, through the anon key, which is what page loads use -------------
for (const table of ["prompts", "prompt_images"]) {
  const { error, count } = await anon.from(table).select("*", { count: "exact", head: true });
  if (error) fail(`table "${table}" unreadable with the anon key: ${error.message}`);
  else ok(`table "${table}" readable, ${count} row${count === 1 ? "" : "s"}`);
}

// --- RLS really is read-only for anon --------------------------------------
const probeId = `rls-probe-${Date.now()}`;
const { error: writeError } = await anon
  .from("prompts")
  .insert({ id: probeId, title: "RLS probe", body: "should never be inserted" });
if (!writeError) {
  fail("the anon key could INSERT — RLS is not restricting writes. Re-run the migration.");
  if (admin) await admin.from("prompts").delete().eq("id", probeId);
} else {
  ok(`anon writes are blocked (${writeError.code ?? "rejected"})`);
}

// --- service role ----------------------------------------------------------
if (!admin) {
  warn("SUPABASE_SERVICE_ROLE_KEY is not set — reads will work, writes will not.");
} else {
  const { error } = await admin.from("prompts").select("id", { head: true });
  if (error) fail(`service_role key rejected: ${error.message}`);
  else ok("service_role key works");

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  if (bucketError) fail(`could not list storage buckets: ${bucketError.message}`);
  else {
    const found = buckets.find((b) => b.id === bucket);
    if (!found) fail(`bucket "${bucket}" is missing — re-run the migration.`);
    else if (!found.public) fail(`bucket "${bucket}" is not public.`);
    else ok(`bucket "${bucket}" exists and is public`);
  }

  const { error: rpcError } = await admin.rpc("increment_prompt_copies", { p_id: "__nonexistent__" });
  if (rpcError) fail(`increment_prompt_copies() missing or broken: ${rpcError.message}`);
  else ok("increment_prompt_copies() present");
}

console.log(
  process.exitCode ? "\nSomething is off — see FAIL above.\n" : "\nSupabase looks ready.\n",
);
