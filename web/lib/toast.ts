/**
 * A brief message at the foot of the screen, from anywhere in the client.
 *
 * An event rather than a context: the one `<Toaster>` in the root layout
 * listens, so a card does not need a provider above it, and two quick copies
 * replace one message instead of stacking two.
 */
export const TOAST_EVENT = "promptbook:toast";

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
