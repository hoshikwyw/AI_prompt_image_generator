import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/categories — every category with its display label and how many
 * prompts it holds. The ids are what `?category=` accepts.
 */
export async function GET(request: Request) {
  const limited = await limitApiRequest(request, "categories");
  if (limited) return limited;

  const prompts = await listPrompts();
  return apiJson(
    {
      data: CATEGORIES.map((id) => ({
        id,
        label: CATEGORY_LABELS[id],
        count: prompts.filter((p) => p.category === id).length,
      })),
    },
    CACHE.taxonomy,
  );
}

export const OPTIONS = preflight;
