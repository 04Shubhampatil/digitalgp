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

/** Pages created for every new tenant website (the 15-page template). */
export const DEFAULT_PAGE_KEYS: readonly PageKey[] = PAGE_KEYS.filter((k) => k !== "progress");
