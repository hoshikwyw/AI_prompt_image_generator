/**
 * What the route handlers share, so every endpoint answers in the same shape:
 * errors are `{ error }` with a status, and nothing about the collection is
 * cached by the browser or a CDN.
 */

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status });

/**
 * The request body as JSON, or a 400 to send straight back. Used the same way
 * as `requireAdmin`:
 *
 *   const body = await readJson(request);
 *   if (body instanceof Response) return body;
 *
 * Parsed JSON is never a Response, so the check cannot misfire.
 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return errorResponse("Expected a JSON body.", 400);
  }
}
