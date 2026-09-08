"use client";

import { useState } from "react";
import type { Prompt } from "@/lib/prompt";

interface Props {
  prompt: Prompt;
  /** Lets a parent list keep its copy in sync after a mutation. */
  onChange?: (patch: Partial<Prompt>) => void;
  /** The detail page has room for the count; a card does not. */
  showCopies?: boolean;
  /** Favouriting writes to the shared collection, so it is gated. Copying is not. */
  canEdit?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

/**
 * Copy and favourite, the two things you do to a prompt in a library.
 *
 * Both are optimistic: the button state is local, so the grid never waits on a
 * request. `onChange` exists only so a parent list can re-filter (unfavouriting
 * inside the favourites view should drop the card).
 */
export default function PromptActions({
  prompt,
  onChange,
  showCopies = false,
  canEdit = false,
}: Props) {
  const [favorite, setFavorite] = useState(prompt.favorite);
  const [copies, setCopies] = useState(prompt.copies);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.body);
    } catch {
      // Clipboard access needs a secure context; over plain http it throws.
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2400);
      return;
    }

    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);

    const next = copies + 1;
    setCopies(next);
    onChange?.({ copies: next });
    // Best effort. The text is already on the clipboard, so a lost count is not
    // worth interrupting anyone over.
    void fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    onChange?.({ favorite: next });
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setFavorite(!next);
      onChange?.({ favorite: !next });
    }
  }

  const copyLabel =
    copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the ${prompt.title} prompt`}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          copyState === "copied"
            ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
            : copyState === "failed"
              ? "border-red-800 bg-red-950/40 text-red-300"
              : "border-line bg-background text-foreground hover:border-neutral-600"
        }`}
      >
        {copyLabel}
      </button>

      {canEdit && (
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          title={favorite ? "Remove from favourites" : "Add to favourites"}
          className={`rounded-lg border px-2 py-1.5 text-xs leading-none transition ${
            favorite
              ? "border-amber-700 bg-amber-950/40 text-amber-300"
              : "border-line bg-background text-muted hover:border-neutral-600 hover:text-foreground"
          }`}
        >
          {favorite ? "★" : "☆"}
        </button>
      )}

      {showCopies && (
        <span className="text-xs text-muted">
          copied {copies} {copies === 1 ? "time" : "times"}
        </span>
      )}
    </div>
  );
}
