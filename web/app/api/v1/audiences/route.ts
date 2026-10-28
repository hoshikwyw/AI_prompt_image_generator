import { CACHE, apiJson, preflight } from "@/lib/public-api";
import { AUDIENCES, AUDIENCE_FILTERS, AUDIENCE_LABELS, type AudienceFilter } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/v1/audiences — who prompts are for. `count` is prompts aimed at
 * exactly that audience; `filterable` says whether `?for=` accepts it.
 * "any" is not filterable: those prompts already appear under every choice.
 */
export async function GET() {
  const prompts = await listPrompts();
  return apiJson(
    {
      data: AUDIENCES.map((id) => ({
        id,
        label: AUDIENCE_LABELS[id],
        count: prompts.filter((p) => p.audience === id).length,
        filterable: AUDIENCE_FILTERS.includes(id as AudienceFilter),
      })),
    },
    CACHE.taxonomy,
  );
}

export const OPTIONS = preflight;
