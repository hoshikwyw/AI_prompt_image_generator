import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { tagCounts } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/v1/tags — every tag in use, most used first. What `?tag=` accepts. */
export async function GET() {
  const tags = tagCounts(await listPrompts());
  return apiJson({ data: tags.map(({ tag, count }) => ({ id: tag, count })) }, CACHE.taxonomy);
}

export const OPTIONS = preflight;
