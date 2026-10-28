import { shareCard } from "@/lib/share-card";

/** GET /og — the site's link preview: what a shared link to the library shows. */
export function GET() {
  return shareCard({
    title: "Ready-to-copy AI image prompts",
    subtitle: "For ChatGPT, Gemini, Midjourney and more — pick who it’s for, copy, paste.",
  });
}
