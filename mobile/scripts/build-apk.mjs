#!/usr/bin/env node
/**
 * Builds the installable APK and copies it somewhere easy to find.
 *
 *   npm run build:apk
 *
 * Syncs, runs Gradle, and copies the result to dist/Promptbook-<version>-debug.apk
 * — a name that says what it is once it is sitting in a Google Drive folder,
 * unlike Gradle's own app-debug.apk buried five directories deep.
 *
 * It refuses to build without a serverUrl. A build without one opens the
 * "isn't set up yet" page, and that is easy not to notice until the APK is
 * already installed on a phone.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const android = path.join(root, "android");

const { serverUrl = "" } = JSON.parse(readFileSync(path.join(root, "app.config.json"), "utf8"));
if (!serverUrl) {
  console.error(
    "\nNo serverUrl in app.config.json, so the app would have nothing to open.\n" +
      'Set it to the deployed site, e.g. { "serverUrl": "https://your-site.vercel.app" }.\n',
  );
  process.exit(1);
}
if (serverUrl.startsWith("http://")) {
  console.warn(
    "\nWarning: serverUrl is plain http. That only suits a dev server on your own Wi-Fi —\n" +
      "the app will not work anywhere else, and logins are sent unencrypted.\n",
  );
}

/**
 * Runs a command line in the foreground, stopping the whole build if it fails.
 *
 * One command string, not a command plus an args array: npm and gradlew are
 * .cmd/.bat files on Windows, which only a shell will run, and Node deprecates
 * combining an args array with a shell (DEP0190) because the args are pasted
 * in unescaped. Every command here is a fixed string, so nothing is injected.
 */
function run(commandLine, cwd) {
  const result = spawnSync(commandLine, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n\`${commandLine}\` failed — see the output above.\n`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nBuilding Promptbook for ${serverUrl}\n`);

run("npm run sync", root);

// By absolute path, quoted. cmd.exe does not reliably look in the working
// directory for a bare "gradlew.bat" — it answered "not recognized" when this
// script first ran it — so the wrapper is never left for the shell to find.
const gradlew = path.join(android, process.platform === "win32" ? "gradlew.bat" : "gradlew");
run(`"${gradlew}" assembleDebug --console=plain`, android);

const gradle = readFileSync(path.join(android, "app", "build.gradle"), "utf8");
const version = /versionName\s*=?\s*"([^"]+)"/.exec(gradle)?.[1] ?? "dev";

const built = path.join(android, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const dist = path.join(root, "dist");
const target = path.join(dist, `Promptbook-${version}-debug.apk`);
mkdirSync(dist, { recursive: true });
copyFileSync(built, target);

const size = statSync(target).size;
const sha256 = createHash("sha256").update(readFileSync(target)).digest("hex");

console.log(`
APK ready

  ${path.relative(process.cwd(), target) || target}
  ${(size / 1024 / 1024).toFixed(1)} MB · SHA-256 ${sha256}
  Opens ${serverUrl}

To install on Android:
  1. Upload the APK to Google Drive.
  2. On the phone, open it from the Drive app and tap Install.
  3. When asked, allow Drive to "install unknown apps", then tap Install again.
     Play Protect may warn about an unknown developer — tap "Install anyway".
`);
