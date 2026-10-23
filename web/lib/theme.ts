/**
 * The visitor's theme choice. "system" is the absence of a choice: no cookie,
 * no `data-theme` attribute, and the CSS follows `prefers-color-scheme`.
 *
 * A cookie rather than local storage so the server can put `data-theme` on
 * <html> in the very first response — the page never paints in the wrong
 * theme and then flips.
 */
export const THEME_COOKIE = "promptbook-theme";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** A stored value, or "system" for anything missing or unrecognised. */
export function readTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
