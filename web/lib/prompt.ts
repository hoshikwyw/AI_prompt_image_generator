/**
 * The unit this app collects: one reusable AI prompt.
 *
 * Until an image-generation key exists, the app is a library rather than a
 * generator — you write, tag, search and copy prompts, and run them elsewhere.
 * The shape below is deliberately the future `prompts` table's columns, so
 * Phase 2 (Postgres) is a data move rather than a rewrite.
 *
 * Prompts are written as *transformation* instructions, not scene descriptions.
 * "Restyle the person in this photo as X, keeping their facial features" works;
 * "a portrait of a man in style X" makes the model ignore the upload and invent
 * a stranger. Keep that rule when adding new prompts.
 */

export const CATEGORIES = [
  "artistic",
  "photographic",
  "stylised",
  "character",
  "scene",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Tailwind gradients offered for the placeholder tile, in pick order. */
export const ACCENTS = [
  "from-stone-400 to-stone-600",
  "from-amber-700 to-yellow-900",
  "from-sky-400 to-indigo-600",
  "from-fuchsia-500 to-cyan-500",
  "from-teal-500 to-blue-700",
  "from-slate-500 to-slate-700",
  "from-rose-500 to-orange-600",
  "from-emerald-500 to-lime-700",
] as const;

export interface Prompt {
  /** Slug derived from the title. Unique, and the URL key. */
  id: string;
  title: string;
  /** One line for the card. */
  summary: string;
  /** The prompt text itself — what actually gets copied. */
  body: string;
  /** Free-form notes: what it needs, what it gets wrong, tweaks that helped. */
  notes: string;
  category: Category;
  tags: string[];
  /** Free text, e.g. "flux.2-klein", "gemini-3.1-flash-lite-image", "any". */
  targetModel: string;
  /** Where it came from — URL or credit. Empty when it is your own. */
  source: string;
  accent: string;
  favorite: boolean;
  /** Times the body has been copied. A cheap "which ones do I actually use". */
  copies: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A sample image shown with a prompt — what the prompt actually produced.
 *
 * `url` is derived by the backend rather than stored: Supabase serves these
 * from a public bucket, the local backend from an API route, and neither URL
 * should be baked into a row that outlives the storage arrangement.
 */
export interface PromptImage {
  id: string;
  promptId: string;
  url: string;
  caption: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string | null;
  position: number;
  createdAt: string;
}

export const MAX_CAPTION = 200;

/**
 * Upload limits. They live here, not next to the sharp code that enforces
 * them, so the browser can check a file before sending it without dragging a
 * native image library into the client bundle.
 */
export const MAX_SAMPLE_BYTES = 12 * 1024 * 1024;
export const ACCEPTED_SAMPLE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** The fields a caller may set. Everything else is owned by the store. */
export interface PromptDraft {
  title: string;
  summary: string;
  body: string;
  notes: string;
  category: Category;
  tags: string[];
  targetModel: string;
  source: string;
  accent: string;
}

export const EMPTY_DRAFT: PromptDraft = {
  title: "",
  summary: "",
  body: "",
  notes: "",
  category: "artistic",
  tags: [],
  targetModel: "any",
  source: "",
  accent: ACCENTS[0],
};

export const MAX = {
  title: 80,
  summary: 140,
  body: 4000,
  notes: 2000,
  targetModel: 60,
  source: 300,
  tags: 12,
  tag: 24,
} as const;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeTag(value: string): string {
  return slugify(value).slice(0, MAX.tag);
}

export interface ValidationResult {
  ok: boolean;
  /** Field name -> message. Empty when `ok`. */
  errors: Record<string, string>;
  draft: PromptDraft;
}

/**
 * Coerce untrusted JSON into a draft. Never throws — the caller decides what a
 * failure means. Strings are trimmed and capped rather than rejected on length,
 * except where a cap would silently destroy meaning (title, body).
 */
export function validateDraft(input: unknown): ValidationResult {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const title = str(raw.title);
  if (!title) errors.title = "Title is required.";
  else if (title.length > MAX.title) errors.title = `Title is over ${MAX.title} characters.`;
  else if (!slugify(title)) errors.title = "Title needs at least one letter or number.";

  const body = str(raw.body);
  if (!body) errors.body = "Prompt text is required.";
  else if (body.length > MAX.body) errors.body = `Prompt text is over ${MAX.body} characters.`;

  const category = CATEGORIES.includes(raw.category as Category)
    ? (raw.category as Category)
    : "other";

  const tags = Array.from(
    new Set(
      (Array.isArray(raw.tags) ? raw.tags : [])
        .map((t) => normalizeTag(String(t)))
        .filter(Boolean),
    ),
  ).slice(0, MAX.tags);

  const accent = ACCENTS.includes(raw.accent as (typeof ACCENTS)[number])
    ? String(raw.accent)
    : ACCENTS[0];

  const source = str(raw.source).slice(0, MAX.source);
  if (source && !/^(https?:\/\/|[^\s])/.test(source)) errors.source = "Source looks malformed.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    draft: {
      title,
      summary: str(raw.summary).slice(0, MAX.summary),
      body,
      notes: str(raw.notes).slice(0, MAX.notes),
      category,
      tags,
      targetModel: str(raw.targetModel).slice(0, MAX.targetModel) || "any",
      source,
      accent,
    },
  };
}

export interface PromptFilter {
  /** Matches title, summary, body, notes and tags. */
  q?: string;
  category?: Category | "all";
  tag?: string;
  favoritesOnly?: boolean;
  sort?: SortKey;
}

export const SORTS = ["recent", "oldest", "title", "most-copied"] as const;
export type SortKey = (typeof SORTS)[number];

/** Pure so the library page can filter on the client and the API on the server. */
export function filterPrompts(prompts: Prompt[], filter: PromptFilter = {}): Prompt[] {
  const q = filter.q?.trim().toLowerCase() ?? "";
  const out = prompts.filter((p) => {
    if (filter.favoritesOnly && !p.favorite) return false;
    if (filter.category && filter.category !== "all" && p.category !== filter.category) return false;
    if (filter.tag && !p.tags.includes(filter.tag)) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q) ||
      p.targetModel.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
    );
  });

  const by: Record<SortKey, (a: Prompt, b: Prompt) => number> = {
    recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
    "most-copied": (a, b) => b.copies - a.copies || b.updatedAt.localeCompare(a.updatedAt),
  };
  return out.sort(by[filter.sort ?? "recent"]);
}

/** Tag -> count, most used first. Drives the filter chips. */
export function tagCounts(prompts: Prompt[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of prompts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Reads a filter out of whatever holds the query string. Takes an accessor so
 * the same rules serve a `URLSearchParams` in the API route and Next's resolved
 * `searchParams` object on the page — the two cannot drift apart.
 *
 * Unknown values fall back rather than erroring: a mangled link shows the whole
 * library instead of a stack trace.
 */
export function parseFilter(get: (key: string) => string | null | undefined): PromptFilter {
  const category = get("category");
  const sort = get("sort");
  return {
    q: get("q")?.trim() || undefined,
    category: CATEGORIES.includes(category as Category) ? (category as Category) : "all",
    tag: get("tag")?.trim() || undefined,
    favoritesOnly: get("favorites") === "1",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "recent",
  };
}

/** Inverse of `parseFilter`. Defaults are omitted so a plain view has a clean URL. */
export function filterToQuery(filter: PromptFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.category && filter.category !== "all") params.set("category", filter.category);
  if (filter.tag) params.set("tag", filter.tag);
  if (filter.favoritesOnly) params.set("favorites", "1");
  if (filter.sort && filter.sort !== "recent") params.set("sort", filter.sort);
  return params.toString();
}
