import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LICENCE } from "./openapi";
import {
  AI_TOOLS,
  AI_TOOL_LABELS,
  AUDIENCES,
  AUDIENCE_FILTERS,
  AUDIENCE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  relatedPrompts,
  tagCounts,
  type PromptFilter,
} from "./prompt";
import { toPublicImage, toPublicPrompt, type PublicPrompt } from "./public-api";
import { getPrompt, listImages, listPrompts } from "./store";

/**
 * Promptbook as an MCP server: lets AI assistants (Claude, ChatGPT and any
 * other MCP client) find prompts for their user without leaving the chat.
 *
 * Read-only and stateless — a fresh server per request (see app/api/mcp), so it
 * runs on serverless hosting with nothing kept between calls. The tools share
 * the public API's data shape and ranking, so an assistant and an API caller
 * see the same prompts in the same order.
 */

const INSTRUCTIONS = [
  "Promptbook is a free library of ready-to-copy AI image prompts, tagged by who they suit (women, men, couples, anyone), the AI tool they work in, and category.",
  "Use search_prompts to find prompts for the user's request; it already returns each prompt's full text. Use list_filters if you need the exact category or tool names.",
  "When you share a prompt: give the prompt text exactly, point out any [bracketed] placeholders the user should change, pass on the notes (they often say to attach a photo first), and credit it as from Promptbook with its link.",
  `Prompts are licensed ${LICENCE.name}.`,
].join(" ");

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

// Shared input fields. Descriptions are what the model reads to fill them in.
const filterFields = {
  category: z.enum(CATEGORIES).optional().describe("What the image is: portrait, fashion, anime, logo…"),
  audience: z
    .enum(AUDIENCE_FILTERS)
    .optional()
    .describe("Who it is for. Prompts that suit anyone are included too, ranked after."),
  tool: z
    .enum(AI_TOOLS)
    .optional()
    .describe("The AI tool the user will paste into. Prompts tagged with no tool are included too, ranked after."),
};

const toFilter = (args: {
  query?: string;
  category?: (typeof CATEGORIES)[number];
  audience?: (typeof AUDIENCE_FILTERS)[number];
  tool?: (typeof AI_TOOLS)[number];
  tag?: string;
}): PromptFilter => ({
  q: args.query?.trim() || undefined,
  category: args.category,
  audience: args.audience,
  model: args.tool,
  tag: args.tag?.trim().toLowerCase() || undefined,
});

/** A prompt as chat-readable text: the fields an assistant needs to pass on. */
function describe(p: PublicPrompt, index?: number): string {
  const facts = [
    CATEGORY_LABELS[p.category],
    p.audience === "any" ? "for anyone" : `for ${AUDIENCE_LABELS[p.audience].toLowerCase()}`,
    p.tools.length ? p.tools.map((t) => AI_TOOL_LABELS[t]).join(", ") : "any AI tool",
  ].join(" · ");
  return [
    `${index !== undefined ? `${index + 1}. ` : ""}${p.title} (${facts})`,
    p.summary && `Summary: ${p.summary}`,
    `Prompt:\n${p.prompt}`,
    p.placeholders.length > 0 && `Change these placeholders: ${p.placeholders.map((x) => `[${x}]`).join(", ")}`,
    p.notes && `Notes: ${p.notes}`,
    `Id: ${p.id}`,
    `Link: ${p.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const text = (body: string) => ({ type: "text" as const, text: body });

export function createPromptbookServer(origin: string): McpServer {
  const server = new McpServer(
    { name: "promptbook", title: "Promptbook", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );

  const withCovers = async (prompts: Awaited<ReturnType<typeof listPrompts>>) => {
    const images = await listImages(prompts.map((p) => p.id));
    return prompts.map((p) => toPublicPrompt(p, origin, images.get(p.id)?.[0]));
  };

  server.registerTool(
    "search_prompts",
    {
      title: "Search prompts",
      description:
        "Find AI image prompts by words, category, audience, AI tool or tag. Returns each match with its full prompt text, placeholders, notes and link.",
      inputSchema: {
        query: z.string().max(100).optional().describe("Words to search for, e.g. 'saree', 'anime', 'logo'."),
        ...filterFields,
        tag: z.string().max(40).optional().describe("A tag, e.g. 'photo-edit' for prompts that edit the user's own photo."),
        limit: z.number().int().min(1).max(25).default(5).describe("How many to return."),
      },
      annotations: { ...READ_ONLY, idempotentHint: true },
    },
    async (args) => {
      const matches = await listPrompts(toFilter(args));
      const page = await withCovers(matches.slice(0, args.limit));
      const body = page.length
        ? `${matches.length} prompt${matches.length === 1 ? "" : "s"} match; showing ${page.length}.\n\n${page.map((p, i) => describe(p, i)).join("\n\n")}`
        : "No prompts match. Try fewer filters or different words — list_filters shows what exists.";
      return {
        content: [text(body)],
        structuredContent: { total: matches.length, prompts: page },
      };
    },
  );

  server.registerTool(
    "get_prompt",
    {
      title: "Get a prompt",
      description: "One prompt in full by its id, with sample image links and a few related prompts' ids.",
      inputSchema: { id: z.string().max(80).describe("The prompt's id, e.g. 'golden-hour-saree'.") },
      annotations: { ...READ_ONLY, idempotentHint: true },
    },
    async ({ id }) => {
      const prompt = await getPrompt(id);
      if (!prompt) {
        return { content: [text(`No prompt has the id "${id}". Use search_prompts to find one.`)], isError: true };
      }
      const images = (await listImages([prompt.id])).get(prompt.id) ?? [];
      const related = relatedPrompts(prompt, await listPrompts(), 3);
      const data = {
        ...toPublicPrompt(prompt, origin, images[0]),
        images: images.map((image) => toPublicImage(image, origin)),
      };
      const body = [
        describe(data),
        data.images.length > 0 && `Sample images: ${data.images.map((i) => i.url).join(" ")}`,
        related.length > 0 && `Related: ${related.map((r) => r.id).join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [text(body)], structuredContent: { prompt: data, related: related.map((r) => r.id) } };
    },
  );

  server.registerTool(
    "random_prompt",
    {
      title: "Random prompt",
      description: "One random prompt, optionally narrowed by category, audience or AI tool. Good for 'surprise me'.",
      inputSchema: filterFields,
      annotations: { ...READ_ONLY, idempotentHint: false },
    },
    async (args) => {
      const matches = await listPrompts(toFilter(args));
      if (matches.length === 0) {
        return { content: [text("No prompt matches those filters.")], isError: true };
      }
      const [pick] = await withCovers([matches[Math.floor(Math.random() * matches.length)]]);
      return { content: [text(describe(pick))], structuredContent: { prompt: pick } };
    },
  );

  server.registerTool(
    "list_filters",
    {
      title: "List filters",
      description: "The categories, audiences, AI tools and most-used tags, with how many prompts each has.",
      annotations: { ...READ_ONLY, idempotentHint: true },
    },
    async () => {
      const prompts = await listPrompts();
      const data = {
        categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id], count: prompts.filter((p) => p.category === id).length })),
        audiences: AUDIENCES.map((id) => ({ id, label: AUDIENCE_LABELS[id], count: prompts.filter((p) => p.audience === id).length })),
        tools: AI_TOOLS.map((id) => ({ id, label: AI_TOOL_LABELS[id], count: prompts.filter((p) => p.models.includes(id)).length })),
        tags: tagCounts(prompts).slice(0, 30).map(({ tag, count }) => ({ id: tag, count })),
      };
      const line = (items: Array<{ id: string; count: number }>) =>
        items.filter((i) => i.count > 0).map((i) => `${i.id} (${i.count})`).join(", ");
      const body = [
        `${prompts.length} prompts in all.`,
        `Categories: ${line(data.categories)}`,
        `Audiences (filter with female, male or couple; "any" suits everyone): ${line(data.audiences)}`,
        `AI tools: ${line(data.tools)}`,
        `Top tags: ${line(data.tags)}`,
      ].join("\n");
      return { content: [text(body)], structuredContent: data };
    },
  );

  return server;
}
