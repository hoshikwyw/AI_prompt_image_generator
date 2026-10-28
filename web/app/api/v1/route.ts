import { CACHE, apiJson, preflight } from "@/lib/public-api";

/**
 * GET /api/v1 — what this API offers, for anyone who opens the base URL. Full
 * documentation lives at /api.
 */
export function GET(request: Request) {
  const base = `${new URL(request.url).origin}/api/v1`;
  return apiJson(
    {
      name: "Promptbook API",
      version: "v1",
      description:
        "Free, read-only access to ready-to-copy AI image prompts. No key needed; CORS is open.",
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
      },
    },
    CACHE.taxonomy,
  );
}

export const OPTIONS = preflight;
