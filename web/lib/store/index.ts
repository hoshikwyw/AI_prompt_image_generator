import { supabaseConfigured } from "../supabase";
import { diskStore } from "./disk";
import { supabaseStore } from "./supabase";
import type { StoreBackend } from "./shared";

/**
 * The collection, whichever backend is holding it.
 *
 * Supabase when it is configured, the local JSON file otherwise — decided once,
 * at module load, from the environment. Callers never choose; every route and
 * page imports these functions and gets whichever backend is in play.
 *
 * Both backends implement the same `StoreBackend` contract and share their id
 * allocation and import rules, so switching between them changes where the data
 * lives and nothing about how it behaves.
 */
const backend: StoreBackend = supabaseConfigured() ? supabaseStore : diskStore;

/** Which backend answered. Shown in the footer so it is never a guess. */
export const activeBackend = (): StoreBackend["id"] => backend.id;

export const listPrompts: StoreBackend["listPrompts"] = (filter) => backend.listPrompts(filter);
export const getPrompt: StoreBackend["getPrompt"] = (id) => backend.getPrompt(id);
export const createPrompt: StoreBackend["createPrompt"] = (draft) => backend.createPrompt(draft);
export const updatePrompt: StoreBackend["updatePrompt"] = (id, patch) =>
  backend.updatePrompt(id, patch);
export const deletePrompt: StoreBackend["deletePrompt"] = (id) => backend.deletePrompt(id);
export const recordCopy: StoreBackend["recordCopy"] = (id) => backend.recordCopy(id);
export const importPrompts: StoreBackend["importPrompts"] = (items, mode = "merge") =>
  backend.importPrompts(items, mode);

export const listImages: StoreBackend["listImages"] = (promptIds) => backend.listImages(promptIds);
export const addImage: StoreBackend["addImage"] = (promptId, input) =>
  backend.addImage(promptId, input);
export const deleteImage: StoreBackend["deleteImage"] = (imageId) => backend.deleteImage(imageId);

/** Null when the backend serves its images from somewhere else entirely. */
export const readImageBytes = (imageId: string) => backend.readImageBytes?.(imageId) ?? null;

export {
  MAX_IMPORT,
  RESERVED_IDS,
  type ImportSummary,
  type NewImage,
  type StoreBackend,
} from "./shared";
