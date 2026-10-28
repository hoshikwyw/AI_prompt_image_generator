import { AUDIENCE_LABELS, CATEGORY_LABELS } from "@/lib/prompt";
import { shareCard } from "@/lib/share-card";
import { getPrompt } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /prompts/{id}/og — the link preview for a prompt with no sample image:
 * its title and summary on its own card colour, as the card in the library
 * looks. A prompt with a sample uses that picture instead (see the page's
 * generateMetadata).
 */
export async function GET(_request: Request, ctx: RouteContext<"/prompts/[id]/og">) {
  const { id } = await ctx.params;
  const prompt = await getPrompt(id);
  if (!prompt) return new Response("Not found", { status: 404 });

  const who = prompt.audience === "any" ? "For everyone" : `For ${AUDIENCE_LABELS[prompt.audience].toLowerCase()}`;
  return shareCard({
    title: prompt.title,
    subtitle: prompt.summary,
    eyebrow: `${CATEGORY_LABELS[prompt.category]} · ${who}`,
    accent: prompt.accent,
  });
}
