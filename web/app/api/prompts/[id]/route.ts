import { validateDraft, type PromptDraft } from "@/lib/prompt";
import { deletePrompt, getPrompt, updatePrompt } from "@/lib/store";

export const runtime = "nodejs";

const notFound = () => Response.json({ error: "Prompt not found." }, { status: 404 });
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(_request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const { id } = await ctx.params;
  const prompt = await getPrompt(id);
  return prompt ? Response.json(prompt, noStore) : notFound();
}

/**
 * Partial edit. The patch is merged onto the stored prompt and the *result* is
 * validated, so a one-field change still cannot leave a prompt with an empty
 * body, and the client gets the same error shape POST returns.
 *
 * `favorite` is set explicitly rather than toggled: a retried request then
 * lands on the same state instead of flipping it back.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const { id } = await ctx.params;
  const current = await getPrompt(id);
  if (!current) return notFound();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const editable: (keyof PromptDraft)[] = [
    "title",
    "summary",
    "body",
    "notes",
    "category",
    "tags",
    "targetModel",
    "source",
    "accent",
  ];
  const merged: Record<string, unknown> = { ...current };
  for (const key of editable) if (key in body) merged[key] = body[key];

  const { ok, errors, draft } = validateDraft(merged);
  if (!ok) return Response.json({ errors }, { status: 422 });

  const patch: Partial<PromptDraft> & { favorite?: boolean } = { ...draft };
  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;

  // The id is the slug of the original title and stays put once created —
  // renaming a prompt must not break a link someone already saved.
  const updated = await updatePrompt(id, patch);
  return updated ? Response.json(updated, noStore) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const { id } = await ctx.params;
  return (await deletePrompt(id)) ? new Response(null, { status: 204 }) : notFound();
}
