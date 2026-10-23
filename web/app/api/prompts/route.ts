import { requireAdmin } from "@/lib/admin";
import { NO_STORE, readJson } from "@/lib/http";
import { parseFilter, tagCounts, validateDraft } from "@/lib/prompt";
import { createPrompt, listPrompts } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompts = await listPrompts(parseFilter((key) => url.searchParams.get(key)));
  // Counts come from the whole collection, not the filtered view, so the chips
  // do not vanish as you narrow the search.
  const all = await listPrompts();

  return Response.json({ prompts, total: all.length, tags: tagCounts(all) }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const { ok, errors, draft } = validateDraft(body);
  if (!ok) return Response.json({ errors }, { status: 422 });

  const prompt = await createPrompt(draft);
  return Response.json(prompt, {
    status: 201,
    headers: { Location: `/api/prompts/${prompt.id}` },
  });
}
