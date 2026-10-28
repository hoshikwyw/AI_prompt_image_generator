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

// Deliberately not NEXT_PUBLIC_*: nothing in the browser talks to Supabase, and
// a NEXT_PUBLIC value is inlined at build time, which would bake the choice of
// backend into the bundle instead of reading it when the server starts.
const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Where sample images live. Created by the initial migration. */
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "prompt-samples";

/** True when the app should read from Postgres instead of `.data/`. */
export const supabaseConfigured = (): boolean => Boolean(url && anonKey);

/** True when writes are possible. Reads can work without this. */
const supabaseCanWrite = (): boolean => Boolean(url && serviceKey);

/**
 * Sessions are pointless here — every request builds its own client and there
 * is no logged-in user to persist. Turning this off also stops the server
 * client from reaching for browser storage it does not have.
 */
const auth = { persistSession: false, autoRefreshToken: false } as const;

/**
 * supabase-js sets no timeout of its own, so an unreachable project — paused,
 * deleted, or down — left every request hanging until the platform killed the
 * function: ~50 s locally, a slow blank page for visitors in production.
 * Giving up early turns that into a prompt error page instead.
 *
 * Reads are small queries; writes can carry a 4 MB image upload, so they get
 * longer. A caller's own abort signal still applies alongside the timeout.
 */
const READ_TIMEOUT_MS = 5_000;
const WRITE_TIMEOUT_MS = 20_000;

function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}

let readClient: SupabaseClient | null = null;
let writeClient: SupabaseClient | null = null;

export function supabaseRead(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }
  readClient ??= createClient(url, anonKey, {
    auth,
    global: { fetch: fetchWithTimeout(READ_TIMEOUT_MS) },
    // supabase-js retries failed reads three times with 1–4 s backoff, which
    // multiplies the timeout above: a dead project took 27 s to fail instead
    // of 5. A visitor is better served by a fast error page than a slow one.
    db: { retry: false },
  });
  return readClient;
}

export function supabaseWrite(): SupabaseClient {
  if (!supabaseCanWrite()) {
    throw new Error("Supabase writes need SUPABASE_SERVICE_ROLE_KEY.");
  }
  writeClient ??= createClient(url, serviceKey, {
    auth,
    global: { fetch: fetchWithTimeout(WRITE_TIMEOUT_MS) },
  });
  return writeClient;
}

/** Public URL for an object in the samples bucket. */
export function publicImageUrl(storagePath: string): string {
  return supabaseRead().storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
