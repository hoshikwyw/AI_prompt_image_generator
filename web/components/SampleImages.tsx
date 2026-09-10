"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CAPTION, MAX_SAMPLE_BYTES, type PromptImage } from "@/lib/prompt";

/**
 * The sample gallery on a prompt's page, and — for an admin — the controls to
 * add and remove one.
 *
 * Uploads go to our own route rather than straight to storage: the bytes are
 * re-encoded server-side, and the service_role key that can write to the bucket
 * never leaves the server.
 */
export default function SampleImages({
  promptId,
  images: initial,
  canEdit,
}: {
  promptId: string;
  images: PromptImage[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared straight away so picking the same file twice still fires.
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_SAMPLE_BYTES) {
      setError("That image is over 12 MB.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("caption", caption);

      const res = await fetch(`/api/prompts/${promptId}/images`, { method: "POST", body });
      const data = (await res.json()) as PromptImage & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setImages((list) => [...list, data]);
      setCaption("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(image: PromptImage) {
    setError(null);
    const previous = images;
    setImages((list) => list.filter((i) => i.id !== image.id));
    try {
      const res = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setImages(previous);
      setError(err instanceof Error ? err.message : "Could not delete that image.");
    }
  }

  if (images.length === 0 && !canEdit) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-medium">
        Samples {images.length > 0 && <span className="text-muted">({images.length})</span>}
      </h2>

      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <figure key={image.id} className="overflow-hidden rounded-xl border border-line bg-card">
              {/* Plain img: these are user uploads on an origin the image
                  optimiser is not configured for. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.caption || "Sample output for this prompt"}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                loading="lazy"
                className="aspect-4/3 w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted">
                <span className="truncate">{image.caption || "Sample"}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(image)}
                    className="shrink-0 transition hover:text-red-300"
                    aria-label={`Delete ${image.caption || "this sample"}`}
                  >
                    Remove
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION}
            placeholder="Caption (optional)"
            aria-label="Caption for the next upload"
            className="field min-w-0 flex-1"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="btn shrink-0"
          >
            {busy ? "Uploading…" : "Add sample"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={upload}
            className="hidden"
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {images.length === 0 && canEdit && (
        <p className="mt-2 text-xs text-muted">
          No samples yet. Add one so the card shows what this prompt produces.
        </p>
      )}
    </section>
  );
}
