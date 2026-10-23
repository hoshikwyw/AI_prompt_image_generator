"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT } from "@/lib/toast";

/** Long enough to read a short sentence, short enough not to linger. */
const VISIBLE_MS = 2600;

/**
 * Renders what `showToast` sends. The live region is always mounted — screen
 * readers only announce changes to a region that already exists — and is
 * simply empty, and invisible, between messages.
 */
export default function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  // Bumped per message so the same text twice still re-runs the entrance.
  const [key, setKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onToast = (event: Event) => {
      window.clearTimeout(timer.current);
      setMessage((event as CustomEvent<string>).detail);
      setKey((k) => k + 1);
      timer.current = window.setTimeout(() => setMessage(null), VISIBLE_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="toast-region">
      {message && (
        <p key={key} className="toast">
          <svg
            className="h-4 w-4 shrink-0 text-success"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m3.5 8.5 3 3 6-6.5" />
          </svg>
          {message}
        </p>
      )}
    </div>
  );
}
