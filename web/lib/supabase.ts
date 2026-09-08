// Importing this module from a client component is a build error. The
// service_role key must never reach a browser bundle, and a compile-time
// refusal beats trusting the bundler to have tree-shaken it out.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients, and the one place that decides whether Supabase is in play
 * at all. Server-only.
 *
 * Two clients, deliberately:
 *
 * - `supabaseRead()` uses the anon key and is bound by RLS, which allows
 *   nothing but SELECT. It is what public page loads go through.
 * - `supabaseWrite()` uses the service_role key, which bypasses RLS entirely.
 *   Only server routes behind the admin gate may call it.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Where sample images live. Created by the initial migration. */
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "prompt-samples";

/** True when the app should read from Postgres instead of `.data/`. */
export const supabaseConfigured = (): boolean => Boolean(url && anonKey);

/** True when writes are possible. Reads can work without this. */
export const supabaseCanWrite = (): boolean => Boolean(url && serviceKey);

/**
 * Sessions are pointless here — every request builds its own client and there
 * is no logged-in user to persist. Turning this off also stops the server
 * client from reaching for browser storage it does not have.
 */
const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

let readClient: SupabaseClient | null = null;
let writeClient: SupabaseClient | null = null;

export function supabaseRead(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  readClient ??= createClient(url, anonKey, options);
  return readClient;
}

export function supabaseWrite(): SupabaseClient {
  if (!supabaseCanWrite()) {
    throw new Error("Supabase writes need SUPABASE_SERVICE_ROLE_KEY.");
  }
  writeClient ??= createClient(url, serviceKey, options);
  return writeClient;
}

/** Public URL for an object in the samples bucket. */
export function publicImageUrl(storagePath: string): string {
  return supabaseRead().storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/** Reported by the setup check and the docs; safe to show, contains no secret. */
export function supabaseStatus() {
  return {
    url: url || null,
    hasAnonKey: Boolean(anonKey),
    hasServiceKey: Boolean(serviceKey),
    bucket: SUPABASE_BUCKET,
    backend: supabaseConfigured() ? ("supabase" as const) : ("disk" as const),
  };
}
