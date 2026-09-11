#!/usr/bin/env node
/**
 * Every icon the web app ships, generated from one design.
 *
 *   npm run icons
 *
 * The design itself is in ./icon-design.mjs, shared with the Android app's
 * asset script, so a colour or shape change is made once and every size —
 * favicon, Apple touch icon, PWA icons, launcher icon — is regenerated to
 * match. Output files are committed; this only needs re-running when the
 * design changes.
 *
 * No extra dependencies: sharp (already used for sample images) rasterises the
 * SVG, and the .ico container is assembled by hand below.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { iconSvg } from "./icon-design.mjs";

const root = path.resolve(import.meta.dirname, "..");

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
