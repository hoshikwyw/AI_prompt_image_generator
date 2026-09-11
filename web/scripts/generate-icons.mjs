#!/usr/bin/env node
/**
 * Every icon the app ships, generated from one design.
 *
 *   npm run icons
 *
 * The design lives in `iconSvg()` below rather than in a separate file, so a
 * colour or shape change is made once and every size — favicon, Apple touch
 * icon, PWA icons — is regenerated to match. Output files are committed; this
 * only needs re-running when the design changes.
 *
 * No extra dependencies: sharp (already used for sample images) rasterises the
 * SVG, and the .ico container is assembled by hand below.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");

/**
 * Periwinkle to pink: the same two colours as the soft glows behind the page
 * (globals.css `body::before`), so the icon looks like it belongs to the site.
 */
const GRADIENT = ["#7c8cff", "#f472b6"];

/** Soft plum rather than black, so the face reads gentle instead of stark. */
const INK = "#2b2540";

/** A chubby speech bubble with a curled tail — "prompt", and a face to put on it. */
const BUBBLE =
  '<rect x="108" y="118" width="296" height="248" rx="112"/>' +
  '<path d="M180 338c-2 32-18 56-42 72 46 2 86-16 110-48z"/>';

/**
 * The mark: a little speech-bubble mascot — shiny eyes, pink cheeks, an ω
 * mouth and a sparkle — on the brand gradient, drawn on a 512 grid.
 *
 * At favicon size the face shrinks to a couple of pixels, which is fine: the
 * white bubble on the gradient is a clear silhouette by itself, and the face
 * appears as soon as there is room for it.
 *
 * - `rounded`: false gives a full-bleed square, for platforms that apply their
 *   own mask (iOS, Android adaptive, PWA "maskable") and would otherwise show
 *   our corners inside theirs.
 * - `background`: false gives the mascot alone, for layered icons.
 * - `glyphScale`: shrinks the mascot about the centre, to keep it inside a
 *   platform's safe zone.
 */
export function iconSvg({ size = 512, rounded = true, background = true, glyphScale = 1 } = {}) {
  const radius = rounded ? 120 : 0;
  const transform = `translate(256 256) scale(${glyphScale}) translate(-256 -256)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT[0]}"/>
      <stop offset="1" stop-color="${GRADIENT[1]}"/>
    </linearGradient>
  </defs>${background ? `\n  <rect width="512" height="512" rx="${radius}" fill="url(#g)"/>` : ""}
  <g transform="${transform}">
    <g fill="#3b1a78" opacity="0.2" transform="translate(0 14)">${BUBBLE}</g>
    <g fill="#fff">${BUBBLE}</g>
    <ellipse cx="208" cy="236" rx="20" ry="26" fill="${INK}"/>
    <ellipse cx="304" cy="236" rx="20" ry="26" fill="${INK}"/>
    <circle cx="215" cy="226" r="7" fill="#fff"/>
    <circle cx="311" cy="226" r="7" fill="#fff"/>
    <ellipse cx="176" cy="282" rx="22" ry="13" fill="#ff8fc6" opacity="0.85"/>
    <ellipse cx="336" cy="282" rx="22" ry="13" fill="#ff8fc6" opacity="0.85"/>
    <path d="M232 274q12 14 24 2q12 12 24-2" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M400 88q6 26 32 32q-26 6-32 32q-6-26-32-32q26-6 32-32z" fill="#fff"/>
  </g>
</svg>
`;
}

const png = (options) => sharp(Buffer.from(iconSvg(options))).png().toBuffer();

/**
 * A multi-size .ico whose entries are PNGs — valid since Windows Vista and
 * read by every current browser — so there is no need for an ICO library.
 */
function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, at); // width (0 means 256)
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1); // height
    directory.writeUInt8(0, at + 2); // no palette
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

async function write(relative, data) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  console.log(`  ${relative.padEnd(34)} ${(data.length / 1024).toFixed(1).padStart(6)} KB`);
}

console.log("\nGenerating icons\n");

// Vector favicon for browsers that take one — sharp at any size.
await write("app/icon.svg", iconSvg());

// Fallback favicon for everything else, and for tools that only look for .ico.
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png({ size }) })),
);
await write("app/favicon.ico", toIco(icoImages));

// iOS rounds the corners itself, so it wants a full-bleed square.
await write("app/apple-icon.png", await png({ size: 180, rounded: false }));

// Installable-web-app icons, referenced from app/manifest.ts.
await write("public/icons/icon-192.png", await png({ size: 192 }));
await write("public/icons/icon-512.png", await png({ size: 512 }));
// Maskable: full bleed, since the launcher crops to its own shape — and the
// mascot shrunk to 90%, because at full size the sparkle's tips sit ~222 units
// from centre and the safe circle only allows ~205. At 90% the farthest point
// (the sparkle) is ~200, so a circular crop never clips it.
await write(
  "public/icons/icon-maskable-512.png",
  await png({ size: 512, rounded: false, glyphScale: 0.9 }),
);

console.log("\nDone.\n");
