import type { PageKey } from "@/config/pages";
import type { PublicPageDto } from "@/types/api";
import { FIGMA_ABOUT_SECTIONS } from "./figma-about";
import { FIGMA_HOME_SECTIONS } from "./figma-home";
import { FIGMA_PAGE_SECTIONS } from "./figma-pages";
import { FIGMA_PAGE_SECTIONS_B } from "./figma-pages-b";
import { FIGMA_PAGE_SECTIONS_C } from "./figma-pages-c";

/** A section as the public site receives it, before backend data exists. */
export interface FallbackSection {
  sectionKey: string;
  sortOrder: number;
  data: Record<string, unknown>;
  /** Skip this placeholder when the backend has published any of these section keys. */
  skipIfPresent?: string[];
}

/**
 * Figma placeholder sections per page. Published backend sections always take precedence; a
 * fallback is used only for a section key the backend has not published. Remove an entry to stop
 * showing its placeholder.
 */
export const FALLBACK_SECTIONS: Partial<Record<PageKey, FallbackSection[]>> = {
  home: FIGMA_HOME_SECTIONS,
  about: FIGMA_ABOUT_SECTIONS,
  ...FIGMA_PAGE_SECTIONS,
  ...FIGMA_PAGE_SECTIONS_B,
  ...FIGMA_PAGE_SECTIONS_C,
};

/**
 * Home page section order from the Figma design. Backend sort orders are overridden for these
 * keys so the page always follows the design (hero → stats → Citizen Services → About → indicators
 * → achievements → weather → welcome → leaders → notices).
 */
const HOME_ORDER: Record<string, number> = {
  hero: 0,
  "quick-stats": 10,
  "quick-links": 15,
  welcome: 20,
  "about-cards": 20,
  "monthly-metrics": 22,
  "ward-details": 23,
  achievements: 28,
  "whats-new": 29,
  weather: 30,
  "sarpanch-message": 31,
  "welcome-video": 34,
  "village-progress": 35,
  leaders: 45,
  notices: 50,
};

/**
 * Merge published backend sections with Figma placeholders for the same page.
 * Returns a page-shaped object so the existing renderers need no change.
 */
export function withFallback(pageKey: PageKey, page: PublicPageDto | null): PublicPageDto {
  const published = page?.sections ?? [];
  const have = new Set(published.map((s) => s.sectionKey));
  const extra = (FALLBACK_SECTIONS[pageKey] ?? [])
    .filter((s) => !have.has(s.sectionKey) && !(s.skipIfPresent ?? []).some((k) => have.has(k)))
    .map((s) => ({ sectionKey: s.sectionKey, sortOrder: s.sortOrder, data: s.data, publishedAt: null }));
  const order = (s: { sectionKey: string; sortOrder: number }) => (pageKey === "home" ? (HOME_ORDER[s.sectionKey] ?? s.sortOrder) : s.sortOrder);
  return {
    pageKey,
    seo: page?.seo ?? { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null },
    sections: [...published, ...extra].map((s) => ({ ...s, sortOrder: order(s) })).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
