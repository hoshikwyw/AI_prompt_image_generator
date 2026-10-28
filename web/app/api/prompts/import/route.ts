import { requireAdmin } from "@/lib/admin";
import { NO_STORE, errorResponse, readJson } from "@/lib/http";
import { MAX_IMPORT, importPrompts } from "@/lib/store";
import { readImportItem } from "@/lib/store/shared";

export const runtime = "nodejs";

/**
 * Accepts what the export produces (`{ prompts: [...] }`) and also a bare
 * array, since that is what people paste when they build a file by hand.
 *
 * `mode=replace` discards the current collection; `merge` (the default) keeps
 * it and updates by id. A row that fails validation is skipped and reported —
 * one bad entry should not cost you the other ninety-nine.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  // `null` and plain values are valid JSON too; they must get the same 422 as
  // any other wrong shape, not a TypeError from reading `.prompts` off them.
  const wrapped = typeof body === "object" && body !== null ? (body as { prompts?: unknown }) : {};
  const items = Array.isArray(body) ? body : Array.isArray(wrapped.prompts) ? wrapped.prompts : null;

  if (!items) {
    return errorResponse("Expected an array of prompts, or an object with a `prompts` array.", 422);
  }
  if (items.length > MAX_IMPORT) {
    return errorResponse(`Import is capped at ${MAX_IMPORT} prompts.`, 413);
  }

  const mode = new URL(request.url).searchParams.get("mode") === "replace" ? "replace" : "merge";

  // Replace discards the whole collection first. A file in which nothing is
  // valid — the wrong file, a broken export — would leave it empty, so that
  // is refused before anything is touched.
  if (mode === "replace" && !items.some((item) => readImportItem(item).ok)) {
    return errorResponse(
      "Nothing in this file is a valid prompt, so the collection was left as it is.",
      422,
    );
  }
  const summary = await importPrompts(items, mode);

  return Response.json({ mode, ...summary }, { headers: NO_STORE });
}
