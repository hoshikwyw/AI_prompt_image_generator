/**
 * Loads web/.env.local, then web/.env, into process.env — what Next does on its
 * own, for the bare node scripts in this folder. A value already set in the
 * environment wins, as it does in Next. Import it for its side effect, first:
 *
 *   import "./load-env.mjs";
 */
import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    // Split on \r?\n: a file edited on Windows can carry CRLF, and a trailing
    // \r left on the line would otherwise beat the value regex below.
    for (const line of readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split(
      /\r?\n/,
    )) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // A missing file is fine; each script reports the variables it needs.
  }
}
