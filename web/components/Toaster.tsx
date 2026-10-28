"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";

/** Long enough to read a short sentence, short enough not to linger. */
const VISIBLE_MS = 2600;

/**
 * Renders what `showToast` sends. The live region is always mounted — screen
 * readers only announce changes to a region that already exists — and is
 * simply empty, and invisible, between messages.
 */
export default function Toaster() {
  const [toast, setToast] = useState<ToastDetail | null>(null);
  // Bumped per message so the same text twice still re-runs the entrance.
  const [key, setKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onToast = (event: Event) => {
      window.clearTimeout(timer.current);
      setToast((event as CustomEvent<ToastDetail>).detail);
      setKey((k) => k + 1);
      timer.current = window.setTimeout(() => setToast(null), VISIBLE_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="toast-region">
      {toast && (
        <p key={key} className="toast">
          <svg
            className={`h-4 w-4 shrink-0 ${toast.tone === "error" ? "text-danger" : "text-success"}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={toast.tone === "error" ? "M4.5 4.5l7 7m0-7-7 7" : "m3.5 8.5 3 3 6-6.5"} />
          </svg>
          {toast.message}
        </p>
      )}
    </div>
  );
}
