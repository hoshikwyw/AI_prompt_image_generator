import { THEME_COOKIE, readTheme } from "@/lib/theme";

/**
 * GET /api/reference — the interactive API reference: every endpoint, its
 * parameters and a "try it" panel, generated from /api/v1/openapi.json.
 *
 * A plain HTML page, not a Next page, because Scalar brings its own full-page
 * layout and styles, which would fight the site's. The script is pinned to an
 * exact version with a Subresource Integrity hash: if the CDN ever served
 * different bytes, the browser would refuse to run them.
 */
const SCALAR = {
  src: "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.74.0/dist/browser/standalone.js",
  integrity: "sha384-VXnKAz61Xwc3tbw1P+KKrUP7YbcsSl1Ik4is5UnogJyw9XEYZ5Ay/T1i0zPYtSZH",
};

export function GET(request: Request) {
  const { origin } = new URL(request.url);
  // The site's own theme choice when there is one, otherwise the system's.
  const cookie = new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  );
  const theme = readTheme(cookie?.[1]);

  const config = {
    url: `${origin}/api/v1/openapi.json`,
    metaData: { title: "Promptbook API reference" },
    defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
    // Scalar reports usage to its own servers unless told not to; visitors'
    // browsing is not ours to send to a third party.
    telemetry: false,
    // Its hosted "Ask AI" chat and editing tools are for Scalar's platform,
    // not for readers of a public API.
    agent: { disabled: true },
    showDeveloperTools: "never",
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Promptbook API reference</title>
    <meta name="description" content="Interactive reference for the free Promptbook API." />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  </head>
  <body>
    <div id="app"></div>
    <script src="${SCALAR.src}" integrity="${SCALAR.integrity}" crossorigin="anonymous"></script>
    <script>
      var theme = ${JSON.stringify(theme)};
      var config = ${JSON.stringify(config).replace(/</g, "\\u003c")};
      config.darkMode = theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      Scalar.createApiReference("#app", config);
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Varies with the theme cookie, so the browser may cache it but a CDN must not.
      "Cache-Control": "private, max-age=300",
    },
  });
}
