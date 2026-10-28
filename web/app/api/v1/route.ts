import { LICENCE } from "@/lib/openapi";
import { CACHE, apiJson, preflight, apiRoute } from "@/lib/public-api";
import { limitApiRequest } from "@/lib/rate-limit";

/**
 * GET /api/v1 — what this API offers, for anyone who opens the base URL. Full
 * documentation lives at /api.
 */
export const GET = apiRoute(async (request: Request) => {
  const limited = await limitApiRequest(request, "index");
  if (limited) return limited;

  const { origin } = new URL(request.url);
  const base = `${origin}/api/v1`;
  return apiJson(
    {
      name: "Promptbook API",
      version: "v1",
      description:
        "Free, read-only access to ready-to-copy AI image prompts. No key needed; CORS is open.",
      docs: `${origin}/api`,
      reference: `${origin}/api/reference`,
      openapi: `${base}/openapi.json`,
      licence: LICENCE,
      endpoints: {
        prompts: `${base}/prompts`,
        prompt: `${base}/prompts/{id}`,
        related: `${base}/prompts/{id}/related`,
        random: `${base}/random`,
        categories: `${base}/categories`,
        audiences: `${base}/audiences`,
        tools: `${base}/tools`,
        tags: `${base}/tags`,
        image: `${base}/images/{id}`,
        exportJson: `${base}/export.json`,
        exportCsv: `${base}/export.csv`,
      },
      mcp: `${origin}/api/mcp`,
      llms: `${origin}/llms.txt`,
    },
    CACHE.taxonomy,
  );
});

export const OPTIONS = preflight;
