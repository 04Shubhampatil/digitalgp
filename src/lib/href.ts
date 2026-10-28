import { isPageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";

/**
 * Resolve a link from section content for the current website.
 * "page:<pageKey>" points at one of the website's own pages (used by placeholder content so it
 * works for any slug). Everything else is returned unchanged.
 */
export function resolveHref(href: string, slug: string): string {
  if (href.startsWith("page:")) {
    const key = href.slice("page:".length);
    return isPageKey(key) ? pageHref(slug, key) : `/${slug}`;
  }
  return href;
}
