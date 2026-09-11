import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android app is a shell around the deployed site, not a bundled copy.
 *
 * Promptbook renders on the server, talks to Supabase with a service key that
 * must never leave the server, and signs admins in with an httpOnly cookie —
 * none of which survives being frozen into static files inside an APK, where
 * anything can be unzipped and read. So the WebView loads the live site, and a
 * change deployed to Vercel reaches the app without rebuilding it.
 *
 * The site URL lives in app.config.json rather than here, because the offline
 * page needs it too (see scripts/prepare-www.mjs).
 */
const { serverUrl = "" } = JSON.parse(
  // The Capacitor CLI always runs from this directory, so cwd is this folder.
  readFileSync(join(process.cwd(), "app.config.json"), "utf8"),
) as { serverUrl?: string };

/** The site's own background, so no white flash shows while it loads. */
const BACKGROUND = "#0a0c12";

const config: CapacitorConfig = {
  // Reverse-domain id Android uses to tell apps apart. It cannot change once
  // the app is installed without uninstalling first, so it is fixed here.
  appId: "com.hoshikwyw.promptbook",
  appName: "Promptbook",

  // Only the two fallback pages live here: index.html for a build with no URL
  // set, error.html for when the site cannot be reached.
  webDir: "www",

  ...(serverUrl && {
    server: {
      url: serverUrl,
      // Plain http is only for pointing at a dev server on the local network.
      cleartext: serverUrl.startsWith("http://"),
      // Served from inside the app, so it still shows with no connection.
      errorPath: "error.html",
    },
  }),

  android: {
    backgroundColor: BACKGROUND,
  },

  plugins: {
    SystemBars: {
      // Light status-bar icons, for a dark app.
      style: "DARK",
    },
  },
};

export default config;
