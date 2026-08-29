import type { ImageProvider, ProviderId } from "../types";
import { createCloudflareProvider } from "./cloudflare";
import { createGeminiProvider } from "./gemini";

/**
 * Providers are created per-call rather than cached, so env changes during
 * `next dev` are picked up without a restart.
 */
export function getProvider(id: ProviderId): ImageProvider {
  switch (id) {
    case "cloudflare":
      return createCloudflareProvider();
    case "gemini":
      return createGeminiProvider();
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

export function listProviders(): ImageProvider[] {
  return [createCloudflareProvider(), createGeminiProvider()];
}

/**
 * Falls back to whichever provider is actually configured, so a style tagged
 * `gemini` still works on a machine that only has a Cloudflare token.
 */
export function resolveProvider(preferred: ProviderId): ImageProvider {
  const wanted = getProvider(preferred);
  if (wanted.configured()) return wanted;
  const fallback = listProviders().find((p) => p.configured());
  if (!fallback) {
    throw new Error(
      "No image provider is configured. Add CF_ACCOUNT_ID + CF_API_TOKEN (free) or GEMINI_API_KEY to .env.local.",
    );
  }
  return fallback;
}
