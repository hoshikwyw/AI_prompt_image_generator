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
