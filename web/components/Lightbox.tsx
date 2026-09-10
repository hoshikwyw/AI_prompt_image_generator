"use client";

import { useEffect, useRef } from "react";
import { copyText } from "@/lib/copy";
import type { PromptImage } from "@/lib/prompt";

interface Props {
  images: PromptImage[];
  /** Index of the open image, or null when closed. */
  openAt: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Offered inside the lightbox: people decide from the picture, then copy. */
  promptBody?: string;
}

/**
 * Full-size viewer for sample images.
 *
 * A native `<dialog>` opened with showModal(), which brings the focus trap,
 * backdrop and Esc-to-close along with it rather than reimplementing them.
 * Copy lives in here too: the sample is what convinces someone they want the
 * prompt, so the next click should not be a hunt back up the page.
 */
export default function Lightbox({ images, openAt, onClose, onNavigate, promptBody }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const image = openAt === null ? undefined : images[openAt];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (openAt !== null && !dialog.open) dialog.showModal();
    if (openAt === null && dialog.open) dialog.close();
  }, [openAt]);

  // Arrow keys, because a gallery that only responds to clicks feels broken.
  useEffect(() => {
    if (openAt === null || images.length < 2) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") onNavigate((openAt! + 1) % images.length);
      if (event.key === "ArrowLeft") onNavigate((openAt! - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAt, images.length, onNavigate]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Clicking the backdrop is the dialog element itself; clicking the panel
      // inside it stops there, so only true backdrop clicks close.
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="modal modal-wide"
    >
      {image && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <p className="min-w-0 truncate text-sm text-muted">
              {image.caption || "Sample"}
              {images.length > 1 && (
                <span className="ml-2 text-subtle">
                  {openAt! + 1}/{images.length}
                </span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {promptBody && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={async (e) => {
                    const ok = await copyText(promptBody);
                    const button = e.currentTarget;
                    button.textContent = ok ? "Copied" : "Copy failed";
                    window.setTimeout(() => {
                      button.textContent = "Copy prompt";
                    }, 1600);
                  }}
                >
                  Copy prompt
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="btn btn-sm btn-icon"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-background/60">
            {/* Plain img: user uploads, on an origin the image optimiser is not
                configured for. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.caption || "Sample output for this prompt"}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => onNavigate((openAt! - 1 + images.length) % images.length)}
                  className="btn btn-icon absolute left-2 top-1/2 -translate-y-1/2 bg-background/80"
                >
                  <span aria-hidden>←</span>
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => onNavigate((openAt! + 1) % images.length)}
                  className="btn btn-icon absolute right-2 top-1/2 -translate-y-1/2 bg-background/80"
                >
                  <span aria-hidden>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
