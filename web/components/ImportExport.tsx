"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Select from "./Select";
import type { Prompt } from "@/lib/prompt";

interface Summary {
  mode: string;
  added: number;
  updated: number;
  skipped: Array<{ title: string; reason: string }>;
}

/**
 * Export is a plain link — the browser downloads what the route sends.
 *
 * Import reads the file in the browser and posts JSON, so the server never
 * needs multipart handling for what is a small text file. Replace is two-step
 * for the same reason delete is: it discards the whole collection.
 */
export default function ImportExport({
  onImported,
  canImport,
}: {
  onImported: (prompts: Prompt[]) => void;
  /** Export is just a read of public data; import rewrites the collection. */
  canImport: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    if (mode === "replace" && !armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    fileInput.current?.click();
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear straight away so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const res = await fetch(`/api/prompts/import?mode=${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as Summary & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setSummary(data);
      // Pull the merged collection back so the grid reflects it without a reload.
      const fresh = (await (await fetch("/api/prompts")).json()) as { prompts: Prompt[] };
      onImported(fresh.prompts);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/* A real navigation, not a client-side one: the browser has to see the
            response headers for the download to happen. */}
        <a
          href="/api/prompts/export"
          download
          className="btn btn-sm"
        >
          Export
        </a>

        {canImport && (
          <>
            <button
              type="button"
              onClick={pickFile}
              disabled={busy}
              className={`btn btn-sm ${
                armed ? "border-red-600/60 bg-red-500/10 text-red-300" : "text-muted"
              }`}
            >
              {busy ? "Importing…" : armed ? "Click again to replace all" : "Import"}
            </button>

            <Select
              size="sm"
              label="Import mode"
              value={mode}
              options={[
                { value: "merge", label: "Merge" },
                { value: "replace", label: "Replace all" },
              ]}
              onChange={(next) => {
                setMode(next);
                setArmed(false);
              }}
              className="w-36"
            />

            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
            />
          </>
        )}
      </div>

      {summary && (
        <p className="mt-2 text-xs text-muted">
          {summary.added} added, {summary.updated} updated
          {summary.skipped.length > 0 && (
            <>
              , <span className="text-amber-300">{summary.skipped.length} skipped</span> (
              {summary.skipped
                .slice(0, 3)
                .map((s) => s.title)
                .join(", ")}
              {summary.skipped.length > 3 ? "…" : ""})
            </>
          )}
          .
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
