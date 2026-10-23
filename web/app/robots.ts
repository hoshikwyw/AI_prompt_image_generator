import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The library and prompt pages are for everyone, search engines included. The
 * admin and editing screens are not worth indexing, and the API is not a page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/prompts/new", "/prompts/*/edit"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
