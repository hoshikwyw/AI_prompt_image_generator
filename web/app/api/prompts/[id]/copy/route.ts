import { recordCopy } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Fired by the copy button. Counting copies is the only usage signal this app
 * has, so it is worth a request — but a failed count must never block the
 * clipboard write, so the client sends this without awaiting it.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/prompts/[id]/copy">) {
  const { id } = await ctx.params;
  const prompt = await recordCopy(id);
  if (!prompt) return Response.json({ error: "Prompt not found." }, { status: 404 });

  return Response.json({ copies: prompt.copies }, { headers: { "Cache-Control": "no-store" } });
}
