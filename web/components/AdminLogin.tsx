"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage, fetchJson, sendJson } from "@/lib/api";

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
      await fetchJson("/api/admin/session", sendJson("POST", { passphrase }));
      setPassphrase("");
      router.push(next);
      // The pages decide what to render from the cookie, so they have to be
      // re-fetched for the edit controls to appear.
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not sign in."));
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
          className="field"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy || !passphrase}
        className="btn btn-primary w-full sm:w-auto"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
