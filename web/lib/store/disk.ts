import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  filterPrompts,
  type Prompt,
  type PromptDraft,
  type PromptFilter,
  type PromptImage,
} from "../prompt";
import { seedPrompts } from "../seed";
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
/** Sample image bytes. The index lives in the collection file next to them. */
const IMAGE_DIR = path.join(process.cwd(), ".data", "images");
const VERSION = 1;

/** How the local backend addresses its own bytes; Supabase uses a public URL. */
const localImageUrl = (id: string) => `/api/images/${id}`;

interface StoredImage {
  id: string;
  promptId: string;
  file: string;
  caption: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string | null;
  position: number;
  createdAt: string;
}

interface Collection {
  version: number;
  prompts: Prompt[];
  images: StoredImage[];
}

const toPromptImage = (image: StoredImage): PromptImage => ({
  id: image.id,
  promptId: image.promptId,
  url: localImageUrl(image.id),
  caption: image.caption,
  width: image.width,
  height: image.height,
  bytes: image.bytes,
  mime: image.mime,
  position: image.position,
  createdAt: image.createdAt,
});

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
      return {
        version: parsed.version ?? VERSION,
        prompts: parsed.prompts,
        // Collections written before images existed simply have none.
        images: Array.isArray(parsed.images) ? parsed.images : [],
      };
    }
    // File exists but is not a collection — refuse to seed over it.
    throw new Error(`${FILE} is not a valid collection file`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;

    const seeded: Collection = { version: VERSION, prompts: seedPrompts(), images: [] };
    try {
      await writeCollection(seeded);
    } catch (writeError) {
      // A read-only filesystem — a serverless host, most likely, where this
      // backend was never the intention. Reads still work off the seed in
      // memory, so the deploy shows something instead of a 500, and the footer
      // says which backend is live. Writes will still fail, loudly, which is
      // correct: the fix is to set the Supabase credentials.
      console.warn(
        `Could not write ${FILE} (${(writeError as Error).message}). ` +
          "Serving the seed read-only — set SUPABASE_URL and SUPABASE_ANON_KEY to persist.",
      );
    }
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
    await writeCollection({ ...current, version: VERSION, prompts });
    return result;
  });
}

/** The same, for the image index. */
function mutateImages<T>(
  fn: (images: StoredImage[]) => { images: StoredImage[]; result: T },
): Promise<T> {
  return serialize(async () => {
    const current = await readCollection();
    const { images, result } = fn(current.images);
    await writeCollection({ ...current, version: VERSION, images });
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
    // Deleting the prompt has to take its images with it — both the index rows
    // and the files, which nothing else would ever clean up.
    const orphans = await serialize(async () => {
      const current = await readCollection();
      const prompts = current.prompts.filter((p) => p.id !== id);
      if (prompts.length === current.prompts.length) return null;

      const doomed = current.images.filter((i) => i.promptId === id);
      await writeCollection({
        ...current,
        version: VERSION,
        prompts,
        images: current.images.filter((i) => i.promptId !== id),
      });
      return doomed;
    });

    if (!orphans) return false;
    await Promise.all(orphans.map((i) => rm(path.join(IMAGE_DIR, i.file), { force: true })));
    return true;
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

  async listImages(promptIds: string[]): Promise<Map<string, PromptImage[]>> {
    const wanted = new Set(promptIds);
    const { images } = await readCollection();
    const out = new Map<string, PromptImage[]>();

    for (const image of images) {
      if (!wanted.has(image.promptId)) continue;
      const list = out.get(image.promptId) ?? [];
      list.push(toPromptImage(image));
      out.set(image.promptId, list);
    }
    for (const list of out.values()) {
      list.sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    }
    return out;
  },

  async addImage(promptId: string, input: NewImage): Promise<PromptImage | null> {
    const { prompts } = await readCollection();
    if (!prompts.some((p) => p.id === promptId)) return null;

    const id = randomUUID();
    const file = `${id}.${input.extension}`;

    // Bytes first: an index entry pointing at a file that failed to write would
    // render as a broken image forever.
    await mkdir(IMAGE_DIR, { recursive: true });
    await writeFile(path.join(IMAGE_DIR, file), input.bytes);

    return mutateImages((images) => {
      const siblings = images.filter((i) => i.promptId === promptId);
      const stored: StoredImage = {
        id,
        promptId,
        file,
        caption: input.caption,
        width: input.width,
        height: input.height,
        bytes: input.bytes.byteLength,
        mime: input.mime,
        position: siblings.length,
        createdAt: now(),
      };
      return { images: [...images, stored], result: toPromptImage(stored) };
    });
  },

  async deleteImage(imageId: string): Promise<boolean> {
    const removed = await mutateImages((images) => {
      const found = images.find((i) => i.id === imageId);
      if (!found) return { images, result: null };
      return { images: images.filter((i) => i.id !== imageId), result: found };
    });

    if (!removed) return false;
    await rm(path.join(IMAGE_DIR, removed.file), { force: true });
    return true;
  },

  async readImageBytes(imageId: string) {
    const { images } = await readCollection();
    const found = images.find((i) => i.id === imageId);
    if (!found) return null;
    try {
      // The filename comes from the index, never from the request, so there is
      // no path to traverse out of IMAGE_DIR.
      return { bytes: await readFile(path.join(IMAGE_DIR, found.file)), mime: found.mime ?? "image/webp" };
    } catch {
      return null;
    }
  },
};
