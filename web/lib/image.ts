import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

/**
 * Fit inside a square edge without upscaling, and bake in EXIF rotation so
 * phone photos do not arrive sideways. The client already downscales to ~1024;
 * this re-clamps to whatever the chosen provider actually accepts (Cloudflare
 * rejects input images above 512x512) and is the trust boundary regardless,
 * since the client value cannot be relied on.
 */
export async function prepareImage(source: Buffer, maxEdge: number) {
  const out = await sharp(source)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer({ resolveWithObject: true });

  return {
    image: out.data,
    width: out.info.width,
    height: out.info.height,
    mimeType: "image/jpeg" as const,
  };
}
