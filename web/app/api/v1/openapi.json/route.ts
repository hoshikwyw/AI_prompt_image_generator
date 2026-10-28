import { openApiSpec } from "@/lib/openapi";
import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { limitApiRequest } from "@/lib/rate-limit";

/**
 * GET /api/v1/openapi.json — the machine-readable description of this API.
 * Feeds the interactive reference at /api/reference, and lets anyone generate
 * a typed client in their own language.
 */
export async function GET(request: Request) {
  const limited = await limitApiRequest(request, "openapi");
  if (limited) return limited;

  return apiJson(openApiSpec(new URL(request.url).origin), CACHE.taxonomy);
}

export const OPTIONS = preflight;
