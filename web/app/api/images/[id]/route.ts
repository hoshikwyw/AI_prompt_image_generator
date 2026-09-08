import { requireAdmin } from "@/lib/admin";
import { deleteImage, readImageBytes } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Serves a sample image from the local backend.
 *
 * Supabase images are fetched straight from the public bucket and never come
 * through here, so this 404s when that backend is active rather than pretending
 * to be a proxy for it.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  const found = await readImageBytes(id);
  if (!found) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.mime,
      // The id is unique per upload and an image is never rewritten in place,
      // so this can be cached hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  return (await deleteImage(id))
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Image not found." }, { status: 404 });
}
