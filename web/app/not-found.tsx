import Link from "next/link";

export const metadata = { title: "Not found" };

/**
 * For a prompt that was deleted or a link that was mistyped. The likeliest
 * visitor followed a shared link, so the way forward is the library itself.
 * Worded for any page: it also answers URLs that were never prompts.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12 text-center sm:py-20">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        This page isn&rsquo;t here
      </h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        It may have been removed, or the link was mistyped. There are plenty of prompts in the
        library.
      </p>
      <Link href="/" className="btn btn-primary mt-7">
        Browse prompts
      </Link>
    </div>
  );
}
