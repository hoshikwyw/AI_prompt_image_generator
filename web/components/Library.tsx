"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import BackToTop from "./BackToTop";
import ImportExport from "./ImportExport";
import PromptCard from "./PromptCard";
import type { PromptPatch } from "./PromptActions";
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
  parseFilter,
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

/**
 * The filter a URL asks for. A link that says who or which AI wins over the
 * remembered choice, the same rule the server applies.
 */
function filterFromUrl(params: Pick<URLSearchParams, "get" | "has">, prefs: Prefs): PromptFilter {
  const fromUrl = parseFilter((key) => params.get(key));
  return params.has("for") || params.has("ai") ? fromUrl : { ...fromUrl, ...prefs };
}

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
  savedPrefs: initialPrefs,
  canEdit,
  covers,
}: Props) {
  const [prompts, setPrompts] = useState(initial);
  const searchParams = useSearchParams();
  // From the URL as it is now, not as the server last rendered it: the filter
  // lives in the URL through replaceState, and Back to the library restores the
  // render from the first visit — so a prop-based start reopened with the
  // search and chips gone.
  const [filter, setFilter] = useState<PromptFilter>(() => filterFromUrl(searchParams, initialPrefs));
  const [savedPrefs, setSavedPrefs] = useState<Prefs>(initialPrefs);
  const [allTagsShown, setAllTagsShown] = useState(false);

  // Sorted on the copy counts the page loaded with. Copying bumps the count on
  // the card at once, and under "Most copied" the card then jumped past its
  // neighbour — so a quick second click landed on a different prompt.
  const [loadedCopies] = useState(() => new Map(initial.map((p) => [p.id, p.copies])));
  const visible = useMemo(() => {
    const live = new Map(prompts.map((p) => [p.id, p]));
    const frozen = prompts.map((p) => ({ ...p, copies: loadedCopies.get(p.id) ?? p.copies }));
    return filterPrompts(frozen, filter).map((p) => live.get(p.id)!);
  }, [prompts, filter, loadedCopies]);
  // Counts stay whole-collection so chips do not vanish as you narrow.
  const tags = useMemo(() => tagCounts(prompts), [prompts]);
  const shownTags = allTagsShown ? tags : tags.slice(0, TAGS_COLLAPSED);

  // What each category chip would show given every other filter — so someone
  // browsing for men sees at a glance which categories have anything for them.
  // Empty ones are left out rather than greyed: a row of "0"s is noise, and
  // the extra width wraps the rail onto a second line.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of filterPrompts(prompts, { ...filter, category: "all" })) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return counts;
  }, [prompts, filter]);
  const allCount = [...categoryCounts.values()].reduce((a, b) => a + b, 0);

  // "/" jumps to search, the convention most sites with a search box share —
  // unless the visitor is already typing somewhere.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the URL shareable without a navigation — this is view state, not a page.
  // Every query written is remembered, so the effect below can tell this
  // library's own URL changes from a navigation it did not make.
  const written = useRef(new Set<string>());
  useEffect(() => {
    const query = filterToQuery(filter);
    written.current.add(query);
    if (written.current.size > 50) written.current.delete(written.current.values().next().value!);
    window.history.replaceState(null, "", query ? `/?${query}` : "/");
  }, [filter]);

  // A link to the library while already on it — the logo, a "/?tag=…" link —
  // changes the URL, but Next serves its cached render and this component
  // keeps its state, so the grid stayed filtered under a URL that said
  // otherwise. A query the library never wrote came from such a navigation.
  // (Checked against everything written, not only the last: the URL catches
  // up a beat late, and mid-typing it can still show an earlier keystroke.)
  const urlQuery = searchParams.toString();
  useEffect(() => {
    if (written.current.has(urlQuery)) return;
    // Syncing from the URL, an external system, is what an effect is for.
    setFilter(filterFromUrl(new URLSearchParams(urlQuery), savedPrefs));
    // savedPrefs is read, not tracked: a new choice is not a navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

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

  const patchPrompt = (id: string, patch: PromptPatch) =>
    setPrompts((list) =>
      list.map((p) => (p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p)),
    );

  // Only an admin can star a prompt, so to a visitor the stars are the
  // editor's picks — and a filter for picks that do not exist is a dead end.
  // It stays while active, so a link that turned it on can turn it off.
  const starLabel = canEdit ? "Favourites" : "Editor's picks";
  const showStarFilter =
    canEdit || Boolean(filter.favoritesOnly) || prompts.some((p) => p.favorite);

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
        {canEdit && <ImportExport onImported={setPrompts} />}
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
              ref={searchRef}
              type="search"
              value={filter.q ?? ""}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search saree, anime, logo…"
              aria-label="Search prompts"
              aria-keyshortcuts="/"
              className="peer field pl-10 sm:pr-10"
            />
            {/* The shortcut, shown where a keyboard is likely and only while
                the box is empty and unfocused. */}
            {!filter.q && (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-subtle sm:block sm:peer-focus:hidden"
              >
                /
              </kbd>
            )}
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

            {showStarFilter && (
              <button
                type="button"
                onClick={() => set({ favoritesOnly: !filter.favoritesOnly })}
                aria-pressed={Boolean(filter.favoritesOnly)}
                title={`Show ${starLabel.toLowerCase()} only`}
                className={`btn btn-icon shrink-0 ${
                  filter.favoritesOnly
                    ? "border-warning-border bg-warning-soft text-warning"
                    : "text-muted"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {filter.favoritesOnly ? "★" : "☆"}
                </span>
                <span className="sr-only">{starLabel} only</span>
              </button>
            )}
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

        {/* Nothing to narrow when the other filters already match nothing —
            a lone "All 0" chip is just noise above the empty state. */}
        {(allCount > 0 || (filter.category ?? "all") !== "all") && (
          <div className="rail">
            <button
              type="button"
              onClick={() => set({ category: "all" })}
              data-active={(filter.category ?? "all") === "all"}
              className="chip"
            >
              All
              <span className="text-subtle">{allCount}</span>
            </button>
            {CATEGORIES.map((category) => {
              const count = categoryCounts.get(category) ?? 0;
              const active = filter.category === category;
              // The chosen one stays even when empty, so it is visible to undo.
              if (count === 0 && !active) return null;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => set({ category })}
                  data-active={active}
                  className="chip"
                >
                  {CATEGORY_LABELS[category]}
                  <span className="text-subtle">{count}</span>
                </button>
              );
            })}
          </div>
        )}

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
        {/* Announced as it changes, so a screen reader hears what a filter did. */}
        <span aria-live="polite">
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
            {prompts.length === 0
              ? "Your collection is empty"
              : filter.q
                ? `No prompts match “${filter.q}”`
                : "Nothing matches those filters"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {prompts.length === 0
              ? "Add the first one to get started."
              : filter.q
                ? "Try a shorter word — saree, anime, logo — or clear the filters."
                : "Try a different audience or AI, or clear the filters."}
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

      <BackToTop />
    </div>
  );
}
