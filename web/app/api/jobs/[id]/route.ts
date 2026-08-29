import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  return Response.json(job, {
    headers: { "Cache-Control": "no-store" },
  });
}
