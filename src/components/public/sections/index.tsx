import type { PublicPageDto } from "@/types/api";
import type { UiLocale } from "@/i18n/config";
import { AboutEmergencySection, AboutHeroSection, AboutHistorySection, AboutRolesSection, AboutStructureSection, AboutVisionSection } from "./AboutFigma";
import { BeforeAfterSection, CtaBannerSection, DevTimelineSection, FinancialOverviewSection, ImpactGridSection, FacilityGridSection, ImageCropsSection, ProgressTrackerSection, ProjectShowcaseSection, SuccessStoriesSection } from "./PageKit";
import { LinkCardsSection, MediaCardsSection, StatCardsSection, TileGridSection, VideoFeatureSection } from "./PageKit2";
import { AboutCardsSection } from "./AboutCardsSection";
import { GeographySection, HistorySection, MembersSection, OfficeSection } from "./AboutSections";
import { HeroSection } from "./HeroSection";
import { MonthlyMetricsSection, SarpanchMessageSection, VillageProgressSection, WardDetailsSection, WeatherSection, WelcomeVideoSection } from "./HomeExtras";
import { LeadersSection } from "./LeadersSection";
import { NoticesSection } from "./NoticesSection";
import { QuickLinksSection } from "./QuickLinksSection";
import { QuickStatsSection } from "./QuickStatsSection";
import { WelcomeSection } from "./WelcomeSection";

export interface SectionProps {
  slug: string;
  /** Display name of the website in the active language (e.g. for the hero eyebrow). */
  tenantName?: string;
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
  "about-cards": AboutCardsSection,
  "about-hero": AboutHeroSection,
  "page-hero": AboutHeroSection,
  "project-showcase": ProjectShowcaseSection,
  "before-after": BeforeAfterSection,
  "progress-tracker": ProgressTrackerSection,
  "impact-grid": ImpactGridSection,
  "dev-timeline": DevTimelineSection,
  "financial-overview": FinancialOverviewSection,
  "success-stories": SuccessStoriesSection,
  "cta-banner": CtaBannerSection,
  "facility-grid": FacilityGridSection,
  "image-crops": ImageCropsSection,
  "stat-cards": StatCardsSection,
  "tile-grid": TileGridSection,
  "link-cards": LinkCardsSection,
  "media-cards": MediaCardsSection,
  "video-feature": VideoFeatureSection,
  "about-history": AboutHistorySection,
  "about-structure": AboutStructureSection,
  "about-roles": AboutRolesSection,
  "about-emergency": AboutEmergencySection,
  "about-vision": AboutVisionSection,
  weather: WeatherSection,
  "sarpanch-message": SarpanchMessageSection,
  "welcome-video": WelcomeVideoSection,
  "monthly-metrics": MonthlyMetricsSection,
  "village-progress": VillageProgressSection,
  "ward-details": WardDetailsSection,
  leaders: LeadersSection,
  notices: NoticesSection,
  "quick-links": QuickLinksSection,
  // about page
  overview: WelcomeSection,
  history: HistorySection,
  geography: GeographySection,
  members: MembersSection,
  office: OfficeSection,
};

/** Sections that share one two-column row (card renderers only; the wrapper supplies the layout). */
const ROW_GROUPS: { keys: string[]; cols: string }[] = [
  { keys: ["monthly-metrics", "ward-details"], cols: "lg:grid-cols-[683px_minmax(0,1fr)]" },
  { keys: ["progress-tracker", "impact-grid"], cols: "lg:grid-cols-[567px_minmax(0,1fr)]" },
  { keys: ["dev-timeline", "financial-overview"], cols: "lg:grid-cols-[601px_minmax(0,1fr)]" },
  { keys: ["weather", "sarpanch-message"], cols: "lg:grid-cols-2" },
  { keys: ["welcome-video", "village-progress"], cols: "lg:grid-cols-2" },
];
const GROUPED = new Set(ROW_GROUPS.flatMap((g) => g.keys));

export function renderSections(page: PublicPageDto, slug: string, locale: UiLocale, tenantName?: string): React.ReactNode[] {
  const sorted = page.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const out: React.ReactNode[] = [];
  const done = new Set<string>();
  for (const s of sorted) {
    if (done.has(s.sectionKey)) continue;
    const Section = RENDERERS[s.sectionKey];
    if (!Section) continue;
    if (GROUPED.has(s.sectionKey)) {
      const grp = ROW_GROUPS.find((g) => g.keys.includes(s.sectionKey))!;
      const group = grp.keys;
      const members = sorted.filter((m) => group.includes(m.sectionKey) && RENDERERS[m.sectionKey]);
      members.forEach((m) => done.add(m.sectionKey));
      out.push(
        <section key={group.join("+")} className="bg-cream py-8">
          <div className={`mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-8 ${grp.cols} lg:gap-[20px] lg:px-[60px] [&>*:only-child]:lg:col-span-full`}>
            {members.map((m) => {
              const Card = RENDERERS[m.sectionKey]!;
              return <Card key={m.sectionKey} slug={slug} locale={locale} data={m.data} tenantName={tenantName} />;
            })}
          </div>
        </section>,
      );
      continue;
    }
    out.push(<Section key={`${s.sectionKey}-${s.sortOrder}`} slug={slug} locale={locale} data={s.data} tenantName={tenantName} />);
  }
  return out;
}
