"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteResource, errorMessage } from "@/lib/api";
import { useArmed } from "@/lib/use-armed";

/** Two-step delete: see `useArmed`. */
export default function DeletePrompt({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { armed, arm, disarm } = useArmed();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (!armed) return arm();

    setBusy(true);
    try {
      await deleteResource(`/api/prompts/${id}`);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not delete the prompt."));
      disarm();
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        // Starts with the visible text, so "click Delete" works by voice too.
        aria-label={armed ? `Click again to delete ${title}` : `Delete ${title}`}
        className={`btn ${
          armed
            ? "border-danger-border bg-danger-soft text-danger"
            : "text-muted hover:border-danger-border hover:text-danger"
        }`}
      >
        {busy ? "Deleting…" : armed ? "Click again to delete" : "Delete"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
