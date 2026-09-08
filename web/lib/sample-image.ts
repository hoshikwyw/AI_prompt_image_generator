// sharp is a native module: keep it off the client graph entirely.
import "server-only";
import sharp from "sharp";

/**
 * Preparing an uploaded sample image.
 *
 * This is the trust boundary. Whatever arrives is re-encoded by sharp rather
 * than stored as sent, which normalises the format, drops EXIF (including
 * location) and means a file that merely claims to be an image never reaches
 * storage.
 */

/** Long edge. Cards show these small; the detail page shows one at a time. */
const MAX_EDGE = 1600;

export interface PreparedSample {
  bytes: Buffer;
  width: number;
  height: number;
  mime: "image/webp";
  extension: "webp";
}

/**
 * Re-encodes to WebP at a sane size. Rejects anything sharp cannot read, which
 * is the cheapest way to be sure the bytes really are an image.
 */
export async function prepareSample(source: Buffer): Promise<PreparedSample> {
  const out = await sharp(source)
    // Bakes in EXIF rotation, so phone photos do not arrive sideways.
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: out.data,
    width: out.info.width,
    height: out.info.height,
    mime: "image/webp",
    extension: "webp",
  };
}
