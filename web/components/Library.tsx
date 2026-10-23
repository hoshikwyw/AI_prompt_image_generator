"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ImportExport from "./ImportExport";
import PromptCard from "./PromptCard";
import Select from "./Select";
import {
  AI_TOOLS,
  AI_TOOL_LABELS,
  AUDIENCE_FILTERS,
  AUDIENCE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_SORT,
  PREFS_COOKIE,
  SORTS,
  filterPrompts,
  filterToQuery,
  tagCounts,
  type AiTool,
  type Prompt,
  type PromptFilter,
  type PromptImage,
  type SortKey,
} from "@/lib/prompt";

interface Props {
  prompts: Prompt[];
  /**
   * Parsed from the query string on the server, so a shared link opens
   * filtered — or, on a plain visit, from the visitor's remembered choice.
   */
  initialFilter: PromptFilter;
  /**
   * What the visitor's cookie held when the page loaded. Not the same as the
   * view's audience and model when a link set those — and a link's values must
   * not end up saved as the visitor's own choice.
   */
  savedPrefs: Pick<PromptFilter, "audience" | "model">;
  /** False for a visitor: the write controls are not rendered at all. */
  canEdit: boolean;
  /** Prompt id -> its first sample image, for the card tiles. */
  covers: Record<string, PromptImage>;
}

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently updated",
  oldest: "Oldest first",
  title: "Title A–Z",
  "most-copied": "Most copied",
};

/** Beyond this the tag rail turns into a wall, so the rest hide behind a toggle. */
const TAGS_COLLAPSED = 8;

const AUDIENCE_OPTIONS = ["all", ...AUDIENCE_FILTERS] as const;
const MODEL_OPTIONS = [
  { value: "all" as const, label: "Any AI" },
  ...AI_TOOLS.map((tool) => ({ value: tool, label: AI_TOOL_LABELS[tool] })),
];

type Prefs = Pick<PromptFilter, "audience" | "model">;

/** A year: long enough to feel remembered, and refreshed on every choice. */
const PREFS_MAX_AGE = 60 * 60 * 24 * 365;

/** Saves the choice the page reads on the next visit; see `PREFS_COOKIE`. */
function writePrefs({ audience, model }: Prefs) {
  const value = filterToQuery({ audience, model });
  document.cookie = value
    ? `${PREFS_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${PREFS_MAX_AGE}; samesite=lax`
    : `${PREFS_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * The library. Filtering runs here rather than over the network — the whole
 * collection is a few kilobytes, and a search box that waits on a round trip
 * per keystroke feels broken. `filterPrompts` is the same function the API
 * uses, so the two views of the collection cannot disagree.
 */
export default function Library({
  prompts: initial,
  initialFilter,
  savedPrefs: initialPrefs,
  canEdit,
  covers,
}: Props) {
  const [prompts, setPrompts] = useState(initial);
  const [filter, setFilter] = useState<PromptFilter>(initialFilter);
  const [savedPrefs, setSavedPrefs] = useState<Prefs>(initialPrefs);
  const [allTagsShown, setAllTagsShown] = useState(false);

  const visible = useMemo(() => filterPrompts(prompts, filter), [prompts, filter]);
  // Counts stay whole-collection so chips do not vanish as you narrow.
  const tags = useMemo(() => tagCounts(prompts), [prompts]);
  const shownTags = allTagsShown ? tags : tags.slice(0, TAGS_COLLAPSED);

  // Keep the URL shareable without a navigation — this is view state, not a page.
  useEffect(() => {
    const query = filterToQuery(filter);
    window.history.replaceState(null, "", query ? `/?${query}` : "/");
  }, [filter]);

  const set = (patch: Partial<PromptFilter>) => setFilter((f) => ({ ...f, ...patch }));

  /**
   * Only a choice the visitor makes is remembered — never one a link made. So
   * the patch lands on what was saved, not on the view: picking an AI while on
   * someone's `?for=couple` link keeps your own saved audience.
   */
  const choose = (patch: Prefs) => {
    const prefs = { ...savedPrefs, ...patch };
    writePrefs(prefs);
    setSavedPrefs(prefs);
    setFilter((f) => ({ ...f, ...patch }));
  };

  const clearFilters = () => {
    writePrefs({});
    setSavedPrefs({});
    setFilter({ category: "all", sort: filter.sort });
  };

  const patchPrompt = (id: string, patch: Partial<Prompt>) =>
    setPrompts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const isFiltered =
    Boolean(filter.q) ||
    (filter.category ?? "all") !== "all" ||
    (filter.audience ?? "all") !== "all" ||
    Boolean(filter.model) ||
    Boolean(filter.tag) ||
    Boolean(filter.favoritesOnly);

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Image prompts
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
            Pick who it&rsquo;s for and the AI you use, copy a prompt, and paste it in.
          </p>
        </div>
        <ImportExport onImported={setPrompts} canImport={canEdit} />
      </header>

      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={filter.q ?? ""}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search prompts…"
              aria-label="Search prompts"
              className="field pl-10"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Select
              label="AI tool"
              value={filter.model ?? "all"}
              options={MODEL_OPTIONS}
              onChange={(model) => choose({ model: model === "all" ? undefined : (model as AiTool) })}
              className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            />

            <Select
              label="Sort prompts"
              value={filter.sort ?? DEFAULT_SORT}
              options={SORTS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
              onChange={(sort) => set({ sort })}
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            />

            <button
              type="button"
              onClick={() => set({ favoritesOnly: !filter.favoritesOnly })}
              aria-pressed={Boolean(filter.favoritesOnly)}
              title="Show favourites only"
              className={`btn btn-icon shrink-0 ${
                filter.favoritesOnly
                  ? "border-amber-600/60 bg-amber-500/10 text-amber-300"
                  : "text-muted"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {filter.favoritesOnly ? "★" : "☆"}
              </span>
              <span className="sr-only">Favourites only</span>
            </button>
          </div>
        </div>

        <div className="segmented" role="group" aria-label="Show prompts for">
          {AUDIENCE_OPTIONS.map((audience) => (
            <button
              key={audience}
              type="button"
              onClick={() => choose({ audience })}
              aria-pressed={(filter.audience ?? "all") === audience}
            >
              {audience === "all" ? "All" : AUDIENCE_LABELS[audience]}
            </button>
          ))}
        </div>

        <div className="rail">
          <button
            type="button"
            onClick={() => set({ category: "all" })}
            data-active={(filter.category ?? "all") === "all"}
            className="chip"
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => set({ category })}
              data-active={filter.category === category}
              className="chip"
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="rail">
            {shownTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                // Clicking the active tag clears it, so a chip is its own undo.
                onClick={() => set({ tag: filter.tag === tag ? undefined : tag })}
                data-active={filter.tag === tag}
                className="chip"
              >
                #{tag}
                <span className="text-subtle">{count}</span>
              </button>
            ))}
            {tags.length > TAGS_COLLAPSED && (
              <button
                type="button"
                onClick={() => setAllTagsShown((v) => !v)}
                className="chip border-dashed"
              >
                {allTagsShown ? "Show fewer" : `+${tags.length - TAGS_COLLAPSED} more`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 text-sm text-muted">
        <span>
          <strong className="font-medium text-foreground">{visible.length}</strong>
          {visible.length !== prompts.length && <> of {prompts.length}</>}{" "}
          {prompts.length === 1 ? "prompt" : "prompts"}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="btn btn-ghost btn-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card border-dashed px-6 py-14 text-center sm:py-20">
          <p className="text-base font-medium">
            {prompts.length === 0 ? "Your collection is empty" : "Nothing matches those filters"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {prompts.length === 0
              ? "Add the first one to get started."
              : "Try a broader search, or clear the filters."}
          </p>
          {prompts.length === 0 && canEdit && (
            <Link href="/prompts/new" className="btn btn-primary mt-5">
              New prompt
            </Link>
          )}
          {prompts.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn mt-5"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {visible.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onChange={(patch) => patchPrompt(prompt.id, patch)}
              onTagClick={(tag) => set({ tag: filter.tag === tag ? undefined : tag })}
              canEdit={canEdit}
              image={covers[prompt.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
