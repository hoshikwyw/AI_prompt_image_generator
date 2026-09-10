"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACCENTS,
  CATEGORIES,
  EMPTY_DRAFT,
  MAX,
  normalizeTag,
  validateDraft,
  type Category,
  type Prompt,
  type PromptDraft,
} from "@/lib/prompt";

interface Props {
  /** Present when editing; absent when creating. */
  prompt?: Prompt;
}

type Errors = Record<string, string>;

/** The shared input treatment lives in globals.css, so every field matches. */
const field = "field";

/**
 * One form for both create and edit — the fields and rules are identical, and
 * the only difference is where it submits.
 *
 * Validation runs through the same `validateDraft` the API uses, so the client
 * catches the obvious cases without inventing a second, drifting set of rules.
 * The server still validates; this only saves a round trip.
 */
export default function PromptForm({ prompt }: Props) {
  const router = useRouter();
  const editing = Boolean(prompt);

  const [draft, setDraft] = useState<PromptDraft>(() =>
    prompt
      ? {
          title: prompt.title,
          summary: prompt.summary,
          body: prompt.body,
          notes: prompt.notes,
          category: prompt.category,
          tags: prompt.tags,
          targetModel: prompt.targetModel,
          source: prompt.source,
          accent: prompt.accent,
        }
      : EMPTY_DRAFT,
  );
  // Tags are edited as free text and only normalised on the way out, so typing
  // a space mid-word does not rewrite the field under the cursor.
  const [tagsText, setTagsText] = useState(prompt?.tags.join(", ") ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const parsedTags = Array.from(
    new Set(tagsText.split(",").map(normalizeTag).filter(Boolean)),
  ).slice(0, MAX.tags);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const candidate = { ...draft, tags: parsedTags };
    const check = validateDraft(candidate);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(editing ? `/api/prompts/${prompt!.id}` : "/api/prompts", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(candidate),
      });

      if (res.status === 422) {
        const { errors: serverErrors } = (await res.json()) as { errors: Errors };
        setErrors(serverErrors);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const saved = (await res.json()) as Prompt;
      router.push(`/prompts/${saved.id}`);
      // The library and detail pages read the file per request; refresh drops
      // the client-side route cache so the change is visible immediately.
      router.refresh();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save the prompt." });
    } finally {
      setSubmitting(false);
    }
  }

  const error = (key: string) =>
    errors[key] ? <p className="mt-1 text-xs text-red-400">{errors[key]}</p> : null;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6 pb-24 sm:pb-0">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={MAX.title}
          placeholder="Renaissance Oil"
          className={field}
        />
        {error("title")}
      </div>

      <div>
        <label htmlFor="summary" className="mb-1.5 block text-sm font-medium">
          Summary <span className="font-normal text-muted">— one line for the card</span>
        </label>
        <input
          id="summary"
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
          maxLength={MAX.summary}
          placeholder="17th-century Dutch master treatment"
          className={field}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="body" className="block text-sm font-medium">
            Prompt
          </label>
          <span className="text-xs text-muted">
            {draft.body.length}/{MAX.body}
          </span>
        </div>
        <textarea
          id="body"
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          maxLength={MAX.body}
          rows={8}
          placeholder="Restyle the person in this photo as…"
          className={`${field} resize-y font-mono leading-relaxed`}
        />
        {error("body")}
        <p className="mt-1.5 text-xs text-muted">
          Write the transformation, not the scene — &ldquo;restyle the person in this photo as X,
          keeping their facial features&rdquo; beats &ldquo;a portrait in style X&rdquo;.
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
          Notes <span className="font-normal text-muted">— what it needs, what it gets wrong</span>
        </label>
        <textarea
          id="notes"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={MAX.notes}
          rows={3}
          className={`${field} resize-y`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            value={draft.category}
            onChange={(e) => set("category", e.target.value as Category)}
            className={`${field} capitalize`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="targetModel" className="mb-1.5 block text-sm font-medium">
            Model
          </label>
          <input
            id="targetModel"
            value={draft.targetModel}
            onChange={(e) => set("targetModel", e.target.value)}
            maxLength={MAX.targetModel}
            placeholder="any"
            className={`${field} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
          Tags <span className="font-normal text-muted">— comma separated, max {MAX.tags}</span>
        </label>
        <input
          id="tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="portrait, restyle, likeness-hard"
          className={field}
        />
        {parsedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsedTags.map((tag) => (
              <span key={tag} className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="source" className="mb-1.5 block text-sm font-medium">
          Source <span className="font-normal text-muted">— optional link or credit</span>
        </label>
        <input
          id="source"
          value={draft.source}
          onChange={(e) => set("source", e.target.value)}
          maxLength={MAX.source}
          className={field}
        />
        {error("source")}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Accent</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              onClick={() => set("accent", accent)}
              aria-label={`Accent ${accent}`}
              aria-pressed={draft.accent === accent}
              className={`h-10 w-16 rounded-xl bg-linear-to-r ${accent} ring-offset-2 ring-offset-background transition ${
                draft.accent === accent
                  ? "ring-2 ring-white/80"
                  : "opacity-50 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      </fieldset>

      {errors.form && (
        <p className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errors.form}
        </p>
      )}

      {/* Pinned to the bottom of a phone screen so Save is reachable without
          scrolling back down a long form; a normal row from `sm` up. */}
      <div className="sticky-actions fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-background/90 px-4 pt-3 backdrop-blur-md sm:static sm:bg-transparent sm:px-0 sm:pt-6 sm:backdrop-blur-none">
        <button type="submit" disabled={submitting} className="btn btn-primary flex-1 sm:flex-none">
          {submitting ? "Saving…" : editing ? "Save changes" : "Add prompt"}
        </button>
        <Link
          href={editing ? `/prompts/${prompt!.id}` : "/"}
          className="btn btn-ghost flex-1 sm:flex-none"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
