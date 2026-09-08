import { cookies, headers } from "next/headers";
import {
  COOKIE_NAME,
  checkPassphrase,
  clearThrottle,
  createSessionToken,
  throttle,
  writePolicy,
} from "@/lib/admin";

export const runtime = "nodejs";

/** Best-effort client identity for throttling. Spoofable, but so is the point. */
async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  const policy = writePolicy();
  if (policy !== "gated") {
    return Response.json(
      {
        error:
          policy === "locked"
            ? "No ADMIN_PASSPHRASE is set, so editing is disabled."
            : "No passphrase is set — this collection is local and already editable.",
      },
      { status: 400 },
    );
  }

  const key = await clientKey();
  const { allowed, retryInSeconds } = throttle(key);
  if (!allowed) {
    return Response.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryInSeconds / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(retryInSeconds) } },
    );
  }

  let passphrase = "";
  try {
    passphrase = String(((await request.json()) as { passphrase?: unknown }).passphrase ?? "");
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!checkPassphrase(passphrase)) {
    return Response.json({ error: "That passphrase is not right." }, { status: 401 });
  }

  const { token, maxAge } = createSessionToken();
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // Set on https deployments; a plain-http localhost would never see the
    // cookie back if this were unconditional.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  clearThrottle(key);

  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
