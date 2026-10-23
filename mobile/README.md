# mobile

The Android app: a [Capacitor](https://capacitorjs.com) shell that opens the deployed site.

It is deliberately a shell, not a bundled copy. Promptbook renders on the server, reads Supabase
with a service key that must never leave the server, and signs admins in with an httpOnly cookie.
None of that survives being frozen into static files inside an APK, where anything can be
unzipped and read. So the WebView loads the live site, and anything deployed to Vercel reaches the
app without a rebuild. The cost is that it needs a connection.

## Setup

Needs JDK 21 and the Android SDK (platform 36), with `ANDROID_HOME` set — or both paths in
`android/local.properties`, which is per-machine and git-ignored. Forward slashes avoid escaping:

```properties
sdk.dir=C:/Users/you/AppData/Local/Android/Sdk
# Only if JAVA_HOME points at an older JDK: build with this one instead.
java.home=C:/path/to/jdk-21
```

1. Deploy `web/` to Vercel first. The app has nothing to open until then.
2. Put the site's URL in [`app.config.json`](app.config.json):
   ```json
   { "serverUrl": "https://your-site.vercel.app" }
   ```
3. Install and sync:
   ```bash
   npm install
   npm run sync      # writes www/config.js, copies www/ into the Android project
   ```

Re-run `npm run sync` whenever `app.config.json` or `capacitor.config.ts` changes.

## Building the APK

```bash
npm run build:apk
```

Syncs, builds with Gradle and copies the result to `dist/Promptbook-<version>-debug.apk`, then
prints its size and SHA-256. It refuses to run without a `serverUrl`, because that build could only
ever show the setup page. The first build downloads Gradle and takes several minutes; later ones
are quicker.

**To install:** upload the APK to Google Drive and open it from the Drive app on the phone. Allow
Drive to "install unknown apps" when asked, then tap Install. Play Protect may warn about an
unknown developer; choose "Install anyway".

This is a **debug** build: signed with this computer's debug key, and debuggable over USB. That is
fine for testing on your own phone, with two consequences:

- An APK built on a different computer has a different signature, so it only installs after the
  old one is uninstalled.
- Before sharing it beyond your own phone, switch to a release build signed with your own keystore.

## Icons and splash

```bash
npm run assets
```

Draws the launcher icon and splash from the same design as the web favicon
(`web/scripts/icon-design.mjs`), then runs `capacitor-assets` to produce every Android density.
Only needed when the design changes; the output under `android/` is committed.

## What the shell adds

| | |
|---|---|
| **Back button** | Walks the site's history before leaving the app (`MainActivity.java`). Capacitor does not handle it, and Android's default would exit from any page. |
| **Offline page** | `www/error.html`, served from inside the app, so it shows with no connection. It retries by itself when the connection returns. |
| **Setup page** | `www/index.html`, shown only by a build with no `serverUrl`. |
| **Light and dark** | The window, system bars, splash and WebView background follow the phone's light/dark mode, like the site. Colours live in `res/values/theme_colors.xml` and `res/values-night/`; `MainActivity` re-applies them when the phone switches mode with the app open, since the app is not restarted for that. |

## Known limits

- **The bars follow the phone, not the site's theme button.** Picking Dark on the site while the
  phone is in light mode darkens the page but leaves the status bar light. The page stays fully
  readable; only the strip at the top differs.

- **Export does nothing in the app.** A WebView doesn't handle file downloads unless the app adds
  its own download handling. Use the site in a browser to export.
- **No offline reading.** The shell shows the offline page rather than cached prompts.
