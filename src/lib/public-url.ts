/**
 * Public address of a website for links in the admin app ("Preview website", "View site").
 *
 * `<slug>.<APP_BASE_HOST>` only works when the base host has a wildcard domain (e.g. `*.digitalgp.in`). Platform
 * hosts such as `digitalgp.vercel.app` cannot have sub-subdomains (the connection is closed), and `localhost` has
 * none, so those get the path address `/<slug>`, which every deployment serves.
 */
const NO_WILDCARD_HOST = /(^|\.)(localhost|vercel\.app|netlify\.app|onrender\.com)$/i;

export function publicSiteUrl(slug: string, baseHost: string | undefined = process.env.APP_BASE_HOST): string {
  const host = baseHost?.trim().toLowerCase().replace(/:\d+$/, "");
  if (!host || NO_WILDCARD_HOST.test(host)) return `/${slug}`;
  return `https://${slug}.${host}`;
}
