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
      {showCopies && copies > 0 && (
        <span className="hidden text-xs text-subtle sm:inline">
          copied {copies}×
        </span>
      )}

      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the ${prompt.title} prompt`}
        className={`btn btn-sm ${
          copyState === "copied"
            ? "border-emerald-600/60 bg-emerald-500/10 text-emerald-300"
            : copyState === "failed"
              ? "border-red-600/60 bg-red-500/10 text-red-300"
              : ""
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {copyState === "copied" ? (
            <path d="m3.5 8.5 3 3 6-6.5" />
          ) : (
            <>
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.75" />
              <path d="M10.5 3.5a1.75 1.75 0 0 0-1.75-1.75h-5A1.75 1.75 0 0 0 2 3.5v5c0 .966.784 1.75 1.75 1.75" />
            </>
          )}
        </svg>
        {copyLabel}
      </button>

      {canEdit && (
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          title={favorite ? "Remove from favourites" : "Add to favourites"}
          className={`btn btn-sm btn-icon ${
            favorite ? "border-amber-600/60 bg-amber-500/10 text-amber-300" : "text-muted"
          }`}
        >
          <span aria-hidden className="text-sm leading-none">
            {favorite ? "★" : "☆"}
          </span>
        </button>
      )}
    </div>
  );
}
