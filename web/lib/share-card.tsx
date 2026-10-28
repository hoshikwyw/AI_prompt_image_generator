import { ImageResponse } from "next/og";
import { ACCENTS } from "./prompt";

/**
 * The picture a shared link unfurls into — in chats, on social sites — for
 * pages that have no picture of their own: the site itself, and prompts with
 * no sample yet. Without one, those links arrived as a bare line of text.
 */

export const SHARE_SIZE = { width: 1200, height: 630 } as const;

/** The card colours, as the hex values Tailwind gives their class names. */
const ACCENT_HEX: Record<(typeof ACCENTS)[number], [string, string]> = {
  "from-stone-400 to-stone-600": ["#a8a29e", "#57534e"],
  "from-amber-700 to-yellow-900": ["#b45309", "#713f12"],
  "from-sky-400 to-indigo-600": ["#38bdf8", "#4f46e5"],
  "from-fuchsia-500 to-cyan-500": ["#d946ef", "#06b6d4"],
  "from-teal-500 to-blue-700": ["#14b8a6", "#1d4ed8"],
  "from-slate-500 to-slate-700": ["#64748b", "#334155"],
  "from-rose-500 to-orange-600": ["#f43f5e", "#ea580c"],
  "from-emerald-500 to-lime-700": ["#10b981", "#4d7c0f"],
};

/** The site's own colours, from its icon. */
const BRAND: [string, string] = ["#7c8cff", "#f472b6"];

/**
 * The bundled font covers Latin, Greek and Cyrillic. Text in other scripts —
 * Burmese, Chinese — would come out as empty boxes, so a card shows the
 * site's line in its place rather than a row of squares.
 */
const renderable = (text: string) => /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{N}\p{P}\p{S}\s]*$/u.test(text);

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function shareCard({
  title,
  subtitle,
  eyebrow,
  accent,
}: {
  title: string;
  subtitle?: string;
  /** A short line above the title: "Portrait · For women". */
  eyebrow?: string;
  accent?: string;
}): ImageResponse {
  const [from, to] = ACCENT_HEX[accent as keyof typeof ACCENT_HEX] ?? BRAND;
  const heading = renderable(title) ? clip(title, 70) : "A ready-to-copy AI image prompt";
  const sub = subtitle && renderable(subtitle) ? clip(subtitle, 110) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#ffffff",
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34 }}>
          {/* The icon's speech bubble, drawn plainly so it reads at any size. */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: `linear-gradient(135deg, ${BRAND[0]}, ${BRAND[1]})`,
              boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 28,
                borderRadius: 12,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              {/* The face from the icon: without it the bubble read as a toggle. */}
              <div style={{ width: 6, height: 6, borderRadius: 3, background: "#3b1a78" }} />
              <div style={{ width: 6, height: 6, borderRadius: 3, background: "#3b1a78" }} />
            </div>
          </div>
          Promptbook
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && (
            <div style={{ fontSize: 28, opacity: 0.85, letterSpacing: 0.5 }}>{eyebrow}</div>
          )}
          <div style={{ fontSize: heading.length > 40 ? 64 : 80, lineHeight: 1.08, letterSpacing: -1.5 }}>
            {heading}
          </div>
          {sub && <div style={{ fontSize: 32, lineHeight: 1.3, opacity: 0.9 }}>{sub}</div>}
        </div>
      </div>
    ),
    {
      ...SHARE_SIZE,
      // Titles can be edited, so not the year-long default: a day at the CDN.
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
