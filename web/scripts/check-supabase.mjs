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
import "./load-env.mjs";
import { createClient } from "@supabase/supabase-js";

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
// Real GETs, never `head: true`: a HEAD request for a table that does not
// exist comes back with no error and a null count, which this used to report
// as "readable, null rows" on a project with no schema at all.
let tablesExist = true;
for (const table of ["prompts", "prompt_images"]) {
  const { error, count } = await anon.from(table).select("*", { count: "exact" }).limit(1);
  if (error) {
    tablesExist = false;
    fail(`table "${table}" unreadable with the anon key: ${error.message}`);
  } else ok(`table "${table}" readable, ${count} row${count === 1 ? "" : "s"}`);
}

// --- the audience/models migration has been applied -------------------------
{
  const { error } = await anon.from("prompts").select("audience, models").limit(1);
  if (error) {
    fail(
      `prompts has no audience/models columns (${error.message}) — ` +
        "apply supabase/migrations/20261023000000_audience_and_models.sql.",
    );
  } else ok("audience and models columns present");
}

// --- RLS really is read-only for anon --------------------------------------
const probeId = `rls-probe-${Date.now()}`;
const { error: writeError } = await anon
  .from("prompts")
  .insert({ id: probeId, title: "RLS probe", body: "should never be inserted" });
if (!writeError) {
  fail("the anon key could INSERT — RLS is not restricting writes. Re-run the migration.");
  if (admin) await admin.from("prompts").delete().eq("id", probeId);
} else if (writeError.code === "42501") {
  ok("anon writes are blocked by row-level security");
} else if (!tablesExist) {
  // Refused because there is no table, which proves nothing about RLS.
  fail("cannot test write protection until the tables exist — apply supabase/migrations first.");
} else {
  warn(`anon insert was refused, but not by RLS (${writeError.code ?? "?"}: ${writeError.message})`);
}

// --- service role ----------------------------------------------------------
if (!admin) {
  warn("SUPABASE_SERVICE_ROLE_KEY is not set — reads will work, writes will not.");
} else {
  const { error } = await admin.from("prompts").select("id").limit(1);
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
