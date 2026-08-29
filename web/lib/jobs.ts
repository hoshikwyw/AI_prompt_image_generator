import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import type { Job } from "./types";

/**
 * Phase 1 job store: one JSON file + one image file per job under `.data/`.
 *
 * This is deliberately the shape of the future `generations` table. Phase 2
 * swaps the four functions below for Postgres queries and nothing upstream
 * changes. Uploaded photos are never written to disk — the input buffer lives
 * only in the request closure and is dropped when generation finishes.
 */
const DATA_DIR = path.join(process.cwd(), ".data", "jobs");

const metaPath = (id: string) => path.join(DATA_DIR, `${id}.json`);
const imagePath = (id: string) => path.join(DATA_DIR, `${id}.bin`);

export async function createJob(job: Job): Promise<Job> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(metaPath(job.id), JSON.stringify(job, null, 2), "utf8");
  return job;
}

export async function getJob(id: string): Promise<Job | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  try {
    return JSON.parse(await readFile(metaPath(id), "utf8")) as Job;
  } catch {
    return null;
  }
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const current = await getJob(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await writeFile(metaPath(id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function saveOutput(id: string, bytes: Buffer): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(imagePath(id), bytes);
}

export async function readOutput(id: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  try {
    return await readFile(imagePath(id));
  } catch {
    return null;
  }
}
