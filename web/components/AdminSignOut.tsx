"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
        router.push("/");
        router.refresh();
      }}
      className="btn"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
