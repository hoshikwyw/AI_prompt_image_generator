import { GoogleGenAI } from "@google/genai";
import { ProviderError, type EditInput, type EditResult, type ImageProvider } from "../types";

// ai.google.dev/gemini-api/docs/pricing — USD per generated image at 1K.
const PRICE_PER_IMAGE: Record<string, number> = {
  "gemini-3.1-flash-lite-image": 0.0336,
  "gemini-3.1-flash-image": 0.067,
  "gemini-3-pro-image": 0.134,
  "gemini-2.5-flash-image": 0.039,
};

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-lite-image";

/** Diagnostic for when a model id 404s — the ids move around between releases. */
export async function listImageModels(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
  );
  if (!res.ok) return [];
  const json: any = await res.json();
  return (json.models ?? [])
    .map((m: any) => String(m.name).replace(/^models\//, ""))
    .filter((n: string) => n.includes("image"));
}

function extractImage(response: any): { data: string; mimeType: string } | null {
  // Newer SDK surface: interactions.create() -> output_image
  const direct = response?.output_image ?? response?.outputImage;
  if (direct?.data) {
    return { data: direct.data, mimeType: direct.mime_type ?? direct.mimeType ?? "image/png" };
  }
  // generateContent surface: walk the candidate parts for inline image data.
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      return { data: inline.data, mimeType: inline.mimeType ?? inline.mime_type ?? "image/png" };
    }
  }
  return null;
}

export function createGeminiProvider(): ImageProvider {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = DEFAULT_MODEL;

  return {
    id: "gemini",
    label: `Gemini ${model}`,
    model,
    maxInputEdge: 1024,
    configured: () => Boolean(apiKey),

    async edit(input: EditInput): Promise<EditResult> {
      const ai = new GoogleGenAI({ apiKey });
      const base64 = input.image.toString("base64");
      const started = Date.now();

      let response: any;
      try {
        if (typeof (ai as any).interactions?.create === "function") {
          response = await (ai as any).interactions.create({
            model,
            input: [
              { type: "text", text: input.prompt },
              { type: "image", mime_type: input.mimeType, data: base64 },
            ],
          });
        } else {
          response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: input.mimeType, data: base64 } },
                  { text: input.prompt },
                ],
              },
            ],
          });
        }
      } catch (err: any) {
        const message = String(err?.message ?? err);
        if (/not found|NOT_FOUND|404/i.test(message) && apiKey) {
          const available = await listImageModels(apiKey);
          throw new ProviderError(
            `Model "${model}" unavailable on this key.` +
              (available.length
                ? ` Image models you can use: ${available.join(", ")}. Set GEMINI_IMAGE_MODEL in .env.`
                : " No image models are enabled — image generation needs billing turned on."),
          );
        }
        throw new ProviderError(message);
      }
      const ms = Date.now() - started;

      const image = extractImage(response);
      if (!image) {
        const blocked =
          response?.promptFeedback?.blockReason ??
          response?.candidates?.[0]?.finishReason ??
          "unknown";
        throw new ProviderError(`Gemini returned no image (reason: ${blocked})`);
      }

      return {
        image: Buffer.from(image.data, "base64"),
        mimeType: image.mimeType,
        costUsd: PRICE_PER_IMAGE[model] ?? 0,
        ms,
      };
    },
  };
}
