/**
 * The site's public origin, for anything that must be an absolute URL: link
 * previews, the sitemap, robots.txt. SITE_URL when set; on Vercel, the
 * production domain it provides; otherwise the dev server.
 */
export const SITE_URL =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
