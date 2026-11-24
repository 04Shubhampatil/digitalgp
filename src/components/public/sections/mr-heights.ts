import type { CSSProperties } from "react";

/**
 * Marathi text takes fewer lines than the English on small screens, so some blocks come out shorter than their
 * English twin. These are the blocks with the biggest differences (measured on the live site at 375px and 768px,
 * only the ones more than ~90px shorter): in Marathi they keep at least the English height, so the two languages
 * lay out alike. Values are CSS pixels; `sm` is the phone (under 640px), `md` the tablet (640–1023px). Desktop is
 * unchanged. Re-measure when a block's content changes a lot.
 */
const HEIGHTS: Record<string, Record<string, { sm?: number; md?: number }>> = {
  home: { banner: { sm: 818 }, "about-cards": { sm: 2137, md: 1717 }, "whats-new": { sm: 1760 }, weather: { sm: 900 }, notices: { sm: 1199 } },
  about: { "about-structure": { sm: 1872 }, "about-roles": { sm: 1997 }, "about-vision": { sm: 988 }, leaders: { sm: 1898 } },
  projects: { banner: { sm: 810 }, "stories-figma": { sm: 842, md: 460 } },
  services: { "rts-grid": { sm: 1542 } },
  schemes: { banner: { sm: 739 } },
  infrastructure: { banner: { sm: 776, md: 896 }, "infra-map": { sm: 699 }, "latest-announcements": { sm: 1846 } },
  finance: { banner: { sm: 767, md: 875 }, "income-sources": { sm: 1492, md: 1126 }, expenditure: { sm: 1599, md: 1193 } },
  culture: { "leader-cards": { sm: 873 }, "fpo-gallery-voice": { sm: 1418 } },
  education: { "support-cards": { sm: 849 }, "scheme-cards": { sm: 1353 } },
  employment: { banner: { sm: 798 }, "support-cards": { sm: 828 }, "skill-directory": { sm: 1779 }, "farmer-assistance": { sm: 839 }, "training-programs": { sm: 1192 } },
  contact: { banner: { sm: 753 }, callout: { sm: 304 }, partners: { sm: 1018 }, "volunteer-categories": { sm: 1415 } },
  environment: { banner: { sm: 788 }, "key-initiatives": { sm: 1016, md: 530 }, "sustainability-initiatives": { sm: 1852, md: 1072 }, "market-prices": { sm: 965 } },
  gallery: { banner: { sm: 701 }, "video-gallery": { sm: 815 } },
  grievance: { banner: { sm: 799 }, callout: { sm: 368 } },
};

/** Classes that turn the variables below into minimum heights (phone and tablet only). */
export const MR_MIN_HEIGHT_CLASS = "max-sm:min-h-[var(--mh-sm)] sm:max-lg:min-h-[var(--mh-md)] empty:!min-h-0";

/** Minimum heights (as CSS variables) of a block in Marathi, or undefined when it has none. */
export function marathiMinHeights(slug: string, pageKey: string, sectionKey: string, locale: string): CSSProperties | undefined {
  // The numbers were measured on the Savardari website; another website has its own content and heights.
  if (locale !== "mr" || slug !== "savardari") return undefined;
  const h = HEIGHTS[pageKey]?.[sectionKey];
  if (!h) return undefined;
  return { ...(h.sm ? { "--mh-sm": `${h.sm}px` } : {}), ...(h.md ? { "--mh-md": `${h.md}px` } : {}) } as CSSProperties;
}
