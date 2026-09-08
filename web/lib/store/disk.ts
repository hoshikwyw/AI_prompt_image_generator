import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { filterPrompts, type Prompt, type PromptDraft, type PromptFilter } from "../prompt";
import { seedPrompts } from "../seed";
import {
  MAX_IMPORT,
  now,
  readImportItem,
  uniqueId,
  type ImportSummary,
  type StoreBackend,
} from "./shared";

/**
 * The local backend: one JSON file under `.data/`, seeded on first read.
 *
 * This is what runs when no Supabase credentials are set. It keeps the app
 * usable on a machine with no keys, which is also what makes the endpoint tests
 * runnable without a network.
 *
 * Writes are serialised through a single promise chain and land via
 * write-then-rename, so two concurrent requests cannot interleave into a
 * truncated file.
 */
const FILE = path.join(process.cwd(), ".data", "collection.json");
const VERSION = 1;

interface Collection {
  version: number;
  prompts: Prompt[];
}

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

export const diskStore: StoreBackend = {
  id: "disk",

  async listPrompts(filter?: PromptFilter): Promise<Prompt[]> {
    const { prompts } = await readCollection();
    return filterPrompts(prompts, filter);
  },

  async getPrompt(id: string): Promise<Prompt | null> {
    if (!/^[a-z0-9-]+$/.test(id)) return null;
    const { prompts } = await readCollection();
    return prompts.find((p) => p.id === id) ?? null;
  },

  async createPrompt(draft: PromptDraft): Promise<Prompt> {
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
  },

  /**
   * Patches one prompt. `id`, `createdAt` and `copies` are the store's to set —
   * a patch that carries them is ignored rather than rejected, so a client can
   * round-trip a whole prompt object back without stripping fields first.
   */
  async updatePrompt(
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
  },

  async deletePrompt(id: string): Promise<boolean> {
    return mutate((prompts) => {
      const remaining = prompts.filter((p) => p.id !== id);
      return { prompts: remaining, result: remaining.length !== prompts.length };
    });
  },

  async recordCopy(id: string): Promise<Prompt | null> {
    return mutate((prompts) => {
      const index = prompts.findIndex((p) => p.id === id);
      if (index === -1) return { prompts, result: null };
      // Deliberately not touching updatedAt: copying is not editing.
      const next: Prompt = { ...prompts[index], copies: prompts[index].copies + 1 };
      const copy = [...prompts];
      copy[index] = next;
      return { prompts: copy, result: next };
    });
  },

  async importPrompts(items: unknown[], mode: "merge" | "replace"): Promise<ImportSummary> {
    return mutate((existing) => {
      const summary: ImportSummary = { added: 0, updated: 0, skipped: [] };
      const base = mode === "replace" ? [] : [...existing];
      const byId = new Map(base.map((p, index) => [p.id, index]));

      for (const raw of items.slice(0, MAX_IMPORT)) {
        const read = readImportItem(raw);
        if (!read.ok) {
          summary.skipped.push({ title: read.title, reason: read.reason });
          continue;
        }
        const { wantedId, draft, favorite, copies, createdAt, updatedAt } = read.item;

        const at = wantedId ? byId.get(wantedId) : undefined;
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

        const id = uniqueId(wantedId || draft.title, new Set(byId.keys()));
        base.push({ ...draft, id, favorite, copies, createdAt, updatedAt });
        byId.set(id, base.length - 1);
        summary.added++;
      }

      return { prompts: base, result: summary };
    });
  },
};
