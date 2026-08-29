import { getJob, readOutput } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const job = await getJob(id);
  if (!job || job.status !== "succeeded") {
    return new Response("Not found", { status: 404 });
  }

  const bytes = await readOutput(id);
  if (!bytes) return new Response("Not found", { status: 404 });

  const download = new URL(_request.url).searchParams.has("download");
  const ext = job.outputMime?.includes("jpeg") ? "jpg" : "png";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": job.outputMime ?? "image/png",
      "Content-Length": String(bytes.byteLength),
      // Results are immutable once written, so they cache hard.
      "Cache-Control": "private, max-age=31536000, immutable",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${job.styleSlug}-${id.slice(0, 8)}.${ext}"` }
        : {}),
    },
  });
}
