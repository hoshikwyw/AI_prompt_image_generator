import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
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

export function writePolicy(): WritePolicy {
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
  if (await isAdmin()) return null;

  if (writePolicy() === "locked") {
    return Response.json(
      {
        error:
          "Editing is disabled: this collection is shared, and no ADMIN_PASSPHRASE is set. Set one to enable it.",
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

export function throttle(key: string): { allowed: boolean; retryInSeconds: number } {
  const now = Date.now();
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
