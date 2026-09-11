/**
 * The Promptbook mark, as SVG.
 *
 * Kept on its own and free of imports so that every icon in the repo is drawn
 * from this one function: the web favicon and app icons
 * (web/scripts/generate-icons.mjs) and the Android launcher icon and splash
 * screen (mobile/scripts/generate-assets.mjs). Change the design here and
 * re-run both scripts.
 */

/**
 * Periwinkle to pink: the same two colours as the soft glows behind the page
 * (globals.css `body::before`), so the icon looks like it belongs to the site.
 */
export const GRADIENT = ["#7c8cff", "#f472b6"];

/** The page background, for anything that sits behind the mark (splash screens). */
export const BACKGROUND = "#0a0c12";

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
 * - `background`: false gives the mascot alone on transparency, for layered
 *   icons such as Android's adaptive foreground.
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

/** Just the gradient, full bleed — the background layer of a layered icon. */
export function gradientSvg({ size = 512 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT[0]}"/>
      <stop offset="1" stop-color="${GRADIENT[1]}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
</svg>
`;
}
