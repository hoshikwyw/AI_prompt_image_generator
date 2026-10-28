import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPromptbookServer } from "@/lib/mcp-server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/mcp — the Model Context Protocol endpoint (Streamable HTTP).
 *
 * Stateless: every request gets a fresh server and transport, answers with
 * plain JSON, and keeps nothing afterwards. That is what serverless hosting
 * needs — no session to find again on another instance, no stream held open
 * against a function timeout. MCP clients handle a sessionless server fine.
 */

// Open CORS like the rest of the public API, plus the headers MCP clients send
// and read, so browser-based clients and inspectors work too.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
} as const;

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** A JSON-RPC error, the only error shape an MCP client knows how to read. */
function rpcError(status: number, code: number, message: string, headers: Record<string, string> = {}, data?: unknown) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message, ...(data !== undefined && { data }) }, id: null }),
    { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request: Request) {
  // One request, one message. JSON-RPC batching was dropped from MCP in the
  // 2025-06-18 revision, but the SDK still accepts arrays of up to 100 — which
  // would let a single rate-limited request run a hundred tool calls.
  const head = (await request.clone().text()).trimStart();
  if (head.startsWith("[")) {
    return rpcError(400, -32600, "Batched requests are not supported; send one JSON-RPC message per request.");
  }

  const limited = await checkRateLimit(request, "mcp");
  if (limited) {
    return rpcError(
      429,
      -32000,
      `Rate limited: try again in ${limited.retryAfter} seconds.`,
      rateLimitHeaders(limited),
      { retryAfter: limited.retryAfter },
    );
  }

  const server = createPromptbookServer(new URL(request.url).origin);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(request));
  } finally {
    // The JSON reply is complete by now; nothing outlives the request.
    await server.close();
  }
}

/**
 * Streamable HTTP uses GET to open a server-to-client event stream and DELETE
 * to end a session. A stateless JSON server has neither, and the spec's answer
 * for that is 405 — clients then simply carry on with POST.
 */
function methodNotAllowed() {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed: this MCP server takes POST only." },
      id: null,
    }),
    { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS", "Content-Type": "application/json" } },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
