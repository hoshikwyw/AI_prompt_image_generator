"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin({ next }: { next: string }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setPassphrase("");
      router.push(next);
      // The pages decide what to render from the cookie, so they have to be
      // re-fetched for the edit controls to appear.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="passphrase" className="mb-1.5 block text-sm font-medium">
          Passphrase
        </label>
        <input
          id="passphrase"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none transition focus:border-neutral-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy || !passphrase}
        className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-white disabled:opacity-50"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
