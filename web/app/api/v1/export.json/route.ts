import { allPublicPrompts, jsonLines } from "@/lib/dataset";
import { LICENCE } from "@/lib/openapi";
import { CACHE, apiStream, preflight, apiRoute } from "@/lib/public-api";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/export.json — every prompt in one file, in the same shape as
 * /api/v1/prompts. For datasets and offline use; cached for an hour, so a new
 * prompt can take that long to appear here.
 */
export const GET = apiRoute(async (request: Request) => {
  const limited = await limitApiRequest(request, "export");
  if (limited) return limited;

  const { origin } = new URL(request.url);
  const data = await allPublicPrompts(origin);
  const meta = {
    total: data.length,
    generatedAt: new Date().toISOString(),
    licence: LICENCE,
    attribution: `Prompts from Promptbook — ${origin}`,
  };
  return apiStream(jsonLines(data, meta), "application/json; charset=utf-8", CACHE.taxonomy);
});

export const OPTIONS = preflight;
