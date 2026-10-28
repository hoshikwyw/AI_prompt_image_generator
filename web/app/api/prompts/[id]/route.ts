import { requireAdmin } from "@/lib/admin";
import { NO_STORE, errorResponse, readJson } from "@/lib/http";
import { toDraft, validateDraft, type PromptDraft } from "@/lib/prompt";
import { deletePrompt, getPrompt, updatePrompt } from "@/lib/store";

export const runtime = "nodejs";

const notFound = () => errorResponse("Prompt not found.", 404);

export async function GET(_request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const { id } = await ctx.params;
  const prompt = await getPrompt(id);
  return prompt ? Response.json(prompt, { headers: NO_STORE }) : notFound();
}

/**
 * Partial edit. The patch is merged onto the stored prompt and the *result* is
 * validated, so a one-field change still cannot leave a prompt with an empty
 * body, and the client gets the same error shape POST returns. `validateDraft`
 * reads only the draft fields, so `id`, `createdAt` and `copies` in a posted
 * prompt are ignored rather than written.
 *
 * `favorite` is set explicitly rather than toggled: a retried request then
 * lands on the same state instead of flipping it back.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const current = await getPrompt(id);
  if (!current) return notFound();

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const patch = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  // Starring sends only `favorite`. Writing the merged draft back as well would
  // replay the fields as they were read above — so an edit saved in another
  // tab between that read and this write would be silently undone.
  const draftKeys = Object.keys(toDraft(current));
  if (typeof patch.favorite === "boolean" && !Object.keys(patch).some((k) => draftKeys.includes(k))) {
    const updated = await updatePrompt(id, { favorite: patch.favorite });
    return updated ? Response.json(updated, { headers: NO_STORE }) : notFound();
  }

  const { ok, errors, draft } = validateDraft({ ...toDraft(current), ...patch });
  if (!ok) return Response.json({ errors }, { status: 422 });

  const update: Partial<PromptDraft> & { favorite?: boolean } = { ...draft };
  if (typeof patch.favorite === "boolean") update.favorite = patch.favorite;

  // The id is the slug of the original title and stays put once created —
  // renaming a prompt must not break a link someone already saved.
  const updated = await updatePrompt(id, update);
  return updated ? Response.json(updated, { headers: NO_STORE }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  return (await deletePrompt(id)) ? new Response(null, { status: 204 }) : notFound();
}
