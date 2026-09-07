import { parseFilter, tagCounts, validateDraft } from "@/lib/prompt";
import { createPrompt, listPrompts } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompts = await listPrompts(parseFilter((key) => url.searchParams.get(key)));
  // Counts come from the whole collection, not the filtered view, so the chips
  // do not vanish as you narrow the search.
  const all = await listPrompts();

  return Response.json(
    { prompts, total: all.length, tags: tagCounts(all) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { ok, errors, draft } = validateDraft(body);
  if (!ok) return Response.json({ errors }, { status: 422 });

  const prompt = await createPrompt(draft);
  return Response.json(prompt, {
    status: 201,
    headers: { Location: `/api/prompts/${prompt.id}` },
  });
}
