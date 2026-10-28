import { LICENCE } from "@/lib/openapi";
import { AI_TOOL_LABELS, AUDIENCE_LABELS, CATEGORY_LABELS } from "@/lib/prompt";
import { CACHE } from "@/lib/public-api";
import { listPrompts } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Text from a prompt, safe inside one Markdown list item. Titles and summaries
 * are only trimmed when saved, so a newline could start a fake "## Optional"
 * section in the file AI tools trust, and a "]" broke the link around it.
 */
const inline = (text: string) => text.replace(/\s+/g, " ").trim().replace(/([\\[\]()*_`])/g, "\\$1");

/**
 * GET /llms.txt — the site described for language models, in the llmstxt.org
 * format: a title, a one-line summary, then sections of links. Lets an AI tool
 * that is asked about Promptbook find the API, the MCP server and every prompt
 * without crawling the pages.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const prompts = await listPrompts({ sort: "title" });

  const line = (p: (typeof prompts)[number]) => {
    const facts = [
      CATEGORY_LABELS[p.category],
      p.audience === "any" ? "for anyone" : `for ${AUDIENCE_LABELS[p.audience].toLowerCase()}`,
      p.models.length ? p.models.map((m) => AI_TOOL_LABELS[m]).join(", ") : "any AI tool",
    ].join(" · ");
    const summary = inline(p.summary);
    return `- [${inline(p.title)}](${origin}/prompts/${p.id}): ${summary ? `${summary} — ` : ""}${facts}`;
  };

  const body = `# Promptbook

> A free library of ready-to-copy AI image prompts for ChatGPT, Gemini, Midjourney, Flux and more — tagged by who they suit (women, men, couples, anyone), the AI tool they work in, and category.

Each prompt has the text to paste, the [bracketed] parts to change, and notes such as "attach your photo first". Prompts are licensed ${LICENCE.name} (${LICENCE.url}): free to use with credit to Promptbook and a link to the prompt.

## API

- [API guide](${origin}/api): Free, read-only JSON API — no key, CORS open. Search by audience (\`for\`), AI tool (\`ai\`), category and words (\`q\`).
- [OpenAPI spec](${origin}/api/v1/openapi.json): Machine-readable description of every endpoint.
- [MCP server](${origin}/api/mcp): Model Context Protocol endpoint (Streamable HTTP, POST). Tools: search_prompts, get_prompt, random_prompt, list_filters.
- [All prompts as JSON](${origin}/api/v1/export.json): The whole collection in one file.

## Prompts

${prompts.map(line).join("\n")}

## Optional

- [All prompts as CSV](${origin}/api/v1/export.csv): The collection as a spreadsheet.
- [Interactive API reference](${origin}/api/reference): Try every endpoint in the browser.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": CACHE.taxonomy,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
