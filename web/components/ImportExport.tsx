"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Select from "./Select";
import { ApiError, errorMessage, fetchJson, sendJson } from "@/lib/api";
import type { Prompt } from "@/lib/prompt";
import { useArmed } from "@/lib/use-armed";

/**
 * Under the 4.5 MB a Vercel function accepts. Checked before reading, so the
 * wrong file — a video renamed .json — cannot freeze the tab, and a file that
 * is too big says so instead of "HTTP 413" from the host.
 */
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const TOO_BIG = "That file is over 4 MB. Split it into smaller files and import them one by one (merge).";

/** Skipped rows listed by name, with why. */
const SKIPS_SHOWN = 5;

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
 * (see `useArmed`) for the same reason delete is: it discards the whole
 * collection.
 *
 * Admin-only: the library renders it just for someone who can edit. Export
 * reads nothing private, but a visitor has no use for a backup file, and the
 * header is the first thing they see.
 */
export default function ImportExport({ onImported }: { onImported: (prompts: Prompt[]) => void }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const { armed, arm, disarm } = useArmed();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    if (mode === "replace" && !armed) return arm();
    disarm();
    fileInput.current?.click();
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear straight away so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    setError(null);
    setSummary(null);
    if (file.size > MAX_FILE_BYTES) return setError(TOO_BIG);

    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        // The parser's own message ("Unexpected token '�'…") helps nobody; the
        // usual cause is a file saved as UTF-16, as Windows PowerShell does.
        throw new Error("That is not a JSON export. Check the file, and that it is saved as UTF-8.");
      }
      setSummary(
        await fetchJson<Summary>(`/api/prompts/import?mode=${mode}`, sendJson("POST", parsed)),
      );
      try {
        // The new collection, swapped into the grid in place. Not
        // router.refresh(): the library starts over on every server render,
        // and this summary would vanish with it the moment it appeared.
        onImported((await fetchJson<{ prompts: Prompt[] }>("/api/prompts")).prompts);
      } catch {
        // The import worked; only the reread failed. Its error used to show
        // beside the summary, as if the import had not. Refresh instead.
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 413 ? TOO_BIG : errorMessage(err, "Could not read that file."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/* A real navigation, not a client-side one: the browser has to see the
            response headers for the download to happen. */}
        <a href="/api/prompts/export" download className="btn btn-sm">
          Export
        </a>

        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className={`btn btn-sm ${
            armed ? "border-danger-border bg-danger-soft text-danger" : "text-muted"
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
            disarm();
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
      </div>

      {summary && (
        <div className="mt-2 text-xs text-muted">
          <p>
            {summary.added} added, {summary.updated} updated
            {summary.skipped.length > 0 && (
              <>
                , <span className="text-warning">{summary.skipped.length} skipped</span>
              </>
            )}
            .
          </p>
          {/* Why each was skipped: a list of titles alone left the fix a guess. */}
          {summary.skipped.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {summary.skipped.slice(0, SKIPS_SHOWN).map((s, i) => (
                <li key={i}>
                  <span className="text-foreground">{s.title}</span> — {s.reason}
                </li>
              ))}
              {summary.skipped.length > SKIPS_SHOWN && <li>…and {summary.skipped.length - SKIPS_SHOWN} more.</li>}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
