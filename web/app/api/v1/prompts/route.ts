import {
  CACHE,
  apiJson,
  nextCursor,
  preflight,
  readFilter,
  readPaging,
  toPublicPrompt,
} from "@/lib/public-api";
import { listImages, listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/v1/prompts — search and filter the collection, a page at a time.
 *
 *   ?q=saree &category=fashion &for=female &ai=gemini &tag=photo-edit
 *   &featured=true &sort=most-copied|recent|oldest|title &limit=20 &cursor=…
 *
 * With `for` or `ai`, prompts aimed at that choice come first, then the ones
 * that suit anyone — the same ranking the site uses.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = readFilter(url.searchParams);
  if (filter instanceof Response) return filter;
  const paging = readPaging(url.searchParams);
  if (paging instanceof Response) return paging;

  const matches = await listPrompts(filter);
  const page = matches.slice(paging.offset, paging.offset + paging.limit);
  // One query for the page's covers, not one per prompt.
  const images = await listImages(page.map((p) => p.id));

  return apiJson(
    {
      data: page.map((p) => toPublicPrompt(p, url.origin, images.get(p.id)?.[0])),
      meta: {
        total: matches.length,
        limit: paging.limit,
        nextCursor: nextCursor(paging.offset, paging.limit, matches.length),
      },
    },
    CACHE.content,
  );
}

export const OPTIONS = preflight;
