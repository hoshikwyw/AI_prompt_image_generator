"use client";

import { useState } from "react";
import { THEMES, THEME_COLORS, THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Rewrites the theme-color meta tags the way generateViewport would have for
 * this choice, so a phone's address bar follows without a reload.
 */
function syncThemeColor(theme: Theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((tag) => tag.remove());
  const entries: Array<[string, string | null]> =
    theme === "system"
      ? [
          [THEME_COLORS.light, "(prefers-color-scheme: light)"],
          [THEME_COLORS.dark, "(prefers-color-scheme: dark)"],
        ]
      : [[THEME_COLORS[theme], null]];
  for (const [color, media] of entries) {
    const tag = document.createElement("meta");
    tag.name = "theme-color";
    tag.content = color;
    if (media) tag.media = media;
    document.head.appendChild(tag);
  }
}

const LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

/** A year, refreshed on every change. */
const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * One button that cycles System → Light → Dark. The choice applies at once by
 * setting `data-theme` on <html>, and is saved in a cookie the layout reads, so
 * the next page load arrives in the same theme.
 */
export default function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  function cycle() {
    const root = document.documentElement;
    if (next === "system") {
      delete root.dataset.theme;
      document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
      root.dataset.theme = next;
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${MAX_AGE}; samesite=lax`;
    }
    syncThemeColor(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="btn btn-ghost btn-sm btn-icon"
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next].toLowerCase()}.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {theme === "light" ? (
          <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
          </>
        ) : theme === "dark" ? (
          <path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z" />
        ) : (
          <>
            <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.25" />
            <path d="M5.5 14h5M8 11.25V14" />
          </>
        )}
      </svg>
    </button>
  );
}
