/**
 * A brief message at the foot of the screen, from anywhere in the client.
 *
 * An event rather than a context: the one `<Toaster>` in the root layout
 * listens, so a card does not need a provider above it, and two quick copies
 * replace one message instead of stacking two.
 */
export const TOAST_EVENT = "promptbook:toast";

export type ToastTone = "success" | "error";

export interface ToastDetail {
  message: string;
  tone: ToastTone;
}

/** `tone` picks the icon: a failure used to arrive under a green success tick. */
export function showToast(message: string, tone: ToastTone = "success") {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, tone } }));
}
