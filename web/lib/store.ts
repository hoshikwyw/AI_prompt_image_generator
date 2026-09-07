import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { filterPrompts, slugify, type Prompt, type PromptDraft, type PromptFilter } from "./prompt";
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

/** Appends `-2`, `-3`… until free. Called with the ids already in the file. */
function uniqueId(title: string, taken: Set<string>): string {
  const base = slugify(title) || "prompt";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
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

export async function toggleFavorite(id: string): Promise<Prompt | null> {
  const current = await getPrompt(id);
  if (!current) return null;
  return updatePrompt(id, { favorite: !current.favorite });
}
