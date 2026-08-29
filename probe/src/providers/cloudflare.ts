import { ProviderError, type EditInput, type EditResult, type ImageProvider } from "../types.ts";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

// developers.cloudflare.com/workers-ai/platform/pricing
const USD_PER_INPUT_TILE = 0.000059;
const USD_PER_OUTPUT_TILE = 0.000287;
const NEURONS_PER_USD = 1000 / 0.011;

const tiles = (w: number, h: number) => Math.ceil(w / 512) * Math.ceil(h / 512);

export function cloudflareCost(input: EditInput) {
  const usd =
    tiles(input.inputWidth, input.inputHeight) * USD_PER_INPUT_TILE +
    tiles(input.outWidth, input.outHeight) * USD_PER_OUTPUT_TILE;
  return { usd, neurons: usd * NEURONS_PER_USD };
}

/**
 * FLUX.2 [klein] 4B on Workers AI.
 *
 * Quirks worth remembering:
 *  - The endpoint is multipart/form-data, NOT JSON, even for a bare prompt.
 *  - Reference images go in as `input_image_0`..`input_image_3` (binary parts).
 *  - Cloudflare wants input images under 512x512; larger ones are rejected or ignored.
 *  - Steps are fixed at 4 (distilled model), so there is no quality/latency dial.
 */
export function createCloudflareProvider(): ImageProvider {
  const accountId = process.env.CF_ACCOUNT_ID?.trim();
  const token = process.env.CF_API_TOKEN?.trim();

  return {
    id: "cloudflare",
    label: "Cloudflare FLUX.2 klein 4B",
    model: MODEL,
    maxInputEdge: 512,
    configured: () => Boolean(accountId && token),

    async edit(input: EditInput): Promise<EditResult> {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

      const form = new FormData();
      form.append("prompt", input.prompt);
      form.append("width", String(input.outWidth));
      form.append("height", String(input.outHeight));
      form.append(
        "input_image_0",
        new Blob([new Uint8Array(input.image)], { type: input.mimeType }),
        "input.jpg",
      );

      const started = Date.now();
      // Deliberately no Content-Type header: fetch must set it so the
      // multipart boundary matches the body it generates.
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const ms = Date.now() - started;

      const raw = await res.text();
      if (!res.ok) {
        throw new ProviderError(`Cloudflare returned ${res.status}`, res.status, raw.slice(0, 600));
      }

      let payload: any;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new ProviderError("Cloudflare returned non-JSON", res.status, raw.slice(0, 300));
      }

      const b64 = payload?.result?.image;
      if (typeof b64 !== "string" || b64.length === 0) {
        const detail = payload?.errors?.map((e: any) => e.message).join("; ") ?? raw.slice(0, 300);
        throw new ProviderError(`No image in Cloudflare response: ${detail}`, res.status);
      }

      return {
        image: Buffer.from(b64, "base64"),
        mimeType: "image/png",
        costUsd: cloudflareCost(input).usd,
        ms,
      };
    },
  };
}
