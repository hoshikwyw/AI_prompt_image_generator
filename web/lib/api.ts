/**
 * Calling our own API from the browser.
 *
 * Every route answers an error as `{ error }` (see lib/http.ts), so a failed
 * request becomes an `ApiError` whose message is ready to show as it is. The
 * status and body ride along for the cases that need more — the prompt form
 * reads field errors off a 422.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  // A 204, or an error page from the host rather than from our routes, has no
  // JSON body — that must not turn into a parse error that hides the status.
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    throw new ApiError(typeof message === "string" ? message : `HTTP ${res.status}`, res.status, body);
  }
  return body as T;
}

/** A request init carrying `data` as JSON, with the header the routes expect. */
export const sendJson = (method: "POST" | "PATCH", data: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

/** A DELETE where "already gone" counts as success — it is the outcome asked for. */
export async function deleteResource(url: string): Promise<void> {
  try {
    await fetchJson(url, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }
}

/**
 * Counts a copy of a prompt. Fire and forget: the text is already on the
 * clipboard, so a lost count is not worth interrupting anyone over, and
 * `keepalive` lets the request finish even if the page is left straight away.
 */
export function recordCopy(promptId: string): void {
  void fetch(`/api/prompts/${promptId}/copy`, { method: "POST", keepalive: true }).catch(() => {});
}

/** For a catch block: the message to show, whatever was thrown. */
export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;
