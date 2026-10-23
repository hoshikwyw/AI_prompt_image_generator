/**
 * The unit this app collects: one reusable AI prompt.
 *
 * The app never runs a prompt itself — you find one, copy it, and paste it into
 * whichever AI you use. The shape below mirrors the `prompts` table's columns.
 *
 * A prompt can be for any kind of image. Each one says what it makes
 * (`category`), who it suits (`audience`) and which AI tools it is known to
 * work in (`models`), so a visitor can narrow the library to prompts that fit
 * them and the tool they have open.
 */

/**
 * Mirrored by the `prompts_category_known` check constraint in the migrations —
 * adding one here means adding it there too.
 */
export const CATEGORIES = [
  "portrait",
  "fashion",
  "anime",
  "art",
  "3d",
  "fantasy",
  "landscape",
  "architecture",
  "product",
  "logo",
  "animals",
  "food",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  portrait: "Portrait",
  fashion: "Fashion",
  anime: "Anime",
  art: "Art",
  "3d": "3D",
  fantasy: "Fantasy",
  landscape: "Landscape",
  architecture: "Architecture",
  product: "Product",
  logo: "Logo",
  animals: "Animals",
  food: "Food",
  other: "Other",
};

/**
 * Categories from when the collection only held portrait restyles. Old exports
 * and old rows map onto the current set rather than all landing in "other".
 */
const LEGACY_CATEGORIES: Record<string, Category> = {
  artistic: "art",
  photographic: "portrait",
  stylised: "art",
  character: "portrait",
  scene: "landscape",
};

export function toCategory(value: unknown): Category {
  if (CATEGORIES.includes(value as Category)) return value as Category;
  return LEGACY_CATEGORIES[String(value)] ?? "other";
}

/**
 * Who a prompt suits. "any" is a prompt that works for anyone — a landscape, or
 * a portrait restyle that does not assume a gender — so a visitor filtering for
 * women still sees it. Mirrored by `prompts_audience_known`.
 */
export const AUDIENCES = ["any", "female", "male", "couple"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  any: "Everyone",
  female: "Women",
  male: "Men",
  couple: "Couples",
};

export function toAudience(value: unknown): Audience {
  return AUDIENCES.includes(value as Audience) ? (value as Audience) : "any";
}

/**
 * The AI tools a prompt can be tagged with. The app never calls any of them; the
 * list only answers "will this work where I am about to paste it". Mirrored by
 * `prompts_models_known`.
 */
export const AI_TOOLS = [
  "chatgpt",
  "gemini",
  "midjourney",
  "flux",
  "stable-diffusion",
  "leonardo",
  "ideogram",
  "grok",
  "copilot",
] as const;
export type AiTool = (typeof AI_TOOLS)[number];

export const AI_TOOL_LABELS: Record<AiTool, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  midjourney: "Midjourney",
  flux: "Flux",
  "stable-diffusion": "Stable Diffusion",
  leonardo: "Leonardo",
  ideogram: "Ideogram",
  grok: "Grok",
  copilot: "Copilot",
};

/** Known ids only, deduplicated, in `AI_TOOLS` order so equal lists compare equal. */
export function toModels(value: unknown): AiTool[] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.map(String));
  return AI_TOOLS.filter((tool) => wanted.has(tool));
}

/**
 * Prompts used to carry a free-text `targetModel` ("flux.2-klein", "any").
 * Kept in step with the backfill in the migration that replaced it.
 */
const LEGACY_MODEL_PATTERNS: Array<[RegExp, AiTool]> = [
  [/gemini|nano.?banana|imagen/i, "gemini"],
  [/chatgpt|gpt|dall/i, "chatgpt"],
  [/midjourney/i, "midjourney"],
  [/flux/i, "flux"],
  [/stable.?diffusion|sdxl/i, "stable-diffusion"],
  [/leonardo/i, "leonardo"],
  [/ideogram/i, "ideogram"],
  [/grok/i, "grok"],
  [/copilot|bing|designer/i, "copilot"],
];

export function legacyModels(targetModel: unknown): AiTool[] {
  const text = typeof targetModel === "string" ? targetModel : "";
  const match = LEGACY_MODEL_PATTERNS.find(([pattern]) => pattern.test(text));
  return match ? [match[1]] : [];
}

/**
 * `models` from untrusted or stored data — a form post, an import file, a row
 * written before `models` existed (which carries a free-text `targetModel`
 * instead). Null when `models` is present but not a list, so the caller
 * decides whether that is an error or just "any AI".
 */
export function readModels(raw: { models?: unknown; targetModel?: unknown }): AiTool[] | null {
  if (Array.isArray(raw.models)) return toModels(raw.models);
  if (raw.models === undefined) return legacyModels(raw.targetModel);
  return null;
}


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

/** What a screen reader announces for each swatch — not its class names. */
export const ACCENT_NAMES: Record<(typeof ACCENTS)[number], string> = {
  "from-stone-400 to-stone-600": "Stone",
  "from-amber-700 to-yellow-900": "Amber",
  "from-sky-400 to-indigo-600": "Sky",
  "from-fuchsia-500 to-cyan-500": "Neon",
  "from-teal-500 to-blue-700": "Ocean",
  "from-slate-500 to-slate-700": "Slate",
  "from-rose-500 to-orange-600": "Sunset",
  "from-emerald-500 to-lime-700": "Forest",
};

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
  /** Who it suits. */
  audience: Audience;
  /** AI tools it is known to work in. Empty means it is not tied to one. */
  models: AiTool[];
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
/**
 * 4 MB, not something rounder, because Vercel's Hobby tier rejects request
 * bodies over ~4.5 MB at the platform edge — before any of our code runs. A
 * larger cap here would mean the user sees an opaque 413 from the host instead
 * of a message explaining what to do.
 */
export const MAX_SAMPLE_BYTES = 4 * 1024 * 1024;

/** For messages, so the number quoted to the user cannot drift from the cap. */
export const MAX_SAMPLE_LABEL = `${Math.round(MAX_SAMPLE_BYTES / (1024 * 1024))} MB`;
export const ACCEPTED_SAMPLE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** The fields a caller may set. Everything else is owned by the store. */
export interface PromptDraft {
  title: string;
  summary: string;
  body: string;
  notes: string;
  category: Category;
  tags: string[];
  audience: Audience;
  models: AiTool[];
  source: string;
  accent: string;
}

/**
 * The editable part of a stored prompt — what the edit form starts from and an
 * edit is merged onto. Spelled out rather than looped so that adding a field to
 * `PromptDraft` without adding it here is a compile error.
 */
export function toDraft(prompt: PromptDraft): PromptDraft {
  const { title, summary, body, notes, category, tags, audience, models, source, accent } = prompt;
  return { title, summary, body, notes, category, tags, audience, models, source, accent };
}

export const EMPTY_DRAFT: PromptDraft = {
  title: "",
  summary: "",
  body: "",
  notes: "",
  category: "portrait",
  tags: [],
  audience: "any",
  models: [],
  source: "",
  accent: ACCENTS[0],
};

export const MAX = {
  title: 80,
  summary: 140,
  body: 4000,
  notes: 2000,
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

  const category = toCategory(raw.category);
  // Quietly reading a malformed `models` as "any AI" would wipe a prompt's
  // tools on a bad PATCH, so it is an error here.
  const models = readModels(raw);
  if (!models) errors.models = "AI tools must be a list.";

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
      audience: toAudience(raw.audience),
      models: models ?? [],
      source,
      accent,
    },
  };
}

export interface PromptFilter {
  /** Matches title, summary, body, notes and tags. */
  q?: string;
  category?: Category | "all";
  /** Who the visitor wants prompts for. Prompts for everyone always match. */
  audience?: AudienceFilter | "all";
  /** The AI tool they will paste into. Untagged prompts always match. */
  model?: AiTool;
  tag?: string;
  favoritesOnly?: boolean;
  sort?: SortKey;
}

/**
 * The audiences a visitor can filter by. "any" is not one of them: a prompt for
 * everyone shows up under every choice, so filtering *for* it would only hide
 * the prompts aimed at the visitor.
 */
export const AUDIENCE_FILTERS = ["female", "male", "couple"] as const;
export type AudienceFilter = (typeof AUDIENCE_FILTERS)[number];

export const SORTS = ["most-copied", "recent", "oldest", "title"] as const;

/**
 * What a visitor sees first. Most-copied is social proof — it surfaces what
 * actually works without anyone curating it — and it degrades to recency on a
 * new collection, since the comparator breaks ties on updatedAt.
 */
export const DEFAULT_SORT: SortKey = "most-copied";
export type SortKey = (typeof SORTS)[number];

/** Pure so the library page can filter on the client and the API on the server. */
export function filterPrompts(prompts: Prompt[], filter: PromptFilter = {}): Prompt[] {
  const q = filter.q?.trim().toLowerCase() ?? "";
  const out = prompts.filter((p) => {
    if (filter.favoritesOnly && !p.favorite) return false;
    if (filter.category && filter.category !== "all" && p.category !== filter.category) return false;
    if (
      filter.audience &&
      filter.audience !== "all" &&
      p.audience !== "any" &&
      p.audience !== filter.audience
    ) {
      return false;
    }
    if (filter.model && p.models.length > 0 && !p.models.includes(filter.model)) return false;
    if (filter.tag && !p.tags.includes(filter.tag)) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q) ||
      p.models.some((m) => AI_TOOL_LABELS[m].toLowerCase().includes(q)) ||
      p.tags.some((t) => t.includes(q))
    );
  });

  const by: Record<SortKey, (a: Prompt, b: Prompt) => number> = {
    recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
    "most-copied": (a, b) => b.copies - a.copies || b.updatedAt.localeCompare(a.updatedAt),
  };
  const sort = by[filter.sort ?? DEFAULT_SORT];

  // A filter for women or for Gemini keeps prompts that suit everyone or any
  // tool, but they are the fallback, not the point: the prompts aimed at the
  // choice come first, and the chosen sort orders each group.
  const audience = filter.audience && filter.audience !== "all" ? filter.audience : null;
  const model = filter.model ?? null;
  const rank = (p: Prompt) =>
    (audience && p.audience !== audience ? 2 : 0) + (model && !p.models.includes(model) ? 1 : 0);

  return out.sort((a, b) => rank(a) - rank(b) || sort(a, b));
}

/**
 * Prompts to offer under this one. Only ones that suit the same people — a
 * prompt for women never suggests one for men — then the same category first,
 * then the same audience, most copied within each.
 */
export function relatedPrompts(prompt: Prompt, all: Prompt[], limit: number): Prompt[] {
  const suits = (p: Prompt) =>
    prompt.audience === "any" || p.audience === "any" || p.audience === prompt.audience;
  const score = (p: Prompt) =>
    (p.category === prompt.category ? 2 : 0) +
    (prompt.audience !== "any" && p.audience === prompt.audience ? 1 : 0);

  return all
    .filter((p) => p.id !== prompt.id && suits(p))
    .sort(
      (a, b) =>
        score(b) - score(a) || b.copies - a.copies || b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, limit);
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
  const audience = get("for");
  const model = get("ai");
  const sort = get("sort");
  return {
    q: get("q")?.trim() || undefined,
    category: CATEGORIES.includes(category as Category) ? (category as Category) : "all",
    audience: AUDIENCE_FILTERS.includes(audience as AudienceFilter)
      ? (audience as AudienceFilter)
      : "all",
    model: AI_TOOLS.includes(model as AiTool) ? (model as AiTool) : undefined,
    tag: get("tag")?.trim() || undefined,
    favoritesOnly: get("favorites") === "1",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
  };
}

/**
 * Who the visitor last browsed for and which AI they paste into, so they do not
 * pick "Women · Gemini" again on every visit. A cookie rather than local
 * storage because the server renders the library: it can open already
 * filtered, with no flash of everything first. Holds the same `for`/`ai` query
 * a link would, and is read through `parseFilter`, so a stale value falls back
 * exactly the way a mangled link does.
 */
export const PREFS_COOKIE = "promptbook-prefs";

export function readPrefs(value: string | undefined): Pick<PromptFilter, "audience" | "model"> {
  const saved = new URLSearchParams(value ?? "");
  const { audience, model } = parseFilter((key) => saved.get(key));
  return { audience, model };
}

/** Inverse of `parseFilter`. Defaults are omitted so a plain view has a clean URL. */
export function filterToQuery(filter: PromptFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.category && filter.category !== "all") params.set("category", filter.category);
  if (filter.audience && filter.audience !== "all") params.set("for", filter.audience);
  if (filter.model) params.set("ai", filter.model);
  if (filter.tag) params.set("tag", filter.tag);
  if (filter.favoritesOnly) params.set("favorites", "1");
  if (filter.sort && filter.sort !== DEFAULT_SORT) params.set("sort", filter.sort);
  return params.toString();
}
