import {
  CATEGORIES,
  SORTS,
  tagCounts,
  validateDraft,
  type Category,
  type PromptFilter,
  type SortKey,
} from "@/lib/prompt";
import { createPrompt, listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/** Query junk is ignored rather than rejected — a bad filter shows everything. */
function filterFromQuery(url: URL): PromptFilter {
  const category = url.searchParams.get("category");
  const sort = url.searchParams.get("sort");
  return {
    q: url.searchParams.get("q") ?? undefined,
    category: CATEGORIES.includes(category as Category) ? (category as Category) : "all",
    tag: url.searchParams.get("tag") ?? undefined,
    favoritesOnly: url.searchParams.get("favorites") === "1",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "recent",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompts = await listPrompts(filterFromQuery(url));
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
