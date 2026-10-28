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

/**
 * RFC 4180: quote every field, double any quote inside. Lists join with " | ".
 *
 * A text cell that a spreadsheet would run as a formula gets a leading
 * apostrophe, so a prompt cannot carry one into a stranger's spreadsheet:
 * anything starting with = (or a tab or carriage return), and + - @ when what
 * follows could call something — a bracket, a pipe (DDE), "!" or another
 * operator. Plain text such as an "@promptguy" credit or "- Attach your photo"
 * is left as written: the apostrophe is data to every program but a
 * spreadsheet, and it used to be added to those too. Numbers and booleans are
 * left alone.
 */
const FORMULA = /^[=\t\r]|^[+\-@][\s\S]*[(|!=+\-*/^&]/;

function cell(value: unknown): string {
  let text = Array.isArray(value)
    ? value.join(" | ")
    : value && typeof value === "object" && "url" in value
      ? String((value as { url: string }).url)
      : value === null || value === undefined
        ? ""
        : String(value);
  if (typeof value !== "number" && typeof value !== "boolean" && FORMULA.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * The collection as CSV, for spreadsheets. Starts with a byte-order mark so
 * Excel reads it as UTF-8 — without one, any accented or non-Latin text comes
 * out garbled. CRLF line ends, as the CSV spec and Excel expect. A line at a
 * time, for `apiStream`.
 */
export function* csvLines(prompts: PublicPrompt[]): Generator<string> {
  yield `﻿${CSV_COLUMNS.join(",")}\r\n`;
  for (const p of prompts) yield `${CSV_COLUMNS.map((c) => cell(p[c])).join(",")}\r\n`;
}

/** The JSON export a prompt at a time: `{ "data": [...], "meta": {...} }`. */
export function* jsonLines(prompts: PublicPrompt[], meta: object): Generator<string> {
  yield '{"data":[';
  for (const [i, p] of prompts.entries()) yield (i ? "," : "") + JSON.stringify(p);
  yield `],"meta":${JSON.stringify(meta)}}`;
}
