import { requireAdmin } from "@/lib/admin";
import {
  ACCEPTED_SAMPLE_MIME,
  MAX_CAPTION,
  MAX_SAMPLE_BYTES,
  MAX_SAMPLE_LABEL,
} from "@/lib/prompt";
import { prepareSample } from "@/lib/sample-image";
import { addImage, listImages } from "@/lib/store";

export const runtime = "nodejs";

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

export async function GET(_request: Request, ctx: RouteContext<"/api/prompts/[id]/images">) {
  const { id } = await ctx.params;
  const images = (await listImages([id])).get(id) ?? [];
  return Response.json({ images }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Upload a sample image. Multipart, because the payload is a file — this is the
 * one place in the app that is not JSON.
 *
 * The declared type and size are checked first as a cheap filter, but the real
 * guarantee is that `prepareSample` re-encodes the bytes: a file that only
 * claims to be an image never reaches storage.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/prompts/[id]/images">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected multipart form data.", 400);
  }

  const file = form.get("image");
  if (!(file instanceof File)) return fail("No image uploaded.", 400);
  if (file.size === 0) return fail("That file is empty.", 400);
  if (file.size > MAX_SAMPLE_BYTES) return fail(`Images are capped at ${MAX_SAMPLE_LABEL}.`, 413);
  if (!ACCEPTED_SAMPLE_MIME.includes(file.type)) {
    return fail(`Unsupported image type "${file.type}". Use JPEG, PNG, WebP or AVIF.`, 415);
  }

  let prepared;
  try {
    prepared = await prepareSample(Buffer.from(await file.arrayBuffer()));
  } catch {
    return fail("That file could not be read as an image.", 415);
  }

  const image = await addImage(id, {
    bytes: prepared.bytes,
    mime: prepared.mime,
    extension: prepared.extension,
    width: prepared.width,
    height: prepared.height,
    caption: String(form.get("caption") ?? "")
      .trim()
      .slice(0, MAX_CAPTION),
  });

  if (!image) return fail("Prompt not found.", 404);
  return Response.json(image, { status: 201 });
}
