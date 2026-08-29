import { readdir, mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PROMPTS, type StylePrompt } from "./prompts.ts";
import { createCloudflareProvider } from "./providers/cloudflare.ts";
import { createGeminiProvider } from "./providers/gemini.ts";
import type { EditInput, ImageProvider } from "./types.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function arg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  const next = process.argv[idx + 1];
  if (idx !== -1 && next && !next.startsWith("--")) return next;
  return fallback;
}

async function pickPhoto(): Promise<string> {
  const explicit = arg("photo");
  if (explicit) return path.resolve(explicit);
  const dir = path.join(ROOT, "inputs");
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) {
    throw new Error(`Drop a portrait photo into ${dir} (jpg/png/webp), or pass --photo <path>.`);
  }
  return path.join(dir, files[0]);
}

/** Fit inside a square edge without upscaling, and bake in EXIF rotation. */
async function prepare(source: Buffer, maxEdge: number) {
  const out = await sharp(source)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer({ resolveWithObject: true });
  return { image: out.data, width: out.info.width, height: out.info.height, mimeType: "image/jpeg" };
}

type Row = {
  style: StylePrompt;
  provider: string;
  label: string;
  file?: string;
  ms?: number;
  costUsd?: number;
  error?: string;
};

async function main() {
  const photoPath = await pickPhoto();
  const original = readFileSync(photoPath);
  const outSize = Number(arg("size", "1024"));

  const only = arg("only");
  const providers: ImageProvider[] = [createCloudflareProvider(), createGeminiProvider()].filter(
    (p) => (only ? p.id === only : true),
  );

  const wanted = arg("styles");
  const styles = wanted
    ? wanted.split(",").map((s) => {
        const found = PROMPTS.find((p) => p.slug === s.trim());
        if (!found) throw new Error(`Unknown style "${s.trim()}"`);
        return found;
      })
    : PROMPTS;

  const active = providers.filter((p) => p.configured());
  for (const p of providers.filter((p) => !p.configured())) {
    console.log(`skip  ${p.label} - credentials missing in .env`);
  }
  if (!active.length) throw new Error("No providers configured. Fill in .env first.");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(ROOT, "out", stamp);
  await mkdir(outDir, { recursive: true });

  // Save the source at display size so the contact sheet has a reference column.
  const reference = await prepare(original, 512);
  await writeFile(path.join(outDir, "original.jpg"), reference.image);

  console.log(`\nphoto   ${path.basename(photoPath)}`);
  console.log(`styles  ${styles.length}   providers  ${active.map((p) => p.id).join(", ")}`);
  console.log(`runs    ${styles.length * active.length}   -> out/${stamp}\n`);

  const rows: Row[] = [];

  for (const style of styles) {
    for (const provider of active) {
      const prepared = await prepare(original, provider.maxInputEdge);
      const input: EditInput = {
        image: prepared.image,
        mimeType: prepared.mimeType,
        inputWidth: prepared.width,
        inputHeight: prepared.height,
        prompt: style.prompt,
        outWidth: outSize,
        outHeight: outSize,
      };

      process.stdout.write(`  ${style.slug.padEnd(18)} ${provider.id.padEnd(11)} ... `);
      try {
        const result = await provider.edit(input);
        const ext = result.mimeType.includes("jpeg") ? "jpg" : "png";
        const file = `${style.slug}--${provider.id}.${ext}`;
        await writeFile(path.join(outDir, file), result.image);
        rows.push({
          style,
          provider: provider.id,
          label: provider.label,
          file,
          ms: result.ms,
          costUsd: result.costUsd,
        });
        console.log(`ok  ${(result.ms / 1000).toFixed(1)}s  $${result.costUsd.toFixed(4)}`);
      } catch (err: any) {
        const message = String(err?.message ?? err);
        rows.push({ style, provider: provider.id, label: provider.label, error: message });
        console.log(`FAIL  ${message.slice(0, 120)}`);
        if (err?.body) console.log(`        ${String(err.body).slice(0, 300)}`);
      }
    }
  }

  await writeFile(path.join(outDir, "index.html"), renderReport(rows, active, styles, photoPath));

  const totals = new Map<string, { usd: number; ms: number; ok: number }>();
  for (const r of rows) {
    const t = totals.get(r.provider) ?? { usd: 0, ms: 0, ok: 0 };
    if (!r.error) {
      t.usd += r.costUsd ?? 0;
      t.ms += r.ms ?? 0;
      t.ok += 1;
    }
    totals.set(r.provider, t);
  }

  console.log("\n--- summary ---");
  for (const [id, t] of totals) {
    const avg = t.ok ? (t.ms / t.ok / 1000).toFixed(1) : "-";
    console.log(
      `${id.padEnd(12)} ${String(t.ok).padStart(2)}/${styles.length} ok   avg ${avg}s   total $${t.usd.toFixed(4)}`,
    );
  }

  const cf = totals.get("cloudflare");
  if (cf?.ok) {
    const neuronsPerImage = (cf.usd / cf.ok / 0.011) * 1000;
    console.log(
      `\nCloudflare free budget: ~${Math.floor(10000 / neuronsPerImage)} images/day ` +
        `(10,000 neurons at ~${neuronsPerImage.toFixed(0)} per image)`,
    );
  }
  console.log(`\nCompare likeness side by side:\n  ${path.join(outDir, "index.html")}\n`);
}

function renderReport(
  rows: Row[],
  providers: ImageProvider[],
  styles: StylePrompt[],
  photoPath: string,
): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const cells = (style: StylePrompt) =>
    providers
      .map((p) => {
        const row = rows.find((r) => r.style.slug === style.slug && r.provider === p.id);
        if (!row) return `<td class="empty">-</td>`;
        if (row.error) return `<td class="fail"><div class="err">${esc(row.error)}</div></td>`;
        return `<td>
          <img src="${row.file}" alt="${esc(style.title)} via ${esc(p.label)}">
          <div class="meta">${((row.ms ?? 0) / 1000).toFixed(1)}s &middot; $${(row.costUsd ?? 0).toFixed(4)}</div>
        </td>`;
      })
      .join("");

  const head = providers.map((p) => `<th>${esc(p.label)}</th>`).join("");

  const body = styles
    .map(
      (s) => `<tr>
      <td class="style">
        <b>${esc(s.title)}</b>
        <span class="tag ${s.difficulty}">${s.difficulty}</span>
        <div class="prompt">${esc(s.prompt)}</div>
      </td>
      <td><img src="original.jpg" alt="original"></td>
      ${cells(s)}
    </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Likeness probe</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 0; padding: 32px; background: #0f1115; color: #e7e9ee; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #9aa2b1; margin-bottom: 28px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 10px; vertical-align: top; text-align: left; }
  thead th { position: sticky; top: 0; background: #0f1115; border-bottom: 1px solid #2a2f3a;
             font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9aa2b1; }
  tbody tr { border-bottom: 1px solid #1c2029; }
  img { width: 100%; max-width: 320px; border-radius: 8px; display: block; background: #1c2029; }
  .meta { color: #7d8697; font-size: 12px; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .style { width: 220px; }
  .style b { display: block; font-size: 15px; margin-bottom: 4px; }
  .tag { display: inline-block; font-size: 11px; padding: 2px 7px; border-radius: 99px;
         background: #1c2029; color: #9aa2b1; }
  .tag.medium { background: #3a331f; color: #ffe0a3; }
  .tag.hard { background: #3a1f24; color: #ffb4be; }
  .prompt { color: #6f7788; font-size: 12px; margin-top: 8px; }
  .fail .err { color: #ff9aa6; font-size: 12px; background: #2a1a1e; padding: 10px; border-radius: 8px; }
  .empty { color: #4a5262; }
</style></head><body>
<h1>Identity-preservation probe</h1>
<div class="sub">${esc(path.basename(photoPath))} &middot; ${new Date().toLocaleString()} &middot;
  Look at the <b>hard</b> rows first - that is where a weak model stops looking like the subject.</div>
<table>
<thead><tr><th class="style">Style</th><th>Original</th>${head}</tr></thead>
<tbody>
${body}
</tbody></table>
</body></html>`;
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}\n`);
  process.exit(1);
});
