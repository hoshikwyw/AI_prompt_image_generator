import { openApiSpec } from "@/lib/openapi";
import { CACHE, apiJson, preflight } from "@/lib/public-api";

/**
 * GET /api/v1/openapi.json — the machine-readable description of this API.
 * Feeds the interactive reference at /api/reference, and lets anyone generate
 * a typed client in their own language.
 */
export function GET(request: Request) {
  return apiJson(openApiSpec(new URL(request.url).origin), CACHE.taxonomy);
}

export const OPTIONS = preflight;
