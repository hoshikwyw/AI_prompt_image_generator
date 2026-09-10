"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Two-step delete rather than a `confirm()` dialog: the second click is the
 * confirmation, and it disarms itself after a few seconds so a stray click
 * never sits primed on a destructive button.
 */
export default function DeletePrompt({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the prompt.");
      setArmed(false);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={armed ? `Confirm deleting ${title}` : `Delete ${title}`}
        className={`btn ${
          armed
            ? "border-red-600/60 bg-red-500/10 text-red-300"
            : "text-muted hover:border-red-900/70 hover:text-red-300"
        }`}
      >
        {busy ? "Deleting…" : armed ? "Click again to delete" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
