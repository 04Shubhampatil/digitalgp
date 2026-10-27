import type { PublicPageDto } from "@/types/api";
import type { UiLocale } from "@/i18n/config";
import { HeroSection } from "./HeroSection";
import { LeadersSection } from "./LeadersSection";
import { QuickLinksSection } from "./QuickLinksSection";
import { QuickStatsSection } from "./QuickStatsSection";
import { WelcomeSection } from "./WelcomeSection";

export interface SectionProps {
  slug: string;
  locale: UiLocale;
  /** Published section JSON; shape is defined by the backend registry (src/config/sections.ts). */
  data: Record<string, unknown>;
}

/**
 * Renderer per backend `sectionKey`. Unknown keys render nothing (a new backend section must get a
 * component here before it shows up). Data is already validated by the backend on write, so the
 * components read it loosely and defensively.
 */
const RENDERERS: Record<string, (props: SectionProps) => React.ReactNode> = {
  hero: HeroSection,
  "quick-stats": QuickStatsSection,
  welcome: WelcomeSection,
  leaders: LeadersSection,
  "quick-links": QuickLinksSection,
  // about page
  overview: WelcomeSection,
};

export function renderSections(page: PublicPageDto, slug: string, locale: UiLocale): React.ReactNode[] {
  return page.sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const Section = RENDERERS[s.sectionKey];
      return Section ? <Section key={s.sectionKey} slug={slug} locale={locale} data={s.data} /> : null;
    });
}
