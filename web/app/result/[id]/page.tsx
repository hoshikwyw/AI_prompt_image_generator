import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs";

export default async function ResultPage({ params }: PageProps<"/result/[id]">) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← All styles
      </Link>

      <h1 className="mb-6 mt-4 text-2xl font-semibold tracking-tight">{job.styleTitle}</h1>

      {job.status === "succeeded" ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/image/${job.id}`} alt={job.styleTitle} className="w-full" />
          </div>
          <a
            href={`/api/image/${job.id}?download`}
            className="mt-4 block rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black"
          >
            Download
          </a>
        </>
      ) : job.status === "failed" ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {job.error ?? "Generation failed."}
        </p>
      ) : (
        <p className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
          Still {job.status}…{" "}
          <Link href={`/result/${job.id}`} className="underline">
            refresh
          </Link>
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-y-2 font-mono text-xs text-muted">
        <dt>provider</dt>
        <dd className="text-right">{job.provider}</dd>
        <dt>model</dt>
        <dd className="truncate text-right">{job.model}</dd>
        <dt>duration</dt>
        <dd className="text-right">{job.ms ? `${(job.ms / 1000).toFixed(1)}s` : "—"}</dd>
        <dt>cost</dt>
        <dd className="text-right">
          {job.costUsd !== undefined ? `$${job.costUsd.toFixed(4)}` : "—"}
        </dd>
      </dl>
    </div>
  );
}
