import type { PageKey } from "@/config/pages";
import type { PublicPageDto } from "@/types/api";
import { FIGMA_ABOUT_SECTIONS } from "./figma-about";
import { FIGMA_HOME_SECTIONS } from "./figma-home";
import { FIGMA_PAGE_SECTIONS } from "./figma-pages";
import { FIGMA_PAGE_SECTIONS_B } from "./figma-pages-b";

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
  return {
    pageKey,
    seo: page?.seo ?? { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null },
    sections: [...published, ...extra].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
