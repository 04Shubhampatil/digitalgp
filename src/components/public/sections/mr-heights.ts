import type { CSSProperties } from "react";

/**
 * Marathi text takes fewer lines than the English on small screens, so some blocks come out shorter than their
 * English twin. These are the blocks that differ (measured on the live site at 375px and 768px, every block more
 * than ~12px shorter in Marathi): in Marathi they keep at least the English height, so the two languages lay out
 * alike. Values are CSS pixels; `sm` is the phone (under 640px), `md` the tablet (768–900px). Desktop is unchanged.
 * Re-measure when a block's content changes a lot.
 */
const HEIGHTS: Record<string, Record<string, { sm?: number; md?: number }>> = {
  home: { banner: { sm: 818 }, "about-cards": { sm: 2137, md: 1717 }, "whats-new": { sm: 1760 }, weather: { sm: 900 }, "welcome-video": { sm: 1082 }, notices: { sm: 1199 } },
  about: {
    banner: { sm: 636, md: 846 },
    "about-history": { sm: 1702, md: 1127 },
    "about-structure": { sm: 1872 },
    "about-roles": { sm: 1997, md: 1100 },
    "about-emergency": { sm: 1309 },
    "about-vision": { sm: 988, md: 774 },
    leaders: { sm: 1898, md: 1759 },
  },
  projects: {
    banner: { sm: 810 },
    "quick-stats": { md: 268 },
    "project-showcase": { sm: 1599, md: 1103 },
    "before-after": { sm: 1090 },
    "progress-tracker": { sm: 1409, md: 1154 },
    "dev-timeline": { sm: 928, md: 710 },
    "stories-figma": { sm: 842, md: 460 },
    "cta-banner": { sm: 329, md: 223 },
  },
  services: { banner: { sm: 691, md: 868 }, "rts-grid": { sm: 1542 } },
  schemes: { banner: { sm: 739 }, "link-cards": { sm: 1118 }, "success-stories": { sm: 498, md: 468 } },
  infrastructure: {
    banner: { sm: 776, md: 896 },
    "facility-grid": { sm: 1970, md: 1036 },
    "infra-map": { sm: 699 },
    "status-cards": { sm: 1851, md: 790 },
    "latest-announcements": { sm: 1846 },
  },
  finance: {
    banner: { sm: 767, md: 875 },
    "income-sources": { sm: 1492, md: 1126 },
    expenditure: { sm: 1599, md: 1193 },
    "budget-visualizer": { md: 1043 },
    documents: { md: 525 },
  },
  announcements: { banner: { sm: 666, md: 868 } },
  culture: {
    "village-intro": { sm: 842, md: 622 },
    "culture-cards": { sm: 1621 },
    homestay: { md: 682 },
    "leader-cards": { sm: 873 },
    "fpo-gallery-voice": { sm: 1418 },
    "success-stories": { sm: 1271 },
  },
  education: {
    banner: { sm: 716, md: 893 },
    "support-cards": { sm: 849, md: 513 },
    "student-spotlight": { sm: 1361, md: 784 },
    "youth-posts": { sm: 843 },
    "scheme-cards": { sm: 1353, md: 738 },
    "success-stories": { sm: 1562, md: 1083 },
  },
  employment: {
    banner: { sm: 798, md: 905 },
    "support-cards": { sm: 828, md: 496 },
    "local-opportunities": { sm: 660 },
    "skill-directory": { sm: 1779 },
    "training-programs": { sm: 1192 },
    "success-stories": { sm: 1516, md: 909 },
  },
  contact: {
    banner: { sm: 753 },
    callout: { sm: 304, md: 144 },
    partners: { sm: 1018, md: 713 },
    "volunteer-categories": { sm: 1415, md: 785 },
    "volunteer-registration": { sm: 842 },
  },
  environment: {
    banner: { sm: 788, md: 952 },
    "key-initiatives": { sm: 1016, md: 530 },
    "green-scoreboard": { sm: 925, md: 646 },
    "tree-adoption": { sm: 929 },
    "sustainability-initiatives": { sm: 1852, md: 1072 },
    "market-prices": { sm: 965 },
  },
  gallery: {
    banner: { sm: 701, md: 849 },
    "photo-gallery": { sm: 1537 },
    "video-gallery": { sm: 815 },
    "press-coverage": { sm: 1218, md: 780 },
    "then-and-now": { sm: 528 },
    "mini-documentary": { sm: 553, md: 629 },
  },
  // The list of every success story (src/app/(public)/[tenant]/success-stories/page.tsx), not a page of sections.
  "success-stories": { list: { sm: 3149, md: 3368 } },
  grievance: {
    banner: { sm: 799, md: 930 },
    callout: { sm: 368 },
    "grievance-register": { md: 686 },
    "monthly-report": { sm: 869 },
  },
};

/** Classes that turn the variables below into minimum heights (phone and tablet only). */
export const MR_MIN_HEIGHT_CLASS = "max-sm:min-h-[var(--mh-sm)] md:max-[900px]:min-h-[var(--mh-md)] empty:!min-h-0";

/** Minimum heights (as CSS variables) of a block in Marathi, or undefined when it has none. */
export function marathiMinHeights(slug: string, pageKey: string, sectionKey: string, locale: string): CSSProperties | undefined {
  // The numbers were measured on the Savardari website; another website has its own content and heights.
  if (locale !== "mr" || slug !== "savardari") return undefined;
  const h = HEIGHTS[pageKey]?.[sectionKey];
  if (!h) return undefined;
  return { ...(h.sm ? { "--mh-sm": `${h.sm}px` } : {}), ...(h.md ? { "--mh-md": `${h.md}px` } : {}) } as CSSProperties;
}
