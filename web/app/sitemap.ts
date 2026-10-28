import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listPrompts } from "@/lib/store";

/**
 * Rendered per request rather than cached at build time: with Supabase, prompts
 * are added after a deploy, and a build-time list would never show them.
 */
export const dynamic = "force-dynamic";

/** Every prompt page, so search engines find prompts the library only links by script. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prompts = await listPrompts();
  const newest = prompts.reduce((max, p) => (p.updatedAt > max ? p.updatedAt : max), "");

  return [
    { url: SITE_URL, lastModified: newest || undefined, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/api`, changeFrequency: "monthly", priority: 0.5 },
    ...prompts.map((p) => ({
      url: `${SITE_URL}/prompts/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
