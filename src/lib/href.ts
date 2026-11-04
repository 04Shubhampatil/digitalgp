import { isPageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";

/**
 * Resolve a link from section content for the current website.
 * "page:<pageKey>" points at one of the website's own pages (used by placeholder content so it
 * works for any slug). Everything else is returned unchanged.
 */
export function resolveHref(href: string, slug: string): string {
  if (href.startsWith("page:")) {
    // "page:grievance#grievance-track" jumps to that section on the page (sections carry id=sectionKey).
    const [key = "", anchor] = href.slice("page:".length).split("#");
    const base = isPageKey(key) ? pageHref(slug, key) : `/${slug}`;
    return anchor ? `${base}#${anchor}` : base;
  }
  return href;
}

/** Detail pages of published records (src/app/(public)/[tenant]/{projects,schemes,announcements,success-stories}/[id]). */
export type DetailKind = "projects" | "schemes" | "announcements" | "success-stories";
export function detailHref(slug: string, kind: DetailKind, id: string): string {
  return `/${slug}/${kind}/${encodeURIComponent(id)}`;
}
