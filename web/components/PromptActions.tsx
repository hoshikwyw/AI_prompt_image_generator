"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/copy";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Opening via showModal() rather than the `open` attribute is what gets the
  // focus trap, the backdrop and Esc-to-close for free.
  useEffect(() => {
    if (copyState !== "failed") return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // Pre-select so the reader only has to press Ctrl+C.
    textRef.current?.select();
  }, [copyState]);

  function countCopy() {
    const next = copies + 1;
    setCopies(next);
    onChange?.({ copies: next });
    // Best effort. The text is already on the clipboard, so a lost count is not
    // worth interrupting anyone over.
    void fetch(`/api/prompts/${prompt.id}/copy`, { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }

  async function copy() {
    if (await copyText(prompt.body)) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
      countCopy();
      return;
    }
    // Every clipboard route failed — show the text so it can be copied by hand.
    setCopyState("failed");
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

  return (
    <div className="flex items-center gap-2">
      {showCopies && copies > 0 && (
        <span className="hidden text-xs text-subtle sm:inline">copied {copies}×</span>
      )}

      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the ${prompt.title} prompt`}
        className={`btn btn-sm ${
          copyState === "copied" ? "border-emerald-600/60 bg-emerald-500/10 text-emerald-300" : ""
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
        {copyState === "copied" ? "Copied" : "Copy"}
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

      {/* Last resort: the browser refused every clipboard route, so the text is
          put on screen, selected, for a manual copy. */}
      <dialog
        ref={dialogRef}
        onClose={() => setCopyState("idle")}
        className="modal w-[min(36rem,calc(100vw-2rem))]"
      >
        <div className="p-5">
          <h2 className="text-base font-medium">Copy it manually</h2>
          <p className="mt-1 text-sm text-muted">
            This browser blocked clipboard access — usually because the page is not on HTTPS. The
            prompt is selected below; press{" "}
            <kbd className="rounded border border-line bg-background px-1.5 py-0.5 font-mono text-xs">
              Ctrl+C
            </kbd>{" "}
            (or <kbd className="rounded border border-line bg-background px-1.5 py-0.5 font-mono text-xs">⌘C</kbd>).
          </p>
          <textarea
            ref={textRef}
            readOnly
            value={prompt.body}
            rows={8}
            onFocus={(e) => e.currentTarget.select()}
            className="field mt-4 font-mono text-xs leading-relaxed"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dialogRef.current?.close()}
            >
              Done
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
