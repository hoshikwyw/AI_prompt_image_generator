import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  filterPrompts,
  slugify,
  validateDraft,
  type Prompt,
  type PromptDraft,
  type PromptFilter,
} from "./prompt";
import { seedPrompts } from "./seed";

/**
 * The collection: one JSON file under `.data/`, seeded on first read.
 *
 * Phase 2 swaps the functions below for Postgres queries and nothing upstream
 * changes — every caller goes through this module, never the file. Writes are
 * serialised through a single promise chain and land via write-then-rename, so
 * two concurrent requests cannot interleave into a truncated file.
 */
const FILE = path.join(process.cwd(), ".data", "collection.json");
const VERSION = 1;

interface Collection {
  version: number;
  prompts: Prompt[];
}

/** Serialises every mutation. Reads are cheap and go straight to disk. */
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  // Keep the chain alive even if this caller's work rejects.
  queue = run.catch(() => {});
  return run;
}

async function readCollection(): Promise<Collection> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Collection>;
    if (Array.isArray(parsed?.prompts)) {
      return { version: parsed.version ?? VERSION, prompts: parsed.prompts };
    }
    // File exists but is not a collection — refuse to seed over it.
    throw new Error(`${FILE} is not a valid collection file`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const seeded: Collection = { version: VERSION, prompts: seedPrompts() };
    await writeCollection(seeded);
    return seeded;
  }
}

async function writeCollection(next: Collection): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(tmp, FILE);
}

/** Read, mutate, write — under the queue, so callers never race. */
function mutate<T>(fn: (prompts: Prompt[]) => { prompts: Prompt[]; result: T }): Promise<T> {
  return serialize(async () => {
    const current = await readCollection();
    const { prompts, result } = fn(current.prompts);
    await writeCollection({ version: VERSION, prompts });
    return result;
  });
}

const now = () => new Date().toISOString();

/**
 * Slugs held back from prompts. `/prompts/new` is the create form, so a prompt
 * titled "New" would take a slug it can never be reached at; "edit" is reserved
 * alongside it so the same trap cannot open up later.
 */
const RESERVED_IDS = new Set(["new", "edit"]);

/** Appends `-2`, `-3`… until free. Called with the ids already in the file. */
function uniqueId(title: string, taken: Set<string>): string {
  const base = slugify(title) || "prompt";
  if (!taken.has(base) && !RESERVED_IDS.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate) && !RESERVED_IDS.has(candidate)) return candidate;
  }
}

export async function listPrompts(filter?: PromptFilter): Promise<Prompt[]> {
  const { prompts } = await readCollection();
  return filterPrompts(prompts, filter);
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const { prompts } = await readCollection();
  return prompts.find((p) => p.id === id) ?? null;
}

export async function createPrompt(draft: PromptDraft): Promise<Prompt> {
  return mutate((prompts) => {
    const stamp = now();
    const prompt: Prompt = {
      ...draft,
      id: uniqueId(draft.title, new Set(prompts.map((p) => p.id))),
      favorite: false,
      copies: 0,
      createdAt: stamp,
      updatedAt: stamp,
    };
    return { prompts: [...prompts, prompt], result: prompt };
  });
}

/**
 * Patches one prompt. `id`, `createdAt` and `copies` are the store's to set —
 * a patch that carries them is ignored rather than rejected, so a client can
 * round-trip a whole prompt object back without stripping fields first.
 */
export async function updatePrompt(
  id: string,
  patch: Partial<PromptDraft> & { favorite?: boolean },
): Promise<Prompt | null> {
  return mutate((prompts) => {
    const index = prompts.findIndex((p) => p.id === id);
    if (index === -1) return { prompts, result: null };
    const next: Prompt = { ...prompts[index], ...patch, updatedAt: now() };
    const copy = [...prompts];
    copy[index] = next;
    return { prompts: copy, result: next };
  });
}

export async function deletePrompt(id: string): Promise<boolean> {
  return mutate((prompts) => {
    const remaining = prompts.filter((p) => p.id !== id);
    return { prompts: remaining, result: remaining.length !== prompts.length };
  });
}

/** Copying is the closest thing this app has to "used", so it is worth counting. */
export async function recordCopy(id: string): Promise<Prompt | null> {
  return mutate((prompts) => {
    const index = prompts.findIndex((p) => p.id === id);
    if (index === -1) return { prompts, result: null };
    // Deliberately not touching updatedAt: copying is not editing.
    const next: Prompt = { ...prompts[index], copies: prompts[index].copies + 1 };
    const copy = [...prompts];
    copy[index] = next;
    return { prompts: copy, result: next };
  });
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: Array<{ title: string; reason: string }>;
}

/** Refuses absurd payloads outright rather than rewriting the file with them. */
export const MAX_IMPORT = 2000;

const isIso = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));

/**
 * Merge or replace the collection from exported JSON.
 *
 * An export is meant to round-trip, so `favorite`, `copies` and the timestamps
 * survive when the incoming item carries valid ones. Everything else goes
 * through the same validation a hand-written POST does — a bad row is skipped
 * with a reason rather than failing the whole import, since the usual cause is
 * one malformed entry in an otherwise good file.
 */
export async function importPrompts(
  items: unknown[],
  mode: "merge" | "replace" = "merge",
): Promise<ImportSummary> {
  return mutate((existing) => {
    const summary: ImportSummary = { added: 0, updated: 0, skipped: [] };
    const base = mode === "replace" ? [] : [...existing];
    const byId = new Map(base.map((p, index) => [p.id, index]));

    for (const item of items.slice(0, MAX_IMPORT)) {
      const raw = (item ?? {}) as Record<string, unknown>;
      const { ok, errors, draft } = validateDraft(raw);
      if (!ok) {
        summary.skipped.push({
          title: String(raw.title ?? "(untitled)").slice(0, 80),
          reason: Object.values(errors).join(" "),
        });
        continue;
      }

      const wanted = typeof raw.id === "string" ? slugify(raw.id) : "";
      const stamp = now();
      const favorite = typeof raw.favorite === "boolean" ? raw.favorite : false;
      const copies =
        typeof raw.copies === "number" && Number.isFinite(raw.copies) && raw.copies >= 0
          ? Math.floor(raw.copies)
          : 0;
      const createdAt = isIso(raw.createdAt) ? raw.createdAt : stamp;
      const updatedAt = isIso(raw.updatedAt) ? raw.updatedAt : stamp;

      const at = wanted ? byId.get(wanted) : undefined;
      if (at !== undefined) {
        // Same id: an update, keeping the original creation date.
        base[at] = {
          ...base[at],
          ...draft,
          favorite,
          copies,
          createdAt: base[at].createdAt,
          updatedAt,
        };
        summary.updated++;
        continue;
      }

      const id = uniqueId(wanted || draft.title, new Set(byId.keys()));
      base.push({ ...draft, id, favorite, copies, createdAt, updatedAt });
      byId.set(id, base.length - 1);
      summary.added++;
    }

    return { prompts: base, result: summary };
  });
}
