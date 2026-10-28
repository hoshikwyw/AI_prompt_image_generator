import { storageIsReadOnly } from "@/lib/admin";
import { NO_STORE, errorResponse } from "@/lib/http";
import { clientAddress } from "@/lib/rate-limit";
import { recordCopy } from "@/lib/store";

export const runtime = "nodejs";

/**
 * One count per address per prompt in this window. "Most copied" is the
 * default sort, so an unchecked counter let a loop of requests put any prompt
 * at the top of everyone's library. Per instance, like the login throttle — a
 * determined script still gets through, but no longer at the speed of a loop.
 */
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_TRACKED = 10_000;
const recent = new Map<string, number>();

function alreadyCounted(key: string, now: number): boolean {
  const until = recent.get(key);
  if (until !== undefined && until > now) return true;
  if (recent.size >= MAX_TRACKED) {
    for (const [k, expiry] of recent) if (expiry <= now) recent.delete(k);
    // Still full of live entries: drop the oldest (a Map keeps insertion order).
    while (recent.size >= MAX_TRACKED) recent.delete(recent.keys().next().value!);
  }
  recent.set(key, now + COOLDOWN_MS);
  return false;
}

/**
 * Fired by the copy button. Counting copies is the only usage signal this app
 * has, so it is worth a request — but a failed count must never block the
 * clipboard write, so the client sends this without awaiting it.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/prompts/[id]/copy">) {
  // Nowhere to write it: every count was an EROFS 500 in the logs.
  if (storageIsReadOnly()) return new Response(null, { status: 204 });

  const { id } = await ctx.params;
  if (alreadyCounted(`${clientAddress(request)}:${id}`, Date.now())) {
    return new Response(null, { status: 204 });
  }

  try {
    const prompt = await recordCopy(id);
    if (!prompt) return errorResponse("Prompt not found.", 404);
    return Response.json({ copies: prompt.copies }, { headers: NO_STORE });
  } catch (err) {
    // A database without the service-role key, or one that is down.
    console.error("Copy count failed:", err);
    return errorResponse("The copy was not counted.", 503);
  }
}
