/**
 * The public, read-only API under /api/v1 — the contract other people build on.
 *
 * Kept apart from the routes the site itself uses, so the site can change
 * freely while this stays stable: field names, the response envelope and error
 * codes here only change in a new version (/api/v2), never in place.
 *
 * Everything here is designed to run for free:
 * - Responses carry CDN cache headers, so repeat requests are answered by the
 *   CDN without running a function or touching the database.
 * - CORS is open, so any website, extension or tool can call it from anywhere.
 * - Nothing can write: there is no way to change a prompt or its counts.
 */
import {
  AI_TOOLS,
  AUDIENCE_FILTERS,
  CATEGORIES,
  SORTS,
  normalizeTag,
  placeholdersIn,
  type AiTool,
  type AudienceFilter,
  type Category,
  type Prompt,
  type PromptFilter,
  type PromptImage,
  type SortKey,
} from "./prompt";

// --- responses ----------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Browsers may skip the preflight for a day.
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * How long each kind of response may be reused. `s-maxage` is the CDN's copy —
 * the one that keeps the free tier free — and `stale-while-revalidate` lets it
 * answer instantly while it fetches a fresh copy in the background.
 */
export const CACHE = {
  /** Prompt lists and single prompts: a new prompt shows up within minutes. */
  content: "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  /** Categories, audiences, tools, tags: change rarely. */
  taxonomy: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  /** Random picks: a few seconds, so a burst shares one answer but it still varies. */
  random: "public, max-age=0, s-maxage=5",
  /** Image bytes never change for a given id. */
  image: "public, max-age=31536000, immutable",
  /** Client errors are cheap to repeat, so the CDN absorbs a retry loop. */
  clientError: "public, max-age=0, s-maxage=60",
  serverError: "no-store",
} as const;

export function apiJson(
  body: unknown,
  cache: string,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: { ...CORS, "Cache-Control": cache, ...headers } });
}

/** Every error has the same shape: `{ error: { code, message, ...details } }`. */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  headers?: Record<string, string>,
): Response {
  // A 429 is about one caller, never the URL: cached, the CDN would turn
  // everyone else away from it too.
  const cache = status >= 500 || status === 429 ? CACHE.serverError : CACHE.clientError;
  return apiJson({ error: { code, message, ...details } }, cache, status, headers);
}

export const notFound = (what: string) => apiError(404, "not_found", `No ${what} with that id.`);

/** The answer to a browser's CORS preflight, for every route's OPTIONS. */
export const preflight = () => new Response(null, { status: 204, headers: CORS });

/** Image bytes, with the same open CORS so a canvas or fetch() can use them. */
export function apiImage(bytes: Buffer, mime: string): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      ...CORS,
      "Content-Type": mime,
      "Cache-Control": CACHE.image,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// --- the public prompt shape --------------------------------------------------

export interface PublicImage {
  url: string;
  width: number | null;
  height: number | null;
  caption: string;
}

/**
 * A prompt as the API presents it. Internal fields stay out: `accent` is a
 * styling class, and `favorite` is exposed under the name that means
 * something to a reader, `featured`. `models` is called `tools` here, the word
 * the docs use. URLs are absolute, so they work wherever the JSON ends up.
 */
export interface PublicPrompt {
  id: string;
  url: string;
  title: string;
  summary: string;
  /** The prompt text itself — what gets pasted into an AI tool. */
  prompt: string;
  /** The `[bracketed]` parts a reader is meant to change, without brackets. */
  placeholders: string[];
  /** Tips: what the prompt needs (often "attach your photo"), what it gets wrong. */
  notes: string;
  category: Category;
  /** Who it suits: "any", "female", "male" or "couple". */
  audience: Prompt["audience"];
  /** AI tools it is known to work in. Empty means it is not tied to one. */
  tools: AiTool[];
  tags: string[];
  source: string;
  featured: boolean;
  copies: number;
  /** The first sample image, or null. Single prompts also list them all. */
  image: PublicImage | null;
  createdAt: string;
  updatedAt: string;
}

export const toPublicImage = (image: PromptImage, origin: string): PublicImage => ({
  // Through the API's own cached image route, not the storage URL: the CDN
  // then serves repeat views, and Supabase's bandwidth allowance is spent once.
  url: `${origin}/api/v1/images/${image.id}`,
  width: image.width,
  height: image.height,
  caption: image.caption,
});

export function toPublicPrompt(prompt: Prompt, origin: string, cover?: PromptImage): PublicPrompt {
  return {
    id: prompt.id,
    url: `${origin}/prompts/${prompt.id}`,
    title: prompt.title,
    summary: prompt.summary,
    prompt: prompt.body,
    placeholders: placeholdersIn(prompt.body),
    notes: prompt.notes,
    category: prompt.category,
    audience: prompt.audience,
    tools: prompt.models,
    tags: prompt.tags,
    source: prompt.source,
    featured: prompt.favorite,
    copies: prompt.copies,
    image: cover ? toPublicImage(cover, origin) : null,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

// --- query parameters ---------------------------------------------------------

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
const MAX_QUERY = 100;

/** Opaque to callers, so the paging scheme can change without breaking them. */
const encodeCursor = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");

function decodeCursor(cursor: string): number | null {
  const match = /^o:(\d{1,6})$/.exec(Buffer.from(cursor, "base64url").toString());
  return match ? Number(match[1]) : null;
}

export const nextCursor = (offset: number, limit: number, total: number) =>
  offset + limit < total ? encodeCursor(offset + limit) : null;

function invalid(param: string, message: string, allowed?: readonly string[]): Response {
  return apiError(400, "invalid_parameter", message, { param, ...(allowed && { allowed }) });
}

/**
 * The filters a request asks for. Strict, unlike the site's parser: a typo in
 * an API call should say so, not quietly return the whole collection.
 * Returns a Response to send back when a parameter is wrong.
 */
export function readFilter(params: URLSearchParams): PromptFilter | Response {
  const filter: PromptFilter = {};

  const q = params.get("q")?.trim();
  if (q) {
    if (q.length > MAX_QUERY) return invalid("q", `q is limited to ${MAX_QUERY} characters.`);
    filter.q = q;
  }

  const category = params.get("category");
  if (category) {
    if (!CATEGORIES.includes(category as Category)) {
      return invalid("category", `Unknown category "${category}".`, CATEGORIES);
    }
    filter.category = category as Category;
  }

  // `for` and `ai` are the site's own URL names, kept so a library link's
  // query works here unchanged; `audience` and `tool` read better in code.
  const audience = params.get("for") ?? params.get("audience");
  if (audience) {
    if (!AUDIENCE_FILTERS.includes(audience as AudienceFilter)) {
      return invalid("for", `Unknown audience "${audience}".`, AUDIENCE_FILTERS);
    }
    filter.audience = audience as AudienceFilter;
  }

  const tool = params.get("ai") ?? params.get("tool");
  if (tool) {
    if (!AI_TOOLS.includes(tool as AiTool)) {
      return invalid("ai", `Unknown AI tool "${tool}".`, AI_TOOLS);
    }
    filter.model = tool as AiTool;
  }

  const tag = params.get("tag");
  if (tag) filter.tag = normalizeTag(tag);

  const featured = params.get("featured");
  if (featured) {
    if (!["1", "true", "0", "false"].includes(featured)) {
      return invalid("featured", 'featured is "true" or "false".', ["true", "false"]);
    }
    filter.favoritesOnly = featured === "1" || featured === "true";
  }

  const sort = params.get("sort");
  if (sort) {
    if (!SORTS.includes(sort as SortKey)) return invalid("sort", `Unknown sort "${sort}".`, SORTS);
    filter.sort = sort as SortKey;
  }

  return filter;
}

/** `limit` (1–100) and `cursor`, or a Response explaining what is wrong. */
export function readPaging(
  params: URLSearchParams,
  { fallback = DEFAULT_LIMIT, max = MAX_LIMIT } = {},
): { limit: number; offset: number } | Response {
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? fallback : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    return invalid("limit", `limit is a whole number from 1 to ${max}.`);
  }

  const cursor = params.get("cursor");
  const offset = cursor ? decodeCursor(cursor) : 0;
  if (offset === null) {
    return invalid("cursor", "cursor is not one this API issued — use meta.nextCursor as given.");
  }
  return { limit, offset };
}
