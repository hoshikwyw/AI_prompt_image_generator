import { toPublicPrompt, type PublicPrompt } from "./public-api";
import { listImages, listPrompts } from "./store";

/**
 * The whole collection in the public shape, oldest first so a re-download
 * appends rather than reshuffles. For the dataset downloads, where one file
 * beats paging through the API.
 */
export async function allPublicPrompts(origin: string): Promise<PublicPrompt[]> {
  const prompts = await listPrompts({ sort: "oldest" });
  const images = await listImages(prompts.map((p) => p.id));
  return prompts.map((p) => toPublicPrompt(p, origin, images.get(p.id)?.[0]));
}

const CSV_COLUMNS = [
  "id", "url", "title", "summary", "prompt", "placeholders", "notes", "category",
  "audience", "tools", "tags", "source", "featured", "copies", "image", "createdAt", "updatedAt",
] as const;

/** RFC 4180: quote every field, double any quote inside. Lists join with " | ". */
function cell(value: unknown): string {
  const text = Array.isArray(value)
    ? value.join(" | ")
    : value && typeof value === "object" && "url" in value
      ? String((value as { url: string }).url)
      : value === null || value === undefined
        ? ""
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * The collection as CSV, for spreadsheets. Starts with a byte-order mark so
 * Excel reads it as UTF-8 — without one, any accented or non-Latin text comes
 * out garbled. CRLF line ends, as the CSV spec and Excel expect.
 */
export function toCsv(prompts: PublicPrompt[]): string {
  const rows = prompts.map((p) => CSV_COLUMNS.map((c) => cell(p[c])).join(","));
  return `﻿${CSV_COLUMNS.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}
