"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ImportExport from "./ImportExport";
import PromptCard from "./PromptCard";
import {
  CATEGORIES,
  DEFAULT_SORT,
  SORTS,
  filterPrompts,
  filterToQuery,
  tagCounts,
  type Prompt,
  type PromptFilter,
  type PromptImage,
  type SortKey,
} from "@/lib/prompt";

interface Props {
  prompts: Prompt[];
  /** Parsed from the query string on the server, so a shared link opens filtered. */
  initialFilter: PromptFilter;
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

/**
 * The library. Filtering runs here rather than over the network — the whole
 * collection is a few kilobytes, and a search box that waits on a round trip
 * per keystroke feels broken. `filterPrompts` is the same function the API
 * uses, so the two views of the collection cannot disagree.
 */
export default function Library({ prompts: initial, initialFilter, canEdit, covers }: Props) {
  const [prompts, setPrompts] = useState(initial);
  const [filter, setFilter] = useState<PromptFilter>(initialFilter);
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

  const patchPrompt = (id: string, patch: Partial<Prompt>) =>
    setPrompts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const isFiltered =
    Boolean(filter.q) ||
    (filter.category ?? "all") !== "all" ||
    Boolean(filter.tag) ||
    Boolean(filter.favoritesOnly);

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Prompt library
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
            Collect prompts that work, tag them, and copy one when you need it.
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
            <select
              value={filter.sort ?? DEFAULT_SORT}
              onChange={(e) => set({ sort: e.target.value as SortKey })}
              aria-label="Sort prompts"
              className="field flex-1 sm:w-48 sm:flex-none"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>

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
              className="chip capitalize"
            >
              {category}
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
            onClick={() => setFilter({ category: "all", sort: filter.sort })}
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
              onClick={() => setFilter({ category: "all", sort: filter.sort })}
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
