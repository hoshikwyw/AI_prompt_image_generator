"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson, recordCopy, sendJson } from "@/lib/api";
import { copyText } from "@/lib/copy";
import { AI_TOOL_LABELS, type AiTool, type Prompt } from "@/lib/prompt";
import { showToast } from "@/lib/toast";

/** Where to go next, named after the tools the prompt is tagged with. */
export function pasteHint(models: AiTool[]): string {
  if (models.length === 0) return "Copied — paste it into your AI.";
  const names = models.slice(0, 2).map((m) => AI_TOOL_LABELS[m]);
  return `Copied — paste it into ${names.join(" or ")}.`;
}

interface Props {
  prompt: Prompt;
  /** Lets a parent list keep its copy in sync after a mutation. */
  onChange?: (patch: PromptPatch) => void;
  /** Favouriting writes to the shared collection, so it is gated. Copying is not. */
  canEdit?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

/**
 * A change for the parent list to apply: fixed values, or a function of the
 * list's current prompt for changes that must build on the latest value (a
 * copy count bumped twice in quick succession).
 */
export type PromptPatch = Partial<Prompt> | ((current: Prompt) => Partial<Prompt>);

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
  canEdit = false,
}: Props) {
  // In the library the list owns the star (an import can change it under a
  // card that stays mounted), so it is read straight from the prompt. On a
  // page without a list, this component keeps its own copy.
  const [ownFavorite, setOwnFavorite] = useState(prompt.favorite);
  const favorite = onChange ? prompt.favorite : ownFavorite;
  const setFavorite = (value: boolean) =>
    onChange ? onChange({ favorite: value }) : setOwnFavorite(value);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);
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
    // An increment applied to the list's latest value, not "set to N" from
    // this render's value — two quick copies count two.
    onChange?.((current) => ({ copies: current.copies + 1 }));
    recordCopy(prompt.id);
  }

  async function copy() {
    if (await copyText(prompt.body)) {
      setCopyState("copied");
      // One reset at a time, as in the lightbox: a second copy within 1.6s was
      // cut short by the first click's timer.
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
      showToast(pasteHint(prompt.models));
      countCopy();
      return;
    }
    // Every clipboard route failed — show the text so it can be copied by hand.
    setCopyState("failed");
  }

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await fetchJson(`/api/prompts/${prompt.id}`, sendJson("PATCH", { favorite: next }));
    } catch {
      setFavorite(!next);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        // Follows the visible label, which flips to "Copied" for a moment.
        aria-label={`${copyState === "copied" ? "Copied" : "Copy"} the ${prompt.title} prompt`}
        className={`btn btn-sm ${
          copyState === "copied" ? "border-success-border bg-success-soft text-success" : ""
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
            favorite ? "border-warning-border bg-warning-soft text-warning" : "text-muted"
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
