import { listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/**
 * The whole collection as a file. Plain navigation to this URL downloads it,
 * so the export control is a link rather than a script.
 */
export async function GET() {
  const prompts = await listPrompts({ sort: "oldest" });
  const day = new Date().toISOString().slice(0, 10);
  const payload = { version: 1, exportedAt: new Date().toISOString(), prompts };

  return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="promptbook-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
