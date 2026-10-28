import { CACHE, apiJson, notFound, preflight, toPublicImage, toPublicPrompt, apiRoute } from "@/lib/public-api";
import { getPrompt, listImages } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** GET /api/v1/prompts/{id} — one prompt, with every sample image. */
export const GET = apiRoute(async (request: Request, ctx: RouteContext<"/api/v1/prompts/[id]">) => {
  const limited = await limitApiRequest(request, "prompt");
  if (limited) return limited;

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
});

export const OPTIONS = preflight;
