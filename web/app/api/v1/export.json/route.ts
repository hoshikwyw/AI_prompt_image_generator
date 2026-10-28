import { allPublicPrompts } from "@/lib/dataset";
import { LICENCE } from "@/lib/openapi";
import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/export.json — every prompt in one file, in the same shape as
 * /api/v1/prompts. For datasets and offline use; cached for an hour, so a new
 * prompt can take that long to appear here.
 */
export async function GET(request: Request) {
  const limited = await limitApiRequest(request, "export");
  if (limited) return limited;

  const { origin } = new URL(request.url);
  const data = await allPublicPrompts(origin);
  return apiJson(
    {
      data,
      meta: {
        total: data.length,
        generatedAt: new Date().toISOString(),
        licence: LICENCE,
        attribution: `Prompts from Promptbook — ${origin}`,
      },
    },
    CACHE.taxonomy,
  );
}

export const OPTIONS = preflight;
