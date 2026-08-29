import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { promptBySlug } from "@/lib/prompts";
import { resolveProvider } from "@/lib/providers";
import { createJob, saveOutput, updateJob } from "@/lib/jobs";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES, prepareImage } from "@/lib/image";
import type { Job } from "@/lib/types";

export const runtime = "nodejs";

const fail = (message: string, status = 400) =>
  Response.json({ error: message }, { status });

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected multipart form data.");
  }

  const slug = String(form.get("slug") ?? "");
  const style = promptBySlug(slug);
  if (!style) return fail(`Unknown style "${slug}".`, 404);

  const photo = form.get("photo");
  if (!(photo instanceof File)) return fail("No photo uploaded.");
  if (photo.size === 0) return fail("Uploaded photo is empty.");
  if (photo.size > MAX_UPLOAD_BYTES) return fail("Photo is larger than 12 MB.", 413);
  if (!ACCEPTED_MIME.includes(photo.type)) {
    return fail(`Unsupported image type "${photo.type}". Use JPEG, PNG, or WebP.`, 415);
  }

  let provider;
  try {
    provider = resolveProvider(style.provider);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 503);
  }

  let prepared;
  try {
    prepared = await prepareImage(Buffer.from(await photo.arrayBuffer()), provider.maxInputEdge);
  } catch {
    return fail("That file could not be read as an image.", 415);
  }

  const job: Job = {
    id: randomUUID(),
    status: "queued",
    styleSlug: style.slug,
    styleTitle: style.title,
    provider: provider.id,
    model: provider.model,
    // Frozen at submit time so editing a style later never rewrites past results.
    promptSnapshot: style.prompt,
    createdAt: new Date().toISOString(),
  };
  await createJob(job);

  // Runs after the response is sent, so the client gets an id immediately and
  // polls for progress rather than holding a 30-second request open.
  after(async () => {
    await updateJob(job.id, { status: "running" });
    try {
      const result = await provider.edit({
        image: prepared.image,
        mimeType: prepared.mimeType,
        inputWidth: prepared.width,
        inputHeight: prepared.height,
        prompt: style.prompt,
        outWidth: 1024,
        outHeight: 1024,
      });
      await saveOutput(job.id, result.image);
      await updateJob(job.id, {
        status: "succeeded",
        completedAt: new Date().toISOString(),
        ms: result.ms,
        costUsd: result.costUsd,
        outputMime: result.mimeType,
      });
    } catch (err) {
      await updateJob(job.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return Response.json({ id: job.id }, { status: 202 });
}
