/**
 * Copying text to the clipboard, with the fallbacks the modern API needs.
 *
 * `navigator.clipboard` only exists in a secure context, so it is missing over
 * plain http — a LAN preview, an IP address, an old browser. Since handing
 * someone a prompt is the entire point of this app, a failure there cannot be
 * the end of the road: the deprecated `execCommand` path still works in most of
 * those places, and if even that fails the caller shows the text so it can be
 * copied by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context — try the old way instead.
  }

  // select() moves focus into the helper field, and removing it then dropped
  // focus to the page top — a keyboard user lost their place on every copy.
  const focused = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.setAttribute("readonly", "");
    // Off-screen rather than hidden: display:none cannot be selected, and iOS
    // refuses to copy from an element it does not consider visible.
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    document.body.appendChild(area);

    area.select();
    // iOS Safari ignores select() on a readonly field without this.
    area.setSelectionRange(0, text.length);

    if (document.execCommand("copy")) return true;
  } catch {
    // Nothing left to try; the caller falls back to showing the text.
  } finally {
    // Also when execCommand throws, which used to leave the field behind.
    area.remove();
    focused?.focus?.({ preventScroll: true });
  }

  return false;
}
