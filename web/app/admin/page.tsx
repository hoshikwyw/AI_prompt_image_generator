import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import AdminSignOut from "@/components/AdminSignOut";
import ApiUsage from "@/components/ApiUsage";
import BackLink from "@/components/BackLink";
import { isAdmin, storageIsReadOnly, writePolicy } from "@/lib/admin";

export const dynamic = "force-dynamic";
// robots.txt only stops crawling; every header links here, so a search engine
// could still list the bare URL. This keeps it out of results.
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * Where to go after signing in — only ever a path on this site, so a crafted
 * ?next= cannot bounce someone to a look-alike page once they trust the login.
 *
 * Resolved the way a browser would, not judged by its first characters:
 * "/\evil.com" and "/<tab>/evil.com" both start with one slash, yet a browser
 * reads them as "//evil.com" — another site. And the resolved path is checked
 * too, because "/..//evil.com" resolves to the path "//evil.com", which is
 * itself a link to another site.
 */
function sameSitePath(raw: string): string {
  const base = "http://same-site.invalid";
  try {
    const url = new URL(raw, base);
    const path = `${url.pathname}${url.search}${url.hash}`;
    const local = raw.startsWith("/") && url.origin === base && !/^\/[\\/]/.test(path);
    return local ? path : "/";
  } catch {
    return "/";
  }
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const next = sameSitePath(typeof params.next === "string" ? params.next : "/");

  const policy = writePolicy();
  const signedIn = await isAdmin();

  return (
    <div className="mx-auto max-w-xl">
      <BackLink />
      <h1 className="mb-6 mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Admin</h1>

      {policy === "open" && (
        <div className="card px-5 py-4 text-sm">
          <p className="font-medium">No passphrase set</p>
          <p className="mt-1 text-muted">
            The collection is the local file on this machine, so editing is open. Set{" "}
            <code className="font-mono">ADMIN_PASSPHRASE</code> to require a sign-in.
          </p>
        </div>
      )}

      {policy === "locked" && (
        <div className="rounded-[var(--radius-lg)] border border-warning-border bg-warning-soft px-5 py-4 text-sm">
          <p className="font-medium text-warning">Editing is disabled</p>
          {storageIsReadOnly() ? (
            <p className="mt-1 text-muted">
              This deployment has no database, and its file system is read-only, so it shows the
              built-in prompts and cannot save changes. Connect Supabase (
              <code className="font-mono">SUPABASE_URL</code> and keys) to edit here, or change{" "}
              <code className="font-mono">web/lib/seed.ts</code> and redeploy.
            </p>
          ) : (
            <p className="mt-1 text-muted">
              This collection lives in Supabase, where anyone could reach it, and no{" "}
              <code className="font-mono">ADMIN_PASSPHRASE</code> is set. Set one in{" "}
              <code className="font-mono">.env.local</code> and restart to enable editing.
            </p>
          )}
        </div>
      )}

      {policy === "gated" &&
        (signedIn ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">You are signed in and can edit the collection.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/prompts/new" className="btn btn-primary">
                New prompt
              </Link>
              <AdminSignOut />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Reading is open to everyone. Editing needs the passphrase.
            </p>
            <AdminLogin next={next} />
          </div>
        ))}

      {/* Traffic is the maintainer's business, not a visitor's. */}
      {signedIn && (
        <section className="mt-10" aria-labelledby="api-usage-heading">
          <h2 id="api-usage-heading" className="mb-3 text-base font-medium">
            Public API
          </h2>
          <ApiUsage />
        </section>
      )}
    </div>
  );
}
