import { requireAdmin } from "@/lib/admin";
import { errorResponse } from "@/lib/http";
import { activeBackend, deleteImage, readImageBytes } from "@/lib/store";

export const runtime = "nodejs";

/** Image ids are UUIDs on both backends; anything else is a 404, not a Postgres error. */
const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Serves a sample image from the local backend.
 *
 * Supabase images are fetched straight from the public bucket and never come
 * through here, so this 404s when that backend is active rather than acting as
 * an unlimited proxy for it — /api/v1/images/{id} is the cached, rate-limited
 * way to fetch those through the app.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (activeBackend() !== "disk" || !IMAGE_ID.test(id)) return new Response("Not found", { status: 404 });

  const found = await readImageBytes(id);
  if (!found) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.mime,
      // The id is unique per upload and an image is never rewritten in place,
      // so this can be cached hard.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!IMAGE_ID.test(id)) return errorResponse("Image not found.", 404);
  return (await deleteImage(id))
    ? new Response(null, { status: 204 })
    : errorResponse("Image not found.", 404);
}
