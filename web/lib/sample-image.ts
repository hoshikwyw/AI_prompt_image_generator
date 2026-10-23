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
 * True when the bytes start like one of the formats ACCEPTED_SAMPLE_MIME
 * allows. sharp picks its decoder from the content, not the declared type, so
 * without this an SVG sent as "image/png" would reach librsvg — the decoder
 * with the most history of security fixes, and one a photo never needs.
 */
function isAcceptedImage(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  const ascii = (start: number, end: number) => bytes.toString("latin1", start, end);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = ascii(0, 8) === "\x89PNG\r\n\x1a\n";
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  // ISO-BMFF: "ftyp" then brands; AVIF names itself as the major or a compatible brand.
  const avif = ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, Math.min(bytes.length, 64)));
  return jpeg || png || webp || avif;
}

/**
 * Re-encodes to WebP at a sane size. Rejects anything that is not one of the
 * accepted formats before sharp sees it, and anything sharp cannot read after.
 */
export async function prepareSample(source: Buffer): Promise<PreparedSample> {
  if (!isAcceptedImage(source)) throw new Error("Not a JPEG, PNG, WebP or AVIF image.");

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
