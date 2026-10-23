"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * When a page fails to render — in practice, the database being unreachable.
 * Says so plainly and offers a retry, which re-fetches the page; the header and
 * footer stay, since the layout is outside this boundary.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-12 text-center sm:py-20">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        The prompts could not be loaded just now. It is usually brief — try again in a moment.
      </p>
      {error.digest && (
        // Matches the server log entry, so a report can be traced.
        <p className="mt-2 font-mono text-xs text-subtle">Ref {error.digest}</p>
      )}
      <div className="mt-7 flex items-center justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Library
        </Link>
      </div>
    </div>
  );
}
