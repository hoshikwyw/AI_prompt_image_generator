import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import AdminSignOut from "@/components/AdminSignOut";
import { isAdmin, writePolicy } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Promptbook" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  // Only same-site paths, so a crafted ?next= cannot bounce someone off-site
  // after they sign in.
  const raw = typeof params.next === "string" ? params.next : "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const policy = writePolicy();
  const signedIn = await isAdmin();

  return (
    <div className="max-w-xl">
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Library
      </Link>
      <h1 className="mb-6 mt-4 text-3xl font-semibold tracking-tight">Admin</h1>

      {policy === "open" && (
        <div className="rounded-xl border border-line bg-card px-5 py-4 text-sm">
          <p className="font-medium">No passphrase set</p>
          <p className="mt-1 text-muted">
            The collection is the local file on this machine, so editing is open. Set{" "}
            <code className="font-mono">ADMIN_PASSPHRASE</code> to require a sign-in.
          </p>
        </div>
      )}

      {policy === "locked" && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-5 py-4 text-sm">
          <p className="font-medium text-amber-200">Editing is disabled</p>
          <p className="mt-1 text-amber-200/70">
            This collection lives in Supabase, where anyone could reach it, and no{" "}
            <code className="font-mono">ADMIN_PASSPHRASE</code> is set. Set one in{" "}
            <code className="font-mono">.env.local</code> and restart to enable editing.
          </p>
        </div>
      )}

      {policy === "gated" &&
        (signedIn ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">You are signed in and can edit the collection.</p>
            <div className="flex items-center gap-3">
              <Link
                href="/prompts/new"
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-white"
              >
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
    </div>
  );
}
