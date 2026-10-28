// Holds the Upstash token; never part of a browser bundle.
import "server-only";
import { apiError } from "./public-api";

/**
 * Fair-use limits and usage counts for the public API, kept in Upstash Redis.
 *
 * Talks to Upstash's REST API with plain fetch — one pipelined request per
 * API call, no client library. Off entirely when the two variables are unset,
 * so the app runs unchanged locally and on a deployment that has not added
 * Upstash yet. Vercel's Upstash integration names them KV_REST_API_*, so those
 * are read too.
 *
 * Only requests that reach a route are counted. A response the CDN serves from
 * cache never runs this code: it costs nothing, so there is nothing to limit,
 * and every Upstash command saved stretches the free allowance.
 *
 * Fails open: if Upstash is slow or down, requests go through uncounted. An
 * outage of the counter must not become an outage of the API.
 */

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

/** Requests per minute per address. Tunable without a code change. */
export const RATE_LIMIT = Math.max(1, Number(process.env.API_RATE_LIMIT_PER_MINUTE) || 60);

/** Daily usage is kept this long, then expires by itself. */
const USAGE_DAYS = 90;

export const rateLimitConfigured = (): boolean => Boolean(url && token);

type Command = Array<string | number>;

/** Runs commands in one round trip. Null when Upstash cannot be reached in time. */
async function pipeline(commands: Command[]): Promise<unknown[] | null> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      // Generous for a single-digit-millisecond call, short enough that a
      // stalled counter barely delays the response it is guarding.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    return results.map((r) => r.result);
  } catch {
    return null;
  }
}

/**
 * The caller's address. Vercel puts the real client first in x-forwarded-for
 * and overwrites anything a client sends there, so it cannot be spoofed past
 * the edge. Locally there is no proxy, and everyone shares one bucket.
 */
function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

const today = (now: number) => new Date(now).toISOString().slice(0, 10);

/**
 * Counts this request, and returns a 429 to send back when the address is
 * over the limit — the same calling pattern as requireAdmin:
 *
 *   const limited = await limitApiRequest(request, "prompts");
 *   if (limited) return limited;
 *
 * A fixed one-minute window: the key includes the minute, so it starts over on
 * its own. The address only ever lives in a key that expires within two
 * minutes; the daily usage counts keep the endpoint name and nothing else.
 */
export async function limitApiRequest(request: Request, endpoint: string): Promise<Response | null> {
  const verdict = await checkRateLimit(request, endpoint);
  if (!verdict) return null;
  return apiError(
    429,
    "rate_limited",
    `Over ${RATE_LIMIT} requests a minute. Try again in ${verdict.retryAfter} seconds — and consider caching responses.`,
    { retryAfter: verdict.retryAfter },
    rateLimitHeaders(verdict),
  );
}

export interface RateLimited {
  retryAfter: number;
}

export const rateLimitHeaders = ({ retryAfter }: RateLimited): Record<string, string> => ({
  "Retry-After": String(retryAfter),
  "RateLimit-Limit": String(RATE_LIMIT),
  "RateLimit-Remaining": "0",
  "RateLimit-Reset": String(retryAfter),
});

/**
 * Addresses known to be over the limit, and until when — kept per server
 * instance. Once an address has had its 429, its further requests that minute
 * are turned away here without touching Upstash. Before this, every rejected
 * request still cost four commands, so one runaway script could spend the free
 * monthly allowance in minutes — after which limiting silently stopped.
 */
const blocked = new Map<string, number>();
/** The day this instance last set the usage key's expiry; once a day is enough. */
let usageExpirySetFor = "";

/** Counts the request; returns how long to wait when it is over the limit. */
export async function checkRateLimit(request: Request, endpoint: string): Promise<RateLimited | null> {
  if (!rateLimitConfigured()) return null;

  const now = Date.now();
  const address = clientAddress(request);
  const windowEnd = (Math.floor(now / 60_000) + 1) * 60_000;
  const retryAfter = Math.ceil((windowEnd - now) / 1000);

  const until = blocked.get(address);
  if (until !== undefined && until > now) return { retryAfter };
  if (blocked.size > 5_000) {
    for (const [key, expiry] of blocked) if (expiry <= now) blocked.delete(key);
  }

  const key = `rl:${address}:${Math.floor(now / 60_000)}`;
  const day = today(now);
  const usage = `usage:${day}`;
  const commands: Command[] = [
    ["INCR", key],
    ["HINCRBY", usage, endpoint, 1],
  ];
  if (usageExpirySetFor !== day) commands.push(["EXPIRE", usage, USAGE_DAYS * 86_400]);

  const results = await pipeline(commands);
  if (!results) return null;
  if (commands.length === 3) usageExpirySetFor = day;

  const count = Number(results[0]);
  // The counter's expiry is set once, by the request that created it, rather
  // than on every request — half the commands for every other call.
  if (count === 1) await pipeline([["EXPIRE", key, 120]]);
  if (!Number.isFinite(count) || count <= RATE_LIMIT) return null;

  blocked.set(address, windowEnd);
  return { retryAfter };
}

export interface UsageDay {
  day: string;
  total: number;
  byEndpoint: Record<string, number>;
}

/**
 * Requests per endpoint for each of the last `days` days, newest first —
 * for the admin page. Null when counting is off or Upstash cannot be reached.
 */
export async function readUsage(days: number): Promise<UsageDay[] | null> {
  if (!rateLimitConfigured()) return null;
  const now = Date.now();
  const dates = Array.from({ length: days }, (_, i) => today(now - i * 86_400_000));

  const results = await pipeline(dates.map((d) => ["HGETALL", `usage:${d}`]));
  if (!results) return null;

  return dates.map((day, i) => {
    // HGETALL answers with a flat [field, value, field, value, …] list.
    const flat = (results[i] as string[] | null) ?? [];
    const byEndpoint: Record<string, number> = {};
    for (let j = 0; j + 1 < flat.length; j += 2) byEndpoint[flat[j]] = Number(flat[j + 1]);
    return { day, total: Object.values(byEndpoint).reduce((a, b) => a + b, 0), byEndpoint };
  });
}
