"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage, fetchJson } from "@/lib/api";

export default function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await fetchJson("/api/admin/session", { method: "DELETE" });
          } catch (err) {
            // Offline or a server error: the cookie is still set, so saying
            // "signed out" by leaving would be a lie on a shared computer.
            setError(errorMessage(err, "Could not sign out. Try again."));
            setBusy(false);
            return;
          }
          router.push("/");
          router.refresh();
        }}
        className="btn"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
