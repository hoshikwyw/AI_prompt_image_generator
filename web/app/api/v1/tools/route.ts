import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { AI_TOOLS, AI_TOOL_LABELS } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";
import { limitApiRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/v1/tools — the AI tools prompts can be tagged with. `count` is
 * prompts tagged with that tool; `meta.untagged` is prompts tagged with none,
 * which work anywhere and are included by every `?ai=` filter.
 */
export async function GET(request: Request) {
  const limited = await limitApiRequest(request, "tools");
  if (limited) return limited;

  const prompts = await listPrompts();
  return apiJson(
    {
      data: AI_TOOLS.map((id) => ({
        id,
        label: AI_TOOL_LABELS[id],
        count: prompts.filter((p) => p.models.includes(id)).length,
      })),
      meta: { untagged: prompts.filter((p) => p.models.length === 0).length },
    },
    CACHE.taxonomy,
  );
}

export const OPTIONS = preflight;
