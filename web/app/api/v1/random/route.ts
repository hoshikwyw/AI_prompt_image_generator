import {
  CACHE,
  apiError,
  apiJson,
  preflight,
  readFilter,
  toPublicPrompt,
} from "@/lib/public-api";
import { listImages, listPrompts } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/random — one random prompt, optionally narrowed with the same
 * filters as /api/v1/prompts (`?for=female&ai=gemini`). "Inspire me" in a
 * single call.
 *
 * Lives at /random rather than /prompts/random so it can never shadow a
 * prompt whose id happens to be "random".
 */
export async function GET(request: Request) {
  const limited = await limitApiRequest(request, "random");
  if (limited) return limited;

  const url = new URL(request.url);
  const filter = readFilter(url.searchParams);
  if (filter instanceof Response) return filter;

  const matches = await listPrompts(filter);
  if (matches.length === 0) {
    return apiError(404, "no_match", "No prompt matches those filters.");
  }

  const pick = matches[Math.floor(Math.random() * matches.length)];
  const cover = (await listImages([pick.id])).get(pick.id)?.[0];
  return apiJson({ data: toPublicPrompt(pick, url.origin, cover) }, CACHE.random);
}

export const OPTIONS = preflight;
