"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ImportExport from "./ImportExport";
import PromptCard from "./PromptCard";
import {
  CATEGORIES,
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

/**
 * The library. Filtering runs here rather than over the network — the whole
 * collection is a few kilobytes, and a search box that waits on a round trip
 * per keystroke feels broken. `filterPrompts` is the same function the API
 * uses, so the two views of the collection cannot disagree.
 */
export default function Library({ prompts: initial, initialFilter, canEdit, covers }: Props) {
  const [prompts, setPrompts] = useState(initial);
  const [filter, setFilter] = useState<PromptFilter>(initialFilter);

  const visible = useMemo(() => filterPrompts(prompts, filter), [prompts, filter]);
  // Counts stay whole-collection so chips do not vanish as you narrow.
  const tags = useMemo(() => tagCounts(prompts).slice(0, 14), [prompts]);

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

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition ${
      active
        ? "border-neutral-500 bg-neutral-800 text-foreground"
        : "border-line bg-card text-muted hover:border-neutral-600 hover:text-foreground"
    }`;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Prompt library</h1>
          <p className="mt-2 max-w-xl text-muted">
            Collect prompts that work, tag them, and copy one when you need it.
          </p>
        </div>
        <ImportExport onImported={setPrompts} canImport={canEdit} />
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filter.q ?? ""}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search title, text, notes, tags…"
            aria-label="Search prompts"
            className="min-w-60 flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-neutral-500"
          />

          <select
            value={filter.sort ?? "recent"}
            onChange={(e) => set({ sort: e.target.value as SortKey })}
            aria-label="Sort prompts"
            className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500"
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
            className={`rounded-xl border px-3 py-2.5 text-sm transition ${
              filter.favoritesOnly
                ? "border-amber-700 bg-amber-950/40 text-amber-300"
                : "border-line bg-card text-muted hover:border-neutral-600 hover:text-foreground"
            }`}
          >
            ★ Favourites
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => set({ category: "all" })} className={chip((filter.category ?? "all") === "all")}>
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => set({ category })}
              className={`${chip(filter.category === category)} capitalize`}
            >
              {category}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                // Clicking the active tag clears it, so a chip is its own undo.
                onClick={() => set({ tag: filter.tag === tag ? undefined : tag })}
                className={chip(filter.tag === tag)}
              >
                #{tag} <span className="text-muted">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>
          {visible.length} of {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={() => setFilter({ category: "all", sort: filter.sort })}
            className="transition hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-medium">
            {prompts.length === 0 ? "Your collection is empty" : "Nothing matches those filters"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {prompts.length === 0
              ? "Add the first one to get started."
              : "Try a broader search, or clear the filters."}
          </p>
          {prompts.length === 0 && canEdit && (
            <Link
              href="/prompts/new"
              className="mt-4 inline-block rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-white"
            >
              New prompt
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
