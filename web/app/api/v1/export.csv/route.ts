import { allPublicPrompts, csvLines } from "@/lib/dataset";
import { CACHE, apiStream, preflight, apiRoute } from "@/lib/public-api";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/export.csv — every prompt as a spreadsheet. List fields
 * (placeholders, tools, tags) are joined with " | "; `image` is the first
 * sample's URL. Cached for an hour.
 */
export const GET = apiRoute(async (request: Request) => {
  const limited = await limitApiRequest(request, "export");
  if (limited) return limited;

  const prompts = await allPublicPrompts(new URL(request.url).origin);
  return apiStream(csvLines(prompts), "text/csv; charset=utf-8", CACHE.taxonomy, {
    "Content-Disposition": 'attachment; filename="promptbook-prompts.csv"',
  });
});

export const OPTIONS = preflight;
