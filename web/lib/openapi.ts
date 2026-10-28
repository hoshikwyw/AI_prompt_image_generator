/**
 * The OpenAPI 3.1 description of the public API (/api/v1).
 *
 * Generated rather than hand-written: every enum below comes from the same
 * constants the API validates against, so adding a category or an AI tool
 * updates the spec, the interactive reference and every client generated from
 * it, with nothing to keep in step by hand.
 */
import {
  AI_TOOLS,
  AUDIENCES,
  AUDIENCE_FILTERS,
  CATEGORIES,
  SORTS,
} from "./prompt";
import { DEFAULT_LIMIT, MAX_LIMIT } from "./public-api";

export const LICENCE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
} as const;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const param = (name: string) => ({ $ref: `#/components/parameters/${name}` });

const json = (schema: object, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const errors = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "429": { $ref: "#/components/responses/TooManyRequests" },
};

// The aliases are listed too, marked deprecated, so a generated client can
// send what the API accepts rather than finding them only in prose.
const FILTERS = ["q", "category", "for", "ai", "tag", "featured", "sort", "audience", "tool", "favorites"].map(param);

export function openApiSpec(origin: string) {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Promptbook API",
      version: "1.0.0",
      summary: "Free, read-only access to ready-to-copy AI image prompts.",
      description: [
        "Search and fetch AI image prompts for ChatGPT, Gemini, Midjourney, Flux and more — for women, men, couples or anyone.",
        "",
        "- **Free and open:** no key, no sign-up. CORS is open, so it works from any website or app.",
        "- **Read-only:** nothing can change a prompt through the API.",
        "- **Cached:** responses carry CDN cache headers; please cache on your side too.",
        "- **Fair use:** about 60 requests a minute per IP. Over that you get `429` with `Retry-After`.",
        `- **AI assistants:** an MCP server at \`${origin}/api/mcp\` offers the same prompts as tools (search_prompts, get_prompt, random_prompt, list_filters).`,
        "",
        `Prompts are licensed ${LICENCE.name}: free to use, including commercially, with credit to Promptbook and a link to the prompt's \`url\`.`,
      ].join("\n"),
      license: LICENCE,
      termsOfService: `${origin}/api#terms`,
    },
    servers: [{ url: `${origin}/api/v1` }],
    externalDocs: { description: "Guide and examples", url: `${origin}/api` },
    tags: [
      { name: "Prompts", description: "Find and fetch prompts." },
      { name: "Filters", description: "Values the prompt filters accept, with counts." },
      { name: "Images", description: "Sample images." },
      { name: "Downloads", description: "The whole collection in one file." },
    ],
    paths: {
      "/prompts": {
        get: {
          tags: ["Prompts"],
          operationId: "listPrompts",
          summary: "Search and filter prompts",
          description:
            "A page of prompts matching the filters. Follow `meta.nextCursor` for the next page. With `for` or `ai`, prompts aimed at that choice come first, then ones that suit anyone.",
          parameters: [...FILTERS, param("limit"), param("cursor")],
          responses: {
            "200": json(
              {
                type: "object",
                required: ["data", "meta"],
                properties: { data: { type: "array", items: ref("Prompt") }, meta: ref("ListMeta") },
              },
              "A page of prompts.",
            ),
            ...errors,
          },
        },
      },
      "/prompts/{id}": {
        get: {
          tags: ["Prompts"],
          operationId: "getPrompt",
          summary: "Get one prompt",
          description: "The prompt with every sample image.",
          parameters: [param("id")],
          responses: {
            "200": json(
              { type: "object", required: ["data"], properties: { data: ref("PromptWithImages") } },
              "The prompt.",
            ),
            "404": { $ref: "#/components/responses/NotFound" },
            "429": errors["429"],
          },
        },
      },
      "/prompts/{id}/related": {
        get: {
          tags: ["Prompts"],
          operationId: "getRelatedPrompts",
          summary: "Prompts like this one",
          description:
            "Prompts that suit the same people, same category first — the site's “More like this”.",
          parameters: [
            param("id"),
            {
              name: "limit",
              in: "query",
              description: "How many to return.",
              schema: { type: "integer", minimum: 1, maximum: 12, default: 4 },
            },
          ],
          responses: {
            "200": json(
              {
                type: "object",
                required: ["data"],
                properties: { data: { type: "array", items: ref("Prompt") } },
              },
              "Related prompts.",
            ),
            "404": { $ref: "#/components/responses/NotFound" },
            ...errors,
          },
        },
      },
      "/random": {
        get: {
          tags: ["Prompts"],
          operationId: "getRandomPrompt",
          summary: "A random prompt",
          description: "One random prompt, optionally narrowed with the same filters as `/prompts`.",
          // `sort` is validated like every filter, so it is listed, though a
          // random pick ignores the order.
          parameters: FILTERS,
          responses: {
            "200": json(
              { type: "object", required: ["data"], properties: { data: ref("Prompt") } },
              "A random prompt.",
            ),
            "404": json(ref("Error"), "No prompt matches those filters (`no_match`)."),
            ...errors,
          },
        },
      },
      "/categories": {
        get: {
          tags: ["Filters"],
          operationId: "listCategories",
          summary: "Categories",
          responses: { "200": json(listOf("Category"), "Every category, with counts."), "429": errors["429"] },
        },
      },
      "/audiences": {
        get: {
          tags: ["Filters"],
          operationId: "listAudiences",
          summary: "Audiences",
          description: "`any` prompts suit everyone and appear under every `for` filter, so `any` itself is not filterable.",
          responses: { "200": json(listOf("Audience"), "Every audience, with counts."), "429": errors["429"] },
        },
      },
      "/tools": {
        get: {
          tags: ["Filters"],
          operationId: "listTools",
          summary: "AI tools",
          description: "`meta.untagged` counts prompts tagged with no tool: they work anywhere and appear under every `ai` filter.",
          responses: {
            "200": json(
              {
                type: "object",
                required: ["data", "meta"],
                properties: {
                  data: { type: "array", items: ref("Tool") },
                  meta: { type: "object", properties: { untagged: { type: "integer" } } },
                },
              },
              "Every AI tool, with counts.",
            ),
            "429": errors["429"],
          },
        },
      },
      "/tags": {
        get: {
          tags: ["Filters"],
          operationId: "listTags",
          summary: "Tags",
          responses: { "200": json(listOf("Tag"), "Every tag in use, most used first."), "429": errors["429"] },
        },
      },
      "/export.json": {
        get: {
          tags: ["Downloads"],
          operationId: "exportJson",
          summary: "Every prompt as JSON",
          description: "The whole collection in one file, in the same shape as `/prompts`. Cached for an hour.",
          responses: {
            "200": json(
              {
                type: "object",
                required: ["data", "meta"],
                properties: {
                  data: { type: "array", items: ref("Prompt") },
                  meta: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      generatedAt: { type: "string", format: "date-time" },
                      licence: { type: "object", properties: { name: { type: "string" }, url: { type: "string" } } },
                      attribution: { type: "string" },
                    },
                  },
                },
              },
              "All prompts.",
            ),
            "429": errors["429"],
          },
        },
      },
      "/export.csv": {
        get: {
          tags: ["Downloads"],
          operationId: "exportCsv",
          summary: "Every prompt as CSV",
          description:
            "The collection as a spreadsheet (UTF-8 with a byte-order mark). List fields are joined with ` | `; `image` is the first sample's URL.",
          responses: {
            "200": { description: "A CSV file.", content: { "text/csv": { schema: { type: "string" } } } },
            "429": errors["429"],
          },
        },
      },
      "/images/{id}": {
        get: {
          tags: ["Images"],
          operationId: "getImage",
          summary: "A sample image",
          description: "Image bytes (usually WebP), cached for a year. Use the `url` the prompt gives you.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "The image.",
              content: { "image/webp": {}, "image/*": {} },
            },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": errors["429"],
          },
        },
      },
    },
    components: {
      parameters: {
        id: {
          name: "id",
          in: "path",
          required: true,
          description: "The prompt's id, e.g. `golden-hour-saree`.",
          schema: { type: "string", pattern: "^[a-z0-9-]+$" },
          example: "golden-hour-saree",
        },
        q: {
          name: "q",
          in: "query",
          description: "Words to search for in the title, summary, prompt, notes, tags and tool names.",
          schema: { type: "string", maxLength: 100 },
          example: "saree",
        },
        category: {
          name: "category",
          in: "query",
          description: "What the prompt makes.",
          schema: { type: "string", enum: [...CATEGORIES] },
        },
        for: {
          name: "for",
          in: "query",
          description:
            "Who it is for. Also includes prompts that suit anyone, ranked after the exact matches. `audience` is accepted as an alias; giving both with different values is a `400`.",
          schema: { type: "string", enum: [...AUDIENCE_FILTERS] },
        },
        ai: {
          name: "ai",
          in: "query",
          description:
            "The AI tool you will paste into. Also includes prompts tagged with no tool, ranked after. `tool` is accepted as an alias; giving both with different values is a `400`.",
          schema: { type: "string", enum: [...AI_TOOLS] },
        },
        tag: {
          name: "tag",
          in: "query",
          description: "A tag, as listed by `/tags`. One that normalizes to nothing (such as `#`) is a `400`.",
          schema: { type: "string" },
          example: "photo-edit",
        },
        featured: {
          name: "featured",
          in: "query",
          description: "`true` for editor's picks only. `favorites` (the site's name) is accepted as an alias.",
          schema: { type: "string", enum: ["true", "false", "1", "0"] },
        },
        audience: {
          name: "audience",
          in: "query",
          deprecated: true,
          description: "Alias of `for`.",
          schema: { type: "string", enum: [...AUDIENCE_FILTERS] },
        },
        tool: {
          name: "tool",
          in: "query",
          deprecated: true,
          description: "Alias of `ai`.",
          schema: { type: "string", enum: [...AI_TOOLS] },
        },
        favorites: {
          name: "favorites",
          in: "query",
          deprecated: true,
          description: "Alias of `featured`.",
          schema: { type: "string", enum: ["true", "false", "1", "0"] },
        },
        sort: {
          name: "sort",
          in: "query",
          description: "Order of results.",
          schema: { type: "string", enum: [...SORTS], default: "most-copied" },
        },
        limit: {
          name: "limit",
          in: "query",
          description: "Page size.",
          schema: { type: "integer", minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
        },
        cursor: {
          name: "cursor",
          in: "query",
          description: "`meta.nextCursor` from the previous page, as given.",
          schema: { type: "string" },
        },
      },
      responses: {
        BadRequest: json(ref("Error"), "A parameter is not valid (`invalid_parameter`)."),
        NotFound: json(ref("Error"), "Nothing has that id (`not_found`)."),
        TooManyRequests: {
          ...json(ref("Error"), "Over the fair-use rate (`rate_limited`)."),
          headers: {
            "Retry-After": { description: "Seconds to wait.", schema: { type: "integer" } },
          },
        },
        ServerError: json(ref("Error"), "Something failed on our side (`server_error`); try again shortly."),
      },
      schemas: {
        Prompt: {
          type: "object",
          required: [
            "id", "url", "title", "summary", "prompt", "placeholders", "notes", "category",
            "audience", "tools", "tags", "source", "featured", "copies", "image",
            "createdAt", "updatedAt",
          ],
          properties: {
            id: { type: "string", example: "golden-hour-saree" },
            url: { type: "string", format: "uri", description: "The prompt's page — link here when you credit it." },
            title: { type: "string", example: "Golden Hour Saree" },
            summary: { type: "string" },
            prompt: { type: "string", description: "The text to paste into an AI tool." },
            placeholders: {
              type: "array",
              items: { type: "string" },
              description: "The `[bracketed]` parts meant to be changed, without brackets.",
              example: ["deep red"],
            },
            notes: { type: "string", description: "Tips — often “attach your photo first”." },
            category: { type: "string", enum: [...CATEGORIES] },
            audience: { type: "string", enum: [...AUDIENCES] },
            tools: {
              type: "array",
              items: { type: "string", enum: [...AI_TOOLS] },
              description: "Tools it is known to work in. Empty means any.",
            },
            tags: { type: "array", items: { type: "string" } },
            source: { type: "string", description: "Credit for prompts from elsewhere; empty when original." },
            featured: { type: "boolean", description: "An editor's pick." },
            copies: { type: "integer", description: "Times copied on the site." },
            image: { oneOf: [ref("Image"), { type: "null" }], description: "The first sample image." },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PromptWithImages: {
          allOf: [
            ref("Prompt"),
            {
              type: "object",
              required: ["images"],
              properties: { images: { type: "array", items: ref("Image") } },
            },
          ],
        },
        Image: {
          type: "object",
          required: ["url", "width", "height", "caption"],
          properties: {
            url: { type: "string", format: "uri" },
            width: { type: ["integer", "null"] },
            height: { type: ["integer", "null"] },
            caption: { type: "string" },
          },
        },
        ListMeta: {
          type: "object",
          required: ["total", "limit", "nextCursor"],
          properties: {
            total: { type: "integer", description: "Prompts matching, across all pages." },
            limit: { type: "integer" },
            nextCursor: { type: ["string", "null"], description: "Pass as `cursor` for the next page; null on the last." },
          },
        },
        Category: labelled([...CATEGORIES]),
        Audience: {
          ...labelled([...AUDIENCES]),
          required: ["id", "label", "count", "filterable"],
          properties: {
            ...labelled([...AUDIENCES]).properties,
            filterable: { type: "boolean", description: "Whether `for` accepts it." },
          },
        },
        Tool: labelled([...AI_TOOLS]),
        Tag: {
          type: "object",
          required: ["id", "count"],
          properties: { id: { type: "string" }, count: { type: "integer" } },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  enum: ["invalid_parameter", "not_found", "no_match", "rate_limited", "server_error"],
                },
                message: { type: "string" },
                param: { type: "string", description: "The parameter at fault, for `invalid_parameter`." },
                allowed: { type: "array", items: { type: "string" }, description: "Values it accepts." },
                retryAfter: { type: "integer", description: "Seconds to wait, for `rate_limited`." },
              },
            },
          },
        },
      },
    },
  };

  // Any route can fail on our side; every one answers in the same error shape.
  for (const path of Object.values(spec.paths)) {
    for (const operation of Object.values(path)) {
      (operation.responses as Record<string, unknown>)["500"] = { $ref: "#/components/responses/ServerError" };
    }
  }
  return spec;
}

function listOf(schema: string) {
  return {
    type: "object",
    required: ["data"],
    properties: { data: { type: "array", items: ref(schema) } },
  };
}

function labelled(ids: string[]) {
  return {
    type: "object",
    required: ["id", "label", "count"],
    properties: {
      id: { type: "string", enum: ids },
      label: { type: "string" },
      count: { type: "integer" },
    },
  };
}
