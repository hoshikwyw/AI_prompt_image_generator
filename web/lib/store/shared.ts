import { slugify, validateDraft, type Prompt, type PromptDraft, type PromptFilter } from "../prompt";

/**
 * Everything both backends must agree on.
 *
 * The disk store and the Supabase store differ in where bytes land, and in
 * nothing else. Id allocation, reserved slugs and import semantics live here so
 * that a prompt created against Postgres is indistinguishable from one created
 * against `.data/collection.json`.
 */

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: Array<{ title: string; reason: string }>;
}

/** Refuses absurd payloads outright rather than rewriting the collection with them. */
export const MAX_IMPORT = 2000;

/**
 * Slugs held back from prompts. `/prompts/new` is the create form, so a prompt
 * titled "New" would take a slug it can never be reached at; "edit" is reserved
 * alongside it so the same trap cannot open up later.
 *
 * Mirrored by the `prompts_id_not_reserved` check constraint in the migration.
 */
export const RESERVED_IDS = new Set(["new", "edit"]);

/** Appends `-2`, `-3`… until free. Called with the ids already in use. */
export function uniqueId(title: string, taken: Set<string>): string {
  const base = slugify(title) || "prompt";
  if (!taken.has(base) && !RESERVED_IDS.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate) && !RESERVED_IDS.has(candidate)) return candidate;
  }
}

export const now = () => new Date().toISOString();

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

/** One row of an import file, once it has been checked. */
export interface ImportItem {
  /** The id the file asked for, if it asked for a valid one. */
  wantedId: string;
  draft: PromptDraft;
  favorite: boolean;
  copies: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validate and normalise one incoming row.
 *
 * An export is meant to round-trip, so `favorite`, `copies` and the timestamps
 * survive when the row carries valid ones. A bad row comes back as a reason
 * rather than an exception — the usual cause is one malformed entry in an
 * otherwise good file, and that should not cost you the other ninety-nine.
 */
export function readImportItem(
  item: unknown,
): { ok: true; item: ImportItem } | { ok: false; title: string; reason: string } {
  const raw = (item ?? {}) as Record<string, unknown>;
  const { ok, errors, draft } = validateDraft(raw);
  if (!ok) {
    return {
      ok: false,
      title: String(raw.title ?? "(untitled)").slice(0, 80),
      reason: Object.values(errors).join(" "),
    };
  }

  const stamp = now();
  return {
    ok: true,
    item: {
      wantedId: typeof raw.id === "string" ? slugify(raw.id) : "",
      draft,
      favorite: typeof raw.favorite === "boolean" ? raw.favorite : false,
      copies:
        typeof raw.copies === "number" && Number.isFinite(raw.copies) && raw.copies >= 0
          ? Math.floor(raw.copies)
          : 0,
      createdAt: isIso(raw.createdAt) ? raw.createdAt : stamp,
      updatedAt: isIso(raw.updatedAt) ? raw.updatedAt : stamp,
    },
  };
}

/** What a backend has to provide. Both implementations are checked against it. */
export interface StoreBackend {
  readonly id: "disk" | "supabase";
  listPrompts(filter?: PromptFilter): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | null>;
  createPrompt(draft: PromptDraft): Promise<Prompt>;
  updatePrompt(
    id: string,
    patch: Partial<PromptDraft> & { favorite?: boolean },
  ): Promise<Prompt | null>;
  deletePrompt(id: string): Promise<boolean>;
  recordCopy(id: string): Promise<Prompt | null>;
  importPrompts(items: unknown[], mode: "merge" | "replace"): Promise<ImportSummary>;
}
