import {
  CACHE,
  apiError,
  apiJson,
  notFound,
  preflight,
  readPaging,
  toPublicPrompt,
  apiRoute,
} from "@/lib/public-api";
import { relatedPrompts } from "@/lib/prompt";
import { getPrompt, listImages, listPrompts } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/prompts/{id}/related?limit=4 — "more like this": prompts that
 * suit the same people, same category first. The site's own suggestions.
 */
export const GET = apiRoute(async (request: Request, ctx: RouteContext<"/api/v1/prompts/[id]/related">) => {
  const limited = await limitApiRequest(request, "related");
  if (limited) return limited;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  // One short list, not a paged one: a cursor here would be silently ignored.
  if (url.searchParams.has("cursor")) {
    return apiError(400, "invalid_parameter", "related takes no cursor; raise limit (up to 12) instead.", {
      param: "cursor",
    });
  }
  const paging = readPaging(url.searchParams, { fallback: 4, max: 12 });
  if (paging instanceof Response) return paging;

  const prompt = await getPrompt(id);
  if (!prompt) return notFound("prompt");

  const related = relatedPrompts(prompt, await listPrompts(), paging.limit);
  const images = await listImages(related.map((p) => p.id));

  return apiJson(
    { data: related.map((p) => toPublicPrompt(p, url.origin, images.get(p.id)?.[0])) },
    CACHE.content,
  );
});

export const OPTIONS = preflight;
