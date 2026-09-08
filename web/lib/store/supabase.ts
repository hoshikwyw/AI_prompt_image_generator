import { randomUUID } from "node:crypto";
import { SUPABASE_BUCKET, publicImageUrl, supabaseRead, supabaseWrite } from "../supabase";
import {
  filterPrompts,
  type Category,
  type Prompt,
  type PromptDraft,
  type PromptFilter,
  type PromptImage,
} from "../prompt";
import {
  MAX_IMPORT,
  now,
  readImportItem,
  uniqueId,
  type ImportSummary,
  type NewImage,
  type StoreBackend,
} from "./shared";

/**
 * The Supabase backend: the same collection, in Postgres.
 *
 * Reads go through the anon key and are bound by RLS, which allows nothing but
 * SELECT. Writes go through the service_role key, which bypasses RLS — so every
 * function below that writes is only reachable from a route behind the admin
 * gate.
 *
 * This module is the only place that knows the collection has snake_case
 * columns; everything upstream sees the same `Prompt` the disk store returns.
 */

const TABLE = "prompts";
const IMAGE_TABLE = "prompt_images";
const IMAGE_COLUMNS =
  "id, prompt_id, storage_path, caption, width, height, bytes, mime, position, created_at";

/** Every column, in one place, so a select cannot quietly miss a field. */
const COLUMNS =
  "id, title, summary, body, notes, category, tags, target_model, source, accent, favorite, copies, created_at, updated_at";

interface Row {
  id: string;
  title: string;
  summary: string;
  body: string;
  notes: string;
  category: string;
  tags: string[] | null;
  target_model: string;
  source: string;
  accent: string;
  favorite: boolean;
  copies: number;
  created_at: string;
  updated_at: string;
}

const toPrompt = (row: Row): Prompt => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  body: row.body,
  notes: row.notes,
  category: row.category as Category,
  tags: row.tags ?? [],
  targetModel: row.target_model,
  source: row.source,
  accent: row.accent,
  favorite: row.favorite,
  copies: row.copies,
  // Postgres returns an offset form; the app compares these as strings when
  // sorting, so they are normalised to the same ISO shape the disk store uses.
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const toRow = (prompt: Prompt): Row => ({
  id: prompt.id,
  title: prompt.title,
  summary: prompt.summary,
  body: prompt.body,
  notes: prompt.notes,
  category: prompt.category,
  tags: prompt.tags,
  target_model: prompt.targetModel,
  source: prompt.source,
  accent: prompt.accent,
  favorite: prompt.favorite,
  copies: prompt.copies,
  created_at: prompt.createdAt,
  updated_at: prompt.updatedAt,
});

interface ImageRow {
  id: string;
  prompt_id: string;
  storage_path: string;
  caption: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string | null;
  position: number;
  created_at: string;
}

const toPromptImage = (row: ImageRow): PromptImage => ({
  id: row.id,
  promptId: row.prompt_id,
  // Derived, not stored: the row keeps the object key so moving buckets or
  // domains does not mean rewriting every image.
  url: publicImageUrl(row.storage_path),
  caption: row.caption,
  width: row.width,
  height: row.height,
  bytes: row.bytes,
  mime: row.mime,
  position: row.position,
  createdAt: new Date(row.created_at).toISOString(),
});

/** Only the draft fields, for a partial update. */
function draftColumns(patch: Partial<PromptDraft> & { favorite?: boolean }) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.targetModel !== undefined) row.target_model = patch.targetModel;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.accent !== undefined) row.accent = patch.accent;
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  return row;
}

/** Postgres unique-violation. Two creates racing on the same title hit this. */
const UNIQUE_VIOLATION = "23505";

function fail(action: string, error: { message: string }): never {
  throw new Error(`Supabase ${action} failed: ${error.message}`);
}

async function takenIds(): Promise<Set<string>> {
  const { data, error } = await supabaseWrite().from(TABLE).select("id").limit(MAX_IMPORT);
  if (error) fail("id lookup", error);
  return new Set((data ?? []).map((r) => r.id as string));
}

export const supabaseStore: StoreBackend = {
  id: "supabase",

  /**
   * Fetches the collection and filters it in memory, on purpose.
   *
   * `filterPrompts` is the same function the library UI runs, so the two views
   * cannot disagree about what "matches" means — worth more than the round trip
   * saved while a collection is this size. When it outgrows that, the search
   * becomes a tsvector column and this becomes a query.
   */
  async listPrompts(filter?: PromptFilter): Promise<Prompt[]> {
    const { data, error } = await supabaseRead()
      .from(TABLE)
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(MAX_IMPORT);
    if (error) fail("list", error);
    return filterPrompts((data as unknown as Row[]).map(toPrompt), filter);
  },

  async getPrompt(id: string): Promise<Prompt | null> {
    if (!/^[a-z0-9-]+$/.test(id)) return null;
    const { data, error } = await supabaseRead()
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) fail("get", error);
    return data ? toPrompt(data as unknown as Row) : null;
  },

  async createPrompt(draft: PromptDraft): Promise<Prompt> {
    const stamp = now();

    // Two creates can pick the same slug between the lookup and the insert, so
    // a unique violation is retried against a freshly read set rather than
    // surfaced. The second attempt cannot lose the same way: it sees the row
    // that beat it.
    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt: Prompt = {
        ...draft,
        id: uniqueId(draft.title, await takenIds()),
        favorite: false,
        copies: 0,
        createdAt: stamp,
        updatedAt: stamp,
      };

      const { data, error } = await supabaseWrite()
        .from(TABLE)
        .insert(toRow(prompt))
        .select(COLUMNS)
        .single();

      if (!error) return toPrompt(data as unknown as Row);
      if (error.code !== UNIQUE_VIOLATION) fail("create", error);
    }
    throw new Error("Supabase create failed: could not allocate a free slug.");
  },

  async updatePrompt(
    id: string,
    patch: Partial<PromptDraft> & { favorite?: boolean },
  ): Promise<Prompt | null> {
    const { data, error } = await supabaseWrite()
      .from(TABLE)
      // `id`, `created_at` and `copies` are the store's to set, so they are
      // never part of a patch even when a client posts a whole prompt back.
      .update({ ...draftColumns(patch), updated_at: now() })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) fail("update", error);
    return data ? toPrompt(data as unknown as Row) : null;
  },

  async deletePrompt(id: string): Promise<boolean> {
    const db = supabaseWrite();

    // The rows cascade, but the objects in storage do not, so their paths have
    // to be collected before the cascade removes the only record of them.
    const { data: images, error: imageError } = await db
      .from(IMAGE_TABLE)
      .select("storage_path")
      .eq("prompt_id", id);
    if (imageError) fail("delete (reading images)", imageError);

    const { data, error } = await db.from(TABLE).delete().eq("id", id).select("id");
    if (error) fail("delete", error);
    if ((data ?? []).length === 0) return false;

    const paths = (images ?? []).map((i) => i.storage_path as string);
    if (paths.length > 0) {
      // A failure here leaks bytes but has already removed the prompt, so it is
      // reported rather than thrown — the row is gone either way.
      const { error: storageError } = await db.storage.from(SUPABASE_BUCKET).remove(paths);
      if (storageError) {
        console.error(`Orphaned ${paths.length} object(s) in storage: ${storageError.message}`);
      }
    }
    return true;
  },

  async recordCopy(id: string): Promise<Prompt | null> {
    // A function, not a read-modify-write: two people copying the same prompt
    // at once must not lose a count.
    const { data, error } = await supabaseWrite().rpc("increment_prompt_copies", { p_id: id });
    if (error) fail("copy count", error);
    if (data === null || data === undefined) return null;
    return this.getPrompt(id);
  },

  async importPrompts(items: unknown[], mode: "merge" | "replace"): Promise<ImportSummary> {
    const summary: ImportSummary = { added: 0, updated: 0, skipped: [] };
    const db = supabaseWrite();

    if (mode === "replace") {
      // `neq` on a column that is never null is how PostgREST spells "all rows";
      // it refuses an unfiltered delete.
      const { error } = await db.from(TABLE).delete().neq("id", "");
      if (error) fail("import (clearing)", error);
    }

    // Existing creation dates have to survive an update, and an upsert would
    // overwrite them with whatever the file carries.
    const { data: current, error: readError } = await db
      .from(TABLE)
      .select("id, created_at")
      .limit(MAX_IMPORT);
    if (readError) fail("import (reading)", readError);

    const createdById = new Map((current ?? []).map((r) => [r.id as string, r.created_at as string]));
    const taken = new Set(createdById.keys());
    const rows: Row[] = [];

    for (const raw of items.slice(0, MAX_IMPORT)) {
      const read = readImportItem(raw);
      if (!read.ok) {
        summary.skipped.push({ title: read.title, reason: read.reason });
        continue;
      }
      const { wantedId, draft, favorite, copies, createdAt, updatedAt } = read.item;
      const existing = wantedId ? createdById.get(wantedId) : undefined;

      if (existing !== undefined) {
        rows.push(
          toRow({
            ...draft,
            id: wantedId,
            favorite,
            copies,
            createdAt: new Date(existing).toISOString(),
            updatedAt,
          }),
        );
        summary.updated++;
        continue;
      }

      const id = uniqueId(wantedId || draft.title, taken);
      taken.add(id);
      rows.push(toRow({ ...draft, id, favorite, copies, createdAt, updatedAt }));
      summary.added++;
    }

    // Chunked so a large file does not become one enormous statement.
    for (let i = 0; i < rows.length; i += 250) {
      const { error } = await db.from(TABLE).upsert(rows.slice(i, i + 250), { onConflict: "id" });
      if (error) fail("import (writing)", error);
    }

    return summary;
  },

  async listImages(promptIds: string[]): Promise<Map<string, PromptImage[]>> {
    const out = new Map<string, PromptImage[]>();
    if (promptIds.length === 0) return out;

    const { data, error } = await supabaseRead()
      .from(IMAGE_TABLE)
      .select(IMAGE_COLUMNS)
      .in("prompt_id", promptIds)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) fail("list images", error);

    for (const row of (data ?? []) as unknown as ImageRow[]) {
      const list = out.get(row.prompt_id) ?? [];
      list.push(toPromptImage(row));
      out.set(row.prompt_id, list);
    }
    return out;
  },

  async addImage(promptId: string, input: NewImage): Promise<PromptImage | null> {
    const db = supabaseWrite();
    if (!(await this.getPrompt(promptId))) return null;

    const { count, error: countError } = await db
      .from(IMAGE_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("prompt_id", promptId);
    if (countError) fail("image count", countError);

    const position = count ?? 0;
    // Prefixed by prompt so the bucket stays browsable, suffixed by a random
    // id so re-uploading the same picture never overwrites the old object.
    const storagePath = `${promptId}/${randomUUID()}.${input.extension}`;

    const { error: uploadError } = await db.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, input.bytes, { contentType: input.mime, upsert: false });
    if (uploadError) fail("image upload", uploadError);

    const { data, error } = await db
      .from(IMAGE_TABLE)
      .insert({
        prompt_id: promptId,
        storage_path: storagePath,
        caption: input.caption,
        width: input.width,
        height: input.height,
        bytes: input.bytes.byteLength,
        mime: input.mime,
        position,
      })
      .select(IMAGE_COLUMNS)
      .single();

    if (error) {
      // The row is what makes an object reachable, so an orphan is worse than
      // a failed upload: clean it up before reporting.
      await db.storage.from(SUPABASE_BUCKET).remove([storagePath]);
      fail("image insert", error);
    }
    return toPromptImage(data as unknown as ImageRow);
  },

  async deleteImage(imageId: string): Promise<boolean> {
    const db = supabaseWrite();
    const { data, error } = await db
      .from(IMAGE_TABLE)
      .delete()
      .eq("id", imageId)
      .select("storage_path");
    if (error) fail("image delete", error);

    const path = (data ?? [])[0]?.storage_path as string | undefined;
    if (!path) return false;

    const { error: storageError } = await db.storage.from(SUPABASE_BUCKET).remove([path]);
    if (storageError) console.error(`Orphaned ${path} in storage: ${storageError.message}`);
    return true;
  },
};
