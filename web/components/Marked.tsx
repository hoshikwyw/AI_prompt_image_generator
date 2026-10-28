import type { ReactNode } from "react";

/**
 * Text with each case-insensitive match of `query` marked, so a search shows
 * at a glance why each card is there. Plain string matching, as the search
 * itself does — never a RegExp built from what was typed.
 */
export default function Marked({ text, query }: { text: string; query?: string }) {
  const q = query?.trim().toLowerCase();
  if (!q) return text;
  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  let from = 0;
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="search-hit">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
  }
  parts.push(text.slice(from));
  return parts;
}
