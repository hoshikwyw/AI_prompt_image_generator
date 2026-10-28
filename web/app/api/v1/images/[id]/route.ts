import { apiImage, notFound, preflight } from "@/lib/public-api";
import { readImageBytes } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Image ids are UUIDs; anything else is answered without a lookup. */
const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/images/{id} — a sample image's bytes, cached for a year.
 *
 * Every image URL the API hands out points here rather than at storage. An
 * image never changes under its id, so the CDN keeps it for good: storage is
 * read once per image, not once per view — which is what keeps the free
 * Supabase bandwidth allowance from running out.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/images/[id]">) {
  const limited = await limitApiRequest(request, "image");
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!IMAGE_ID.test(id)) return notFound("image");

  const found = await readImageBytes(id);
  return found ? apiImage(found.bytes, found.mime) : notFound("image");
}

export const OPTIONS = preflight;
