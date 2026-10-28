import { CACHE, apiJson, notFound, preflight, toPublicImage, toPublicPrompt } from "@/lib/public-api";
import { getPrompt, listImages } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/v1/prompts/{id} — one prompt, with every sample image. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/prompts/[id]">) {
  const { id } = await ctx.params;
  const prompt = await getPrompt(id);
  if (!prompt) return notFound("prompt");

  const { origin } = new URL(request.url);
  const images = (await listImages([prompt.id])).get(prompt.id) ?? [];

  return apiJson(
    {
      data: {
        ...toPublicPrompt(prompt, origin, images[0]),
        images: images.map((image) => toPublicImage(image, origin)),
      },
    },
    CACHE.content,
  );
}

export const OPTIONS = preflight;
