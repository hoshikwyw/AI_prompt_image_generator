"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/types";
import type { StylePrompt } from "@/lib/prompts";

const MAX_CLIENT_EDGE = 1024;
const POLL_MS = 1500;

/**
 * Downscale in the browser before upload. Phone photos are 5-12 MB; this cuts
 * them to a few hundred KB, which makes the upload fast and keeps us well under
 * request body limits. `imageOrientation` applies the EXIF rotation so portrait
 * shots do not arrive sideways.
 */
async function downscale(file: File, maxEdge = MAX_CLIENT_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  return blob ?? file;
}

type Phase = "idle" | "uploading" | "working" | "done" | "error";

export default function Studio({ style }: { style: StylePrompt }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Ticking counter so a 20-second wait does not look frozen.
  useEffect(() => {
    if (phase !== "working" && phase !== "uploading") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [phase]);

  const pickFile = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    setError(null);
    setJob(null);
    setPhase("idle");
    setFile(next);
  };

  const generate = useCallback(async () => {
    if (!file) return;
    setError(null);
    setPhase("uploading");

    try {
      const shrunk = await downscale(file);
      const form = new FormData();
      form.append("slug", style.slug);
      form.append("photo", new File([shrunk], "photo.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/generate", { method: "POST", body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status})`);

      setPhase("working");

      // Poll until the job leaves a running state.
      for (;;) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const poll = await fetch(`/api/jobs/${payload.id}`, { cache: "no-store" });
        if (!poll.ok) throw new Error("Lost track of that job.");
        const next: Job = await poll.json();
        setJob(next);
        if (next.status === "succeeded") return setPhase("done");
        if (next.status === "failed") {
          setError(next.error ?? "Generation failed.");
          return setPhase("error");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }, [file, style.slug]);

  const busy = phase === "uploading" || phase === "working";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: source photo */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Your photo</h2>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex aspect-4/5 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-card transition hover:border-neutral-600"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Your upload" className="h-full w-full object-cover" />
          ) : (
            <div className="px-8 text-center text-sm text-muted">
              <p className="font-medium text-foreground">Drop a photo here</p>
              <p className="mt-1">or click to browse · JPEG, PNG, WebP</p>
              <p className="mt-4 text-xs">A clear, front-facing portrait works best.</p>
            </div>
          )}
        </label>

        <div className="mt-4 flex gap-3">
          <button
            onClick={generate}
            disabled={!file || busy}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? `Generating… ${elapsed}s` : `Generate ${style.title}`}
          </button>
          {file && !busy && (
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-line px-4 py-3 text-sm text-muted transition hover:text-foreground"
            >
              Change
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </section>

      {/* Right: result */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Result</h2>

        <div className="flex aspect-4/5 items-center justify-center overflow-hidden rounded-2xl border border-line bg-card">
          {phase === "done" && job ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/image/${job.id}`}
              alt={`${style.title} result`}
              className="h-full w-full object-cover"
            />
          ) : busy ? (
            <div className="text-center text-sm text-muted">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
              <p>{phase === "uploading" ? "Preparing your photo…" : "Restyling…"}</p>
              <p className="mt-1 text-xs">Usually 10–30 seconds</p>
            </div>
          ) : (
            <p className="px-8 text-center text-sm text-muted">Your result will appear here.</p>
          )}
        </div>

        {phase === "done" && job && (
          <>
            <div className="mt-4 flex gap-3">
              <a
                href={`/api/image/${job.id}?download`}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black"
              >
                Download
              </a>
              <Link
                href="/"
                className="rounded-xl border border-line px-4 py-3 text-sm text-muted transition hover:text-foreground"
              >
                Try another style
              </Link>
            </div>
            <p className="mt-3 font-mono text-xs text-muted">
              {job.provider} · {((job.ms ?? 0) / 1000).toFixed(1)}s · $
              {(job.costUsd ?? 0).toFixed(4)} ·{" "}
              <Link href={`/result/${job.id}`} className="underline">
                permalink
              </Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
