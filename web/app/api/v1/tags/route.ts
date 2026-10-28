import { CACHE, apiJson, preflight, apiRoute } from "@/lib/public-api";
import { tagCounts } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** GET /api/v1/tags — every tag in use, most used first. What `?tag=` accepts. */
export const GET = apiRoute(async (request: Request) => {
  const limited = await limitApiRequest(request, "tags");
  if (limited) return limited;

  const tags = tagCounts(await listPrompts());
  return apiJson({ data: tags.map(({ tag, count }) => ({ id: tag, count })) }, CACHE.taxonomy);
});

export const OPTIONS = preflight;
