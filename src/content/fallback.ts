import type { PageKey } from "@/config/pages";
import type { PublicPageDto } from "@/types/api";
import { FIGMA_ABOUT_SECTIONS } from "./figma-about";
import { FIGMA_HOME_SECTIONS } from "./figma-home";
import { FIGMA_PAGE_SECTIONS } from "./figma-pages";
import { FIGMA_PAGE_SECTIONS_B } from "./figma-pages-b";
import { FIGMA_PAGE_SECTIONS_C } from "./figma-pages-c";
import { PAGE_SECTIONS } from "@/config/sections-pages";
import { FIGMA_PAGE_SECTIONS_D } from "./figma-pages-d";

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
  ...FIGMA_PAGE_SECTIONS_D,
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
type Obj = Record<string, unknown>;
const labelOf = (v: unknown): string => {
  const o = v as { en?: string } | undefined;
  return (o?.en ?? "").trim().toLowerCase();
};

/**
 * Fill presentation-only labels (captions, link labels) that a published section left out, using the
 * Figma placeholder for the same section. Values and data rows are never copied: only text that
 * describes a row the backend already has (matched by its English label), or a missing section link.
 */
function fillLabels(sectionKey: string, data: Obj, fallback: Obj): Obj {
  if (sectionKey === "monthly-metrics") {
    const items = (data.items as Obj[] | undefined) ?? [];
    const base = new Map(((fallback.items as Obj[] | undefined) ?? []).map((i) => [labelOf(i.label), i]));
    return {
      ...data,
      period: data.period ?? fallback.period,
      items: items.map((i) => {
        const match = base.get(labelOf(i.label));
        return match?.caption && !i.caption ? { ...i, caption: match.caption } : i;
      }),
    };
  }
  if (sectionKey === "ward-details") return { ...data, viewAll: data.viewAll ?? fallback.viewAll };
  return data;
}

/**
 * Blocks added in "published content" mode: real data that is not an editable section (e.g. the
 * announcements module's live list). They carry no placeholder values.
 */
const LIVE_EXTRAS: Partial<Record<PageKey, FallbackSection[]>> = {
  announcements: [{ sectionKey: "live-announcements", sortOrder: 15, data: {} }],
};

/**
 * Pages whose sections are managed in the admin (sections-pages.ts). While nothing of the page is
 * published the Figma placeholder page is shown; as soon as one section is published the page shows
 * only published content (no placeholders mixed in), so a half-finished page never shows sample data.
 */
function hasPublishedCms(pageKey: PageKey, published: { sectionKey: string }[]): boolean {
  const keys = new Set((PAGE_SECTIONS[pageKey] ?? []).map((s) => s.key));
  return keys.size > 0 && published.some((s) => keys.has(s.sectionKey));
}

export function withFallback(pageKey: PageKey, page: PublicPageDto | null): PublicPageDto {
  const cms = hasPublishedCms(pageKey, page?.sections ?? []);
  const fallbacks = cms ? (LIVE_EXTRAS[pageKey] ?? []) : (FALLBACK_SECTIONS[pageKey] ?? []);
  const published = (page?.sections ?? []).map((s) => {
    const f = fallbacks.find((x) => x.sectionKey === s.sectionKey);
    return f ? { ...s, data: fillLabels(s.sectionKey, s.data as Obj, f.data) } : s;
  });
  const have = new Set(published.map((s) => s.sectionKey));
  const extra = fallbacks
    .filter((s) => !have.has(s.sectionKey) && !(s.skipIfPresent ?? []).some((k) => have.has(k)))
    .map((s) => ({ sectionKey: s.sectionKey, sortOrder: s.sortOrder, data: s.data, publishedAt: null }));
  const order = (s: { sectionKey: string; sortOrder: number }) => (pageKey === "home" ? (HOME_ORDER[s.sectionKey] ?? s.sortOrder) : s.sortOrder);
  return {
    pageKey,
    seo: page?.seo ?? { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null },
    sections: [...published, ...extra].map((s) => ({ ...s, sortOrder: order(s) })).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
