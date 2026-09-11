#!/usr/bin/env node
/**
 * Source images for the Android launcher icon and splash screen.
 *
 *   npm run assets
 *
 * Draws from the same design as the web favicon (web/scripts/icon-design.mjs),
 * so the app on the home screen and the site in a browser tab are the same
 * mascot. It writes the source files @capacitor/assets expects into assets/,
 * and the npm script then runs `capacitor-assets generate --android`, which
 * turns them into every mipmap density, the adaptive-icon layers and the
 * splash drawables inside android/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BACKGROUND, gradientSvg, iconSvg } from "../../web/scripts/icon-design.mjs";

const root = path.resolve(import.meta.dirname, "..");
const render = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

async function write(relative, data) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  console.log(`  ${relative.padEnd(28)} ${(data.length / 1024).toFixed(1).padStart(7)} KB`);
}

/** A dark screen with the rounded icon in the middle. */
async function splash() {
  const SIZE = 2732; // the size @capacitor/assets expects; it crops per device
  const logo = await render(iconSvg({ size: 640 }));
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BACKGROUND } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

console.log("\nGenerating Android asset sources\n");

// Legacy launcher icon (Android 7 and older, and some launchers' fallbacks).
// Full bleed: the launcher, not us, decides the shape.
await write("assets/icon-only.png", await render(iconSvg({ size: 1024, rounded: false })));

// Adaptive icon, Android 8+: two layers the launcher masks and animates
// separately. capacitor-assets insets each layer by 16.7% in the adaptive-icon
// XML, so these images fill the 72dp visible area, not the full 108dp canvas.
// The 66dp safe zone is therefore 66/72 of the image — a circle of radius ~235
// on our 512 grid. At full scale the sparkle reaches ~222; at 95% it is ~211,
// inside with room to spare and about the size of the legacy icon.
await write(
  "assets/icon-foreground.png",
  await render(iconSvg({ size: 1024, background: false, glyphScale: 0.95 })),
);
await write("assets/icon-background.png", await render(gradientSvg({ size: 1024 })));

// Splash: the app is dark-only, so light and dark variants are the same.
const splashImage = await splash();
await write("assets/splash.png", splashImage);
await write("assets/splash-dark.png", splashImage);

// For the local fallback pages in www/, so they show the mascot too.
await write("www/icon.svg", Buffer.from(iconSvg()));

console.log("\nDone. Running capacitor-assets next.\n");
