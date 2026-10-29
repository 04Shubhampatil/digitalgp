import type { PublicPageDto } from "@/types/api";
import type { UiLocale } from "@/i18n/config";
import { AboutEmergencySection, AboutHeroSection, AboutHistorySection, AboutRolesSection, AboutStructureSection, AboutVisionSection } from "./AboutFigma";
import { BeforeAfterSection, CtaBannerSection, DevTimelineSection, FinancialOverviewSection, ImpactGridSection, FacilityGridSection, ImageCropsSection, ProgressTrackerSection, ProjectShowcaseSection, SuccessStoriesSection } from "./PageKit";
import { LinkCardsSection, MediaCardsSection, StatCardsSection, TileGridSection, VideoFeatureSection } from "./PageKit2";
import { CalloutSection, GrievanceRegisterSection, GrievanceTrackSection } from "./GrievanceSections";
import { ContactCardsSection, ContactFeedbackSection, VolunteerFormSection } from "./ContactSections";
import { AchievementsSection, WhatsNewSection } from "./HomeFeedSections";
import { SchemeLevelsSection, SchemeShowcaseSection } from "./PageKit3";
import { ActionCardsSection, AnnounceCategoriesSection, AnnounceFeedSection, DeadlinesDownloadsSection, HelpCardSection, RtsGridSection, ServiceStripSection } from "./PageKit4";
import { AboutCardsSection } from "./AboutCardsSection";
import { AssistanceItemsSection, BannerSection, CmsSuccessStoriesSection, LocalOpportunitiesSection, SchemeCardsSection, SupportCardsSection, TopStatsSection, TrainingProgramsSection } from "./cms/common";
import {
  BudgetVisualizerSection,
  DocumentsSection,
  ExpenditureSection,
  IncomeSourcesSection,
  GreenScoreboardSection,
  InfraMapSection,
  LatestAnnouncementsCard,
  MapFiltersSection,
  MarketPricesSection,
  StatusCardsSection,
  SustainabilityInitiativesSection,
  TreeAdoptionSection,
  UpcomingEventsCard,
  WeatherUpdateSection,
} from "./cms/data";
import {
  CmsContactCardsSection,
  ComplaintFormSection,
  EscalationMatrixSection,
  FeedbackFormSection,
  HelpSection,
  OfficeLocationSection,
  PartnersSection,
  QrCodesSection,
  ServiceCategoriesSection,
  ServiceLinksSection,
  TrackComplaintSection,
  VolunteerCategoriesSection,
  VolunteerRegistrationSection,
} from "./cms/forms";
import {
  AnnouncementCategoriesSection,
  CalendarSection,
  CultureCardsSection,
  DeadlineCardsSection,
  DownloadFormsSection,
  FpoGalleryVoiceSection,
  HeritageCardsSection,
  HomestaySection,
  JobPortalsSection,
  LeaderCardsSection,
  LiveAnnouncementsSection,
  MiniDocumentarySection,
  PhotoGallerySection,
  PressCoverageSection,
  SkillDirectorySection,
  StudentSpotlightSection,
  ThenAndNowSection,
  VideoGallerySection,
  VillageIntroSection,
  YouthPostsSection,
  YouthSpeakTabsSection,
} from "./cms/pages";
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
  /** Data of the other published sections of the same page, by section key (e.g. form categories). */
  siblings?: Record<string, Record<string, unknown>>;
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
  // Figma placeholder blocks that share a name with a backend section key keep their own renderer key.
  "stories-figma": SuccessStoriesSection,
  "cta-banner": CtaBannerSection,
  "facility-grid": FacilityGridSection,
  "image-crops": ImageCropsSection,
  "announce-categories": AnnounceCategoriesSection,
  "announce-feed": AnnounceFeedSection,
  "deadlines-downloads": DeadlinesDownloadsSection,
  "service-strip": ServiceStripSection,
  "rts-grid": RtsGridSection,
  "action-cards": ActionCardsSection,
  "help-card": HelpCardSection,
  "scheme-levels": SchemeLevelsSection,
  "scheme-showcase": SchemeShowcaseSection,
  callout: CalloutSection,
  "contact-cards-figma": ContactCardsSection,
  "contact-feedback": ContactFeedbackSection,
  "volunteer-form": VolunteerFormSection,
  "grievance-register": GrievanceRegisterSection,
  "grievance-track": GrievanceTrackSection,
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
  achievements: AchievementsSection,
  "whats-new": WhatsNewSection,
  weather: WeatherSection,
  "sarpanch-message": SarpanchMessageSection,
  "welcome-video": WelcomeVideoSection,
  "monthly-metrics": MonthlyMetricsSection,
  "village-progress": VillageProgressSection,
  "ward-details": WardDetailsSection,
  leaders: LeadersSection,
  notices: NoticesSection,
  "quick-links": QuickLinksSection,
  // backend sections of the other pages (src/config/sections-pages.ts)
  banner: BannerSection,
  "top-stats": TopStatsSection,
  "green-scoreboard": GreenScoreboardSection,
  "support-cards": SupportCardsSection,
  "local-opportunities": LocalOpportunitiesSection,
  "assistance-items": AssistanceItemsSection,
  "success-stories": CmsSuccessStoriesSection,
  "training-programs": TrainingProgramsSection,
  "scheme-cards": SchemeCardsSection,
  "infra-map": InfraMapSection,
  "map-filters": MapFiltersSection,
  "status-cards": StatusCardsSection,
  "latest-announcements": LatestAnnouncementsCard,
  "upcoming-events": UpcomingEventsCard,
  "income-sources": IncomeSourcesSection,
  expenditure: ExpenditureSection,
  "budget-visualizer": BudgetVisualizerSection,
  documents: DocumentsSection,
  "tree-adoption": TreeAdoptionSection,
  "sustainability-initiatives": SustainabilityInitiativesSection,
  "market-prices": MarketPricesSection,
  "weather-update": WeatherUpdateSection,
  "service-links": ServiceLinksSection,
  "service-categories": ServiceCategoriesSection,
  "qr-codes": QrCodesSection,
  help: HelpSection,
  "complaint-form": ComplaintFormSection,
  "track-complaint": TrackComplaintSection,
  "escalation-matrix": EscalationMatrixSection,
  "contact-cards": CmsContactCardsSection,
  "office-location": OfficeLocationSection,
  "feedback-form": FeedbackFormSection,
  partners: PartnersSection,
  "volunteer-categories": VolunteerCategoriesSection,
  "volunteer-registration": VolunteerRegistrationSection,
  "village-intro": VillageIntroSection,
  "heritage-cards": HeritageCardsSection,
  "culture-cards": CultureCardsSection,
  homestay: HomestaySection,
  "leader-cards": LeaderCardsSection,
  "fpo-gallery-voice": FpoGalleryVoiceSection,
  "skill-directory": SkillDirectorySection,
  "job-portals": JobPortalsSection,
  "student-spotlight": StudentSpotlightSection,
  "youth-speak-tabs": YouthSpeakTabsSection,
  "youth-posts": YouthPostsSection,
  "announcement-categories": AnnouncementCategoriesSection,
  "live-announcements": LiveAnnouncementsSection,
  calendar: CalendarSection,
  "deadline-cards": DeadlineCardsSection,
  "download-forms": DownloadFormsSection,
  "photo-gallery": PhotoGallerySection,
  "video-gallery": VideoGallerySection,
  "press-coverage": PressCoverageSection,
  "then-and-now": ThenAndNowSection,
  "mini-documentary": MiniDocumentarySection,
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
  { keys: ["achievements", "whats-new"], cols: "lg:grid-cols-2" },
  { keys: ["weather", "sarpanch-message"], cols: "lg:grid-cols-2" },
  { keys: ["welcome-video", "village-progress"], cols: "lg:grid-cols-2" },
  { keys: ["latest-announcements", "upcoming-events"], cols: "lg:grid-cols-2" },
  { keys: ["market-prices", "weather-update"], cols: "lg:grid-cols-2" },
  { keys: ["office-location", "feedback-form"], cols: "lg:grid-cols-2" },
  { keys: ["live-announcements", "calendar"], cols: "lg:grid-cols-[minmax(0,1fr)_340px]" },
  { keys: ["deadline-cards", "download-forms"], cols: "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" },
];
const GROUPED = new Set(ROW_GROUPS.flatMap((g) => g.keys));

export function renderSections(page: PublicPageDto, slug: string, locale: UiLocale, tenantName?: string): React.ReactNode[] {
  const sorted = page.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const out: React.ReactNode[] = [];
  const done = new Set<string>();
  const siblings = Object.fromEntries(sorted.map((s) => [s.sectionKey, s.data]));
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
              return <Card key={m.sectionKey} slug={slug} locale={locale} data={m.data} tenantName={tenantName} siblings={siblings} />;
            })}
          </div>
        </section>,
      );
      continue;
    }
    out.push(<Section key={`${s.sectionKey}-${s.sortOrder}`} slug={slug} locale={locale} data={s.data} tenantName={tenantName} siblings={siblings} />);
  }
  return out;
}
