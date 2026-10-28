import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { activeBackend } from "./store";

/**
 * The write gate.
 *
 * Reading is public — that is the whole point of the app. Writing is not, and
 * the service_role key behind every write bypasses RLS entirely, so the gate
 * here is the only thing between an anonymous visitor and the collection.
 *
 * The policy depends on what a write would reach:
 *
 * - `gated`  — ADMIN_PASSPHRASE is set. Writes need the session cookie.
 * - `locked` — no passphrase, but the backend is Supabase. Shared data must
 *              never be editable by anyone who finds the URL, so writes are
 *              refused outright rather than left open.
 * - `open`   — no passphrase and the local JSON backend. A collection on your
 *              own machine should not need a password to edit.
 */

const passphrase = process.env.ADMIN_PASSPHRASE ?? "";

export const COOKIE_NAME = "pb_admin";
const SESSION_DAYS = 30;

export type WritePolicy = "open" | "gated" | "locked";

/**
 * True on a serverless host using the local JSON backend — Vercel without
 * Supabase. Its file system is read-only, so every write would fail; better to
 * say so up front than to offer an editor whose every save ends in a 500.
 */
export const storageIsReadOnly = (): boolean =>
  activeBackend() === "disk" && Boolean(process.env.VERCEL);

export function writePolicy(): WritePolicy {
  if (storageIsReadOnly()) return "locked";
  if (passphrase) return "gated";
  return activeBackend() === "supabase" ? "locked" : "open";
}

/** Equal-length digests, so the comparison cannot leak the passphrase by timing. */
function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHmac("sha256", "compare").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function checkPassphrase(input: string): boolean {
  if (!passphrase || !input) return false;
  return sameSecret(input, passphrase);
}

/**
 * `<expiry>.<hmac>`, keyed by the passphrase itself — so changing the
 * passphrase invalidates every session that was issued under the old one.
 */
function sign(expiresAt: number, nonce: string): string {
  return createHmac("sha256", passphrase).update(`${expiresAt}.${nonce}`).digest("base64url");
}

export function createSessionToken(): { token: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = Date.now() + maxAge * 1000;
  const nonce = randomBytes(9).toString("base64url");
  return { token: `${expiresAt}.${nonce}.${sign(expiresAt, nonce)}`, maxAge };
}

function verifySessionToken(token: string | undefined): boolean {
  if (!passphrase || !token) return false;
  const [expiresRaw, nonce, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || !nonce || !signature) return false;
  if (expiresAt < Date.now()) return false;
  return sameSecret(signature, sign(expiresAt, nonce));
}

/**
 * True when the browser says the request came from another site. The session
 * cookie is SameSite=Lax, so a gated collection was already safe from that —
 * but an open one (local, no passphrase) needs no cookie at all, and any page
 * open in the same browser could POST a replace-import to localhost as a
 * plain text/plain request, with no preflight to stop it. Browsers send
 * Sec-Fetch-Site on every request; Origin is the fallback for older ones. A
 * request with neither (curl, a script) is not a browser being tricked.
 */
async function crossSite(): Promise<boolean> {
  const h = await headers();
  const site = h.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = h.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== h.get("host");
  } catch {
    return true;
  }
}

/** True when this request may write. Pages call it to decide what to render. */
export async function isAdmin(): Promise<boolean> {
  const policy = writePolicy();
  if (policy === "open") return true;
  if (policy === "locked") return false;
  return verifySessionToken((await cookies()).get(COOKIE_NAME)?.value);
}

/**
 * Route guard. Returns a response to send back, or null to carry on — so a
 * handler reads `const denied = await requireAdmin(); if (denied) return denied;`
 * and cannot forget to act on the result the way a boolean invites.
 */
export async function requireAdmin(): Promise<Response | null> {
  if (await crossSite()) {
    return Response.json({ error: "Writes must come from this site." }, { status: 403 });
  }
  if (await isAdmin()) return null;

  if (writePolicy() === "locked") {
    return Response.json(
      {
        error: storageIsReadOnly()
          ? "Editing is disabled: this deployment has no database, and its file system is read-only. Connect Supabase to edit here, or change web/lib/seed.ts and redeploy."
          : "Editing is disabled: this collection is shared, and no ADMIN_PASSPHRASE is set. Set one to enable it.",
      },
      { status: 403 },
    );
  }
  return Response.json({ error: "Sign in to edit the collection." }, { status: 401 });
}

// --- login throttling -------------------------------------------------------
//
// One process, one map: enough to make guessing a passphrase pointless, and it
// resets on deploy. A distributed deployment would need this in Postgres.

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Bounds on the map. Expired windows were only ever replaced when the same
 * address came back, so a stream of attempts from fresh addresses grew it
 * forever. Past SWEEP_AT entries the expired ones are dropped; at MAX_TRACKED
 * the oldest goes (a Map iterates in insertion order).
 */
const SWEEP_AT = 1_000;
const MAX_TRACKED = 10_000;

function prune(now: number) {
  if (attempts.size < SWEEP_AT) return;
  for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key);
  while (attempts.size >= MAX_TRACKED) {
    const oldest = attempts.keys().next().value;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
}

export function throttle(key: string): { allowed: boolean; retryInSeconds: number } {
  const now = Date.now();
  prune(now);
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return { allowed: true, retryInSeconds: 0 };
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryInSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryInSeconds: 0 };
}

export function clearThrottle(key: string): void {
  attempts.delete(key);
}
