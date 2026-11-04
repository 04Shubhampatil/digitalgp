/**
 * Registry of the public website pages (requirements §5 + circular §16).
 * `Page.pageKey` and `Announcement.displayPages` reference these keys.
 */
export const PAGE_KEYS = [
  "home",
  "about",
  "projects",
  "schemes",
  "announcements",
  "infrastructure",
  "finance",
  "services",
  "culture",
  "employment",
  "education",
  "grievance",
  "environment",
  "gallery",
  "contact",
  "progress", // circular §16 "My Village, My Progress" — enable per tenant if required
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export function isPageKey(value: string): value is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(value);
}

/** Pages created for every new tenant website: all keys get a row so admins can enable optional ones. */
export const DEFAULT_PAGE_KEYS: readonly PageKey[] = PAGE_KEYS;

/** Optional pages: their row is created disabled and the public API answers 404 until an admin enables it. */
export const OPTIONAL_PAGE_KEYS: readonly PageKey[] = ["progress"];
