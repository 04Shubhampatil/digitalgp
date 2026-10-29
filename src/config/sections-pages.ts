import { z } from "zod";
import type { PageKey } from "@/config/pages";
import {
  SOCIAL_REEL_HOSTS,
  YOUTUBE_HOSTS,
  amount,
  bannerSchema,
  bilingualLongSchema,
  bilingualSchema,
  clockTime,
  colour,
  email,
  hostAllowed,
  href,
  httpsUrl,
  iconName,
  isoDate,
  isoDateTime,
  mapEmbedUrl,
  mediaId,
  mediaIdList,
  order,
  percent,
  phone,
  supportCardItem,
  text,
  topStatItem,
  videoUrl,
  type SectionDefinition,
} from "@/config/section-primitives";

/**
 * Section registry for the public pages other than Home and About (see sections.ts).
 * Source: docs/admin-editor-backend-needs.md. Shapes that repeat across pages are defined once.
 *
 * Rules enforced here: enums and bounds on every field, https-only external links, provider
 * domains for videos and reels, Maps embeds only, amounts as decimal strings, and guardian consent
 * for sections that show identifiable children (checked when a draft is submitted for review).
 * Rules that need other endpoints (computed statistics, public submit forms, weather fetching) are
 * listed in docs/admin-editor-backend-needs.md and are not part of these schemas.
 */

const sectionList = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);
const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

// ---------------------------------------------------------------------------
// Shared sections
// ---------------------------------------------------------------------------

const topStats = strict({ items: sectionList(topStatItem, 8) });

const supportCards = strict({ items: sectionList(supportCardItem, 12) });

const successStories = strict({
  items: sectionList(
    strict({
      imageId: mediaId.optional(),
      title: bilingualSchema,
      description: bilingualSchema.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      order,
    }),
    30,
  ),
});

const trainingPrograms = strict({
  items: sectionList(
    strict({
      thumbnailImageId: mediaId.optional(),
      title: bilingualSchema,
      shortDescription: bilingualSchema.optional(),
      ctaText: bilingualSchema.optional(),
      ctaLink: href.optional(),
      order,
      status: z.enum(["active", "inactive"]),
      featured: z.boolean(),
    }),
    50,
  ),
});

const iconCardList = (max: number) => strict({ items: sectionList(strict({ icon: iconName, title: bilingualSchema, link: href.optional(), active: z.boolean() }), max) });

// ---------------------------------------------------------------------------
// Village Infrastructure
// ---------------------------------------------------------------------------

const infrastructure: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "top-stats", sortOrder: 5, schema: topStats },
  {
    key: "infra-map",
    sortOrder: 10,
    schema: strict({
      zoom: z.number().int().min(1).max(20),
      mapType: z.enum(["satellite", "roadmap"]),
      showZoomControls: z.boolean(),
      showLegend: z.boolean(),
      enableWardClick: z.boolean(),
      showWardBoundary: z.boolean(),
      fullscreenControl: z.boolean(),
      height: z.number().int().min(200).max(1200),
      mapImageId: mediaId.optional(),
      markers: sectionList(
        strict({
          title: bilingualSchema,
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          icon: iconName.optional(),
          ward: text(40).optional(),
        }),
        100,
      ),
    }),
  },
  {
    key: "map-filters",
    sortOrder: 20,
    schema: strict({
      items: sectionList(strict({ icon: iconName, name: bilingualSchema, colour, visible: z.boolean() }), 20),
    }),
  },
  {
    key: "status-cards",
    sortOrder: 30,
    schema: strict({
      items: sectionList(
        strict({
          icon: iconName,
          title: bilingualSchema,
          smallLabel: bilingualSchema.optional(),
          primaryValue: text(60),
          statusText: bilingualSchema.optional(),
          bottomLabel: bilingualSchema.optional(),
          bottomValue: text(60).optional(),
          buttonText: bilingualSchema.optional(),
          buttonLink: href.optional(),
          theme: z.enum(["blue", "orange", "green"]),
        }),
        12,
      ),
    }),
  },
  {
    key: "latest-announcements",
    sortOrder: 40,
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      items: sectionList(strict({ icon: iconName, title: bilingualSchema, date: text(60) }), 10),
    }),
  },
  {
    key: "upcoming-events",
    sortOrder: 50,
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      items: sectionList(strict({ icon: iconName, title: bilingualSchema, date: text(60) }), 10),
    }),
  },
];

// ---------------------------------------------------------------------------
// Finance & Budget
// ---------------------------------------------------------------------------

const supportCard = strict({
  enabled: z.boolean(),
  icon: iconName,
  title: bilingualSchema,
  description: bilingualSchema.optional(),
  buttonText: bilingualSchema.optional(),
  buttonLink: href.optional(),
});

const finance: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "top-stats", sortOrder: 5, schema: topStats },
  {
    key: "income-sources",
    sortOrder: 10,
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      // Percentages should total 100; the editor shows the running total.
      categories: sectionList(strict({ name: bilingualSchema, amount, percentage: percent }), 20),
      supportCard: supportCard.optional(),
    }),
  },
  {
    key: "expenditure",
    sortOrder: 20,
    schema: strict({
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      backgroundColour: colour,
      categories: sectionList(strict({ name: bilingualSchema, amount, percentage: percent, colour }), 20),
      sideCard: supportCard.optional(),
    }),
  },
  {
    key: "budget-visualizer",
    sortOrder: 30,
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      backgroundColour: colour,
      tabs: sectionList(strict({ name: bilingualSchema, enabled: z.boolean() }), 10),
      overviewCard: strict({
        title: bilingualSchema,
        fields: sectionList(
          strict({
            label: bilingualSchema,
            valueType: z.enum(["dynamic", "auto"]),
            prefixSuffix: text(20).optional(),
            colour,
          }),
          10,
        ),
      }),
      barChart: sectionList(strict({ label: bilingualSchema, value: amount, colour }), 24),
      downloadReport: strict({
        enabled: z.boolean(),
        buttonText: bilingualSchema,
        fileId: mediaId.optional(),
        icon: iconName,
      }),
    }),
  },
  {
    key: "documents",
    sortOrder: 40,
    schema: strict({
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      description: bilingualSchema.optional(),
      backgroundColour: colour,
      items: sectionList(strict({ title: bilingualSchema, fileId: mediaId, buttonText: bilingualSchema.optional() }), 50),
    }),
  },
];

// ---------------------------------------------------------------------------
// Citizen Services & Form
// ---------------------------------------------------------------------------

const services: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "service-links",
    sortOrder: 10,
    schema: strict({
      items: sectionList(
        strict({ icon: iconName, title: bilingualSchema, description: bilingualSchema.optional(), href, visible: z.boolean() }),
        30,
      ),
    }),
  },
  {
    key: "service-categories",
    sortOrder: 20,
    schema: strict({
      items: sectionList(
        strict({
          icon: iconName,
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          features: sectionList(bilingualSchema, 4),
          buttonText: bilingualSchema.optional(),
          buttonLink: href.optional(),
          accentColour: colour,
        }),
        12,
      ),
    }),
  },
  {
    key: "qr-codes",
    sortOrder: 30,
    // Only the link is stored: the QR image is generated from `linkUrl`, never uploaded.
    schema: strict({
      items: sectionList(
        strict({
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          serviceIcon: iconName,
          buttonText: bilingualSchema.optional(),
          linkUrl: httpsUrl,
        }),
        12,
      ),
    }),
  },
  { key: "top-stats", sortOrder: 40, schema: topStats },
  {
    key: "help",
    sortOrder: 50,
    schema: strict({
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      imageId: mediaId.optional(),
      contact: sectionList(strict({ phone: phone.optional(), email: email.optional(), hours: text(120).optional() }), 10),
      faqs: sectionList(strict({ question: bilingualSchema, answer: bilingualLongSchema }), 30),
    }),
  },
];

// ---------------------------------------------------------------------------
// Grievance & Feedback
// ---------------------------------------------------------------------------

const grievance: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "complaint-form",
    sortOrder: 10,
    // Enforced by the grievance submit endpoint: recipient, upload limits and CAPTCHA.
    schema: strict({
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      successMessage: bilingualSchema,
      submitButtonText: bilingualSchema,
      recipientEmail: email,
      captchaEnabled: z.boolean(),
      allowFileUpload: z.boolean(),
      maxFileSizeMb: z.number().int().min(1).max(10),
      allowedFileTypes: z.array(z.enum(["pdf", "jpg", "jpeg", "png", "webp"])).max(5),
    }),
  },
  { key: "support-cards", sortOrder: 20, schema: supportCards },
  {
    key: "track-complaint",
    sortOrder: 30,
    schema: strict({
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      searchLabel: bilingualSchema,
      placeholder: bilingualSchema.optional(),
      buttonText: bilingualSchema,
      noResultMessage: bilingualSchema,
      errorMessage: bilingualSchema,
    }),
  },
  {
    key: "escalation-matrix",
    sortOrder: 40,
    schema: strict({
      steps: sectionList(strict({ title: bilingualSchema, description: bilingualSchema.optional() }), 10),
      statusSummary: sectionList(strict({ label: bilingualSchema, colour }), 10),
    }),
  },
  {
    key: "monthly-report",
    sortOrder: 50,
    // Figures are computed from complaint records; this section stores labels and colours only.
    schema: strict({
      heading: bilingualSchema,
      cardLabels: strict({
        total: bilingualSchema,
        resolved: bilingualSchema,
        pending: bilingualSchema,
        resolutionRate: bilingualSchema,
      }),
      categoryColours: sectionList(strict({ category: text(60), colour }), 12),
    }),
  },
];

// ---------------------------------------------------------------------------
// Our Village — Culture
// ---------------------------------------------------------------------------

const culture: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "village-intro",
    sortOrder: 10,
    schema: strict({
      iconId: mediaId.optional(),
      title: bilingualSchema,
      description: bilingualSchema.optional(),
      buttonLabel: bilingualSchema.optional(),
      buttonLink: href.optional(),
    }),
  },
  {
    key: "heritage-cards",
    sortOrder: 20,
    schema: strict({
      items: sectionList(strict({ title: bilingualSchema, description: bilingualSchema.optional(), imageId: mediaId.optional() }), 20),
    }),
  },
  {
    key: "culture-cards",
    sortOrder: 30,
    schema: strict({
      enabled: z.boolean(),
      items: sectionList(strict({ title: bilingualSchema, description: bilingualSchema.optional(), imageId: mediaId.optional() }), 12),
    }),
  },
  {
    key: "homestay",
    sortOrder: 40,
    schema: strict({
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      buttonLabel: bilingualSchema.optional(),
      buttonLink: href.optional(),
      imageId: mediaId.optional(),
      features: sectionList(strict({ icon: iconName, title: bilingualSchema }), 8),
    }),
  },
  { key: "training-programs", sortOrder: 50, schema: trainingPrograms },
  {
    key: "leader-cards",
    sortOrder: 60,
    schema: strict({
      items: sectionList(
        strict({
          photoId: mediaId.optional(),
          name: bilingualSchema,
          designation: bilingualSchema.optional(),
          description: bilingualSchema.optional(),
        }),
        20,
      ),
    }),
  },
  {
    key: "fpo-gallery-voice",
    sortOrder: 70,
    schema: strict({
      enabled: z.boolean(),
      fpo: strict({
        iconId: mediaId.optional(),
        title: bilingualSchema,
        description: bilingualSchema.optional(),
        points: sectionList(bilingualSchema, 10),
      }),
      gallery: strict({
        title: bilingualSchema,
        description: bilingualSchema.optional(),
        imageIds: mediaIdList(30),
      }),
      voice: strict({
        title: bilingualSchema,
        description: bilingualSchema.optional(),
        videoId: mediaId.optional(),
        videoUrl: videoUrl.optional(),
      }),
    }),
  },
  { key: "success-stories", sortOrder: 80, schema: successStories },
];

// ---------------------------------------------------------------------------
// Employment & Skills
// ---------------------------------------------------------------------------

const employment: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "support-cards", sortOrder: 10, schema: supportCards },
  { key: "local-opportunities", sortOrder: 20, schema: supportCards },
  {
    key: "skill-directory",
    sortOrder: 30,
    schema: strict({
      items: sectionList(
        strict({
          icon: iconName,
          skillName: bilingualSchema,
          availableCount: z.number().int().min(0).max(100_000).optional(),
          // Counts from a typed-in list are approximate until a real directory exists.
          countIsApproximate: z.boolean(),
          link: href.optional(),
          active: z.boolean(),
        }),
        30,
      ),
    }),
  },
  { key: "assistance-items", sortOrder: 40, schema: iconCardList(30) },
  { key: "training-programs", sortOrder: 50, schema: trainingPrograms },
  {
    key: "job-portals",
    sortOrder: 60,
    schema: strict({
      items: sectionList(
        strict({
          logoId: mediaId.optional(),
          name: bilingualSchema,
          description: bilingualSchema.optional(),
          websiteUrl: httpsUrl,
          order,
          active: z.boolean(),
        }),
        30,
      ),
    }),
  },
  { key: "success-stories", sortOrder: 70, schema: successStories },
];

// ---------------------------------------------------------------------------
// Education & Youth Corner
// ---------------------------------------------------------------------------

/** Guardian consent: a child's photo, name, class and school may only be submitted with consent. */
const guardianConsent = strict({
  confirmed: z.boolean(),
  confirmedBy: text(120),
  confirmedAt: isoDateTime,
});

const requireGuardianConsent = (data: unknown) => {
  const parsed = data as { guardianConsent?: { confirmed?: boolean } };
  if (parsed.guardianConsent?.confirmed !== true) {
    throw new Error("Guardian consent must be confirmed before this section can be submitted for review");
  }
};

const YOUTH_POST_TYPES = ["blog", "youtube", "reel", "idea"] as const;

const education: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "support-cards", sortOrder: 10, schema: supportCards },
  {
    key: "student-spotlight",
    sortOrder: 20,
    schema: strict({
      photoId: mediaId.optional(),
      name: bilingualSchema,
      classAndSchool: bilingualSchema.optional(),
      achievements: bilingualLongSchema.optional(),
      quote: bilingualSchema.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      achievementCards: sectionList(strict({ icon: iconName, title: bilingualSchema, value: text(40) }), 6),
      guardianConsent: guardianConsent.optional(),
    }),
    submitCheck: requireGuardianConsent,
  },
  {
    key: "youth-speak-tabs",
    sortOrder: 30,
    schema: strict({ items: sectionList(strict({ tabKey: text(40), name: bilingualSchema, active: z.boolean() }), 10) }),
  },
  {
    key: "youth-posts",
    sortOrder: 40,
    schema: strict({
      items: sectionList(
        strict({
          tabKey: text(40),
          type: z.enum(YOUTH_POST_TYPES),
          title: bilingualSchema,
          coverImageId: mediaId.optional(),
          url: href.optional(),
        }).superRefine((post, ctx) => {
          if (!post.url) return;
          if (post.type === "youtube" && !hostAllowed(post.url, YOUTUBE_HOSTS)) {
            ctx.addIssue({ code: "custom", path: ["url"], message: "YouTube posts need a youtube.com or youtu.be link" });
          }
          if (post.type === "reel" && !hostAllowed(post.url, SOCIAL_REEL_HOSTS)) {
            ctx.addIssue({ code: "custom", path: ["url"], message: "Reels must link to YouTube, Instagram or Facebook" });
          }
        }),
        300,
      ),
    }),
  },
  {
    key: "scheme-cards",
    sortOrder: 50,
    schema: strict({
      items: sectionList(
        strict({
          icon: iconName,
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          buttonText: bilingualSchema.optional(),
          buttonLink: href.optional(),
          active: z.boolean(),
        }),
        30,
      ),
    }),
  },
  { key: "success-stories", sortOrder: 60, schema: successStories },
];

// ---------------------------------------------------------------------------
// Environment & Sustainability
// ---------------------------------------------------------------------------

const environment: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "top-stats", sortOrder: 5, schema: topStats },
  {
    key: "green-scoreboard",
    sortOrder: 10,
    schema: strict({
      items: sectionList(strict({ icon: iconName, title: bilingualSchema, value: text(40), description: bilingualSchema.optional(), visible: z.boolean() }), 12),
    }),
  },
  {
    key: "tree-adoption",
    sortOrder: 20,
    schema: strict({
      enabled: z.boolean(),
      title: bilingualSchema,
      description: bilingualSchema.optional(),
      bullets: sectionList(bilingualSchema, 8),
      illustrationId: mediaId.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      stats: sectionList(strict({ icon: iconName, title: bilingualSchema, value: text(40), subText: bilingualSchema.optional() }), 6),
    }),
  },
  {
    key: "sustainability-initiatives",
    sortOrder: 30,
    schema: strict({
      items: sectionList(strict({ imageId: mediaId.optional(), title: bilingualSchema, description: bilingualSchema.optional(), active: z.boolean() }), 30),
    }),
  },
  {
    key: "market-prices",
    sortOrder: 40,
    schema: strict({
      title: bilingualSchema,
      lastUpdatedAt: isoDateTime,
      marketName: bilingualSchema.optional(),
      currency: z.string().trim().min(3).max(10).default("INR"),
      rows: sectionList(
        strict({
          commodity: bilingualSchema,
          unit: text(20),
          minPrice: z.number().min(0),
          maxPrice: z.number().min(0),
          modalPrice: z.number().min(0),
        }).refine((r) => r.minPrice <= r.modalPrice && r.modalPrice <= r.maxPrice, {
          message: "Prices must satisfy min ≤ modal ≤ max",
          path: ["modalPrice"],
        }),
        50,
      ),
      note: bilingualSchema.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
    }),
  },
  {
    key: "weather-update",
    sortOrder: 50,
    // Manual fallback: the preferred source is a cached server-side fetch (not implemented yet).
    schema: strict({
      title: bilingualSchema,
      location: bilingualSchema.optional(),
      current: strict({
        temperature: text(20),
        humidity: text(20),
        wind: text(40),
        feelsLike: text(20),
        condition: bilingualSchema,
      }),
      forecast: sectionList(strict({ date: isoDate, icon: iconName, maxTemp: text(20), minTemp: text(20) }), 10),
    }),
  },
];

// ---------------------------------------------------------------------------
// Announcements & Circulars
// ---------------------------------------------------------------------------

const announcements: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "top-stats", sortOrder: 5, schema: topStats },
  {
    key: "announcement-categories",
    sortOrder: 10,
    schema: strict({ items: sectionList(strict({ label: bilingualSchema, icon: iconName }), 12) }),
  },
  {
    key: "calendar",
    sortOrder: 20,
    schema: strict({
      title: bilingualSchema,
      defaultMonthView: z.enum(["current", "custom"]),
      defaultMonth: z.string().trim().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM").optional(),
      eventsToShow: z.number().int().min(1).max(10),
      visible: z.boolean(),
      events: sectionList(
        strict({
          date: isoDate,
          title: bilingualSchema,
          colour,
          startTime: clockTime.optional(),
          endTime: clockTime.optional(),
        }),
        100,
      ),
    }),
  },
  {
    key: "deadline-cards",
    sortOrder: 30,
    schema: strict({ items: sectionList(strict({ icon: iconName, date: text(60), title: bilingualSchema, subtitle: bilingualSchema.optional() }), 20) }),
  },
  {
    key: "download-forms",
    sortOrder: 40,
    schema: strict({
      items: sectionList(strict({ icon: iconName, name: bilingualSchema, description: bilingualSchema.optional(), fileId: mediaId }), 50),
    }),
  },
  { key: "support-cards", sortOrder: 50, schema: supportCards },
];

// ---------------------------------------------------------------------------
// Gallery & Media
// ---------------------------------------------------------------------------

const gallery: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "photo-gallery",
    sortOrder: 10,
    schema: strict({
      categories: sectionList(strict({ key: text(40), name: bilingualSchema, order }), 20),
      photos: sectionList(
        strict({
          imageId: mediaId,
          title: bilingualSchema.optional(),
          categoryKey: text(40),
          date: isoDate.optional(),
          order,
        }),
        500,
      ),
    }),
  },
  {
    key: "video-gallery",
    sortOrder: 20,
    schema: strict({
      items: sectionList(
        strict({
          thumbnailId: mediaId.optional(),
          title: bilingualSchema,
          videoUrl,
          date: isoDate.optional(),
          duration: text(20).optional(),
          order,
        }),
        100,
      ),
    }),
  },
  {
    key: "press-coverage",
    sortOrder: 30,
    schema: strict({
      items: sectionList(
        strict({
          logoId: mediaId.optional(),
          mediaName: text(120),
          title: bilingualSchema,
          date: isoDate,
          url: httpsUrl,
          order,
        }),
        50,
      ),
    }),
  },
  {
    key: "then-and-now",
    sortOrder: 40,
    schema: strict({
      heading: bilingualSchema,
      autoPlay: z.boolean(),
      transitionMs: z.number().int().min(500).max(10_000),
      comparisons: sectionList(
        strict({ beforeImageId: mediaId, afterImageId: mediaId, heading: bilingualSchema, order }),
        20,
      ),
    }),
  },
  {
    key: "mini-documentary",
    sortOrder: 50,
    schema: strict({
      heading: bilingualSchema,
      title: bilingualSchema,
      description: bilingualSchema.optional(),
      source: z.enum(["upload", "link"]),
      videoId: mediaId.optional(),
      videoUrl: videoUrl.optional(),
      publishedDate: isoDate,
      playback: strict({ autoplay: z.boolean(), controls: z.boolean(), muted: z.boolean(), loop: z.boolean() }),
      autoThumbnail: z.boolean(),
    }).superRefine((d, ctx) => {
      if (d.source === "upload" && !d.videoId) ctx.addIssue({ code: "custom", path: ["videoId"], message: "Upload a video or switch to a link" });
      if (d.source === "link" && !d.videoUrl) ctx.addIssue({ code: "custom", path: ["videoUrl"], message: "Add a YouTube or Vimeo link" });
    }),
  },
];

// ---------------------------------------------------------------------------
// Contact & Collaboration
// ---------------------------------------------------------------------------

const contact: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "contact-cards",
    sortOrder: 10,
    schema: strict({
      items: sectionList(
        strict({
          iconId: mediaId.optional(),
          title: bilingualSchema,
          details: bilingualSchema.optional(),
          socialLinks: sectionList(strict({ label: text(40), url: httpsUrl }), 6),
        }),
        12,
      ),
    }),
  },
  {
    key: "office-location",
    sortOrder: 20,
    schema: strict({
      title: bilingualSchema,
      address: bilingualSchema.optional(),
      mapEmbedUrl: mapEmbedUrl.optional(),
    }),
  },
  {
    key: "feedback-form",
    sortOrder: 30,
    // Submit endpoint, rate limit and CAPTCHA are part of the public form endpoint (not built yet).
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      recipientEmail: email,
      notificationEmail: email.optional(),
      successMessage: bilingualSchema,
      autoReply: bilingualSchema.optional(),
      submitButtonText: bilingualSchema,
      showOnWebsite: z.boolean(),
    }),
  },
  {
    key: "partners",
    sortOrder: 40,
    schema: strict({
      items: sectionList(
        strict({
          logoId: mediaId.optional(),
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          partnerLogoIds: mediaIdList(30),
        }),
        50,
      ),
    }),
  },
  {
    key: "volunteer-categories",
    sortOrder: 50,
    schema: strict({ items: sectionList(strict({ title: bilingualSchema, order }), 30) }),
  },
  {
    key: "volunteer-registration",
    sortOrder: 60,
    schema: strict({
      enabled: z.boolean(),
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      deadline: isoDate.optional(),
      recipientEmail: email,
      successMessage: bilingualSchema,
      submitButtonText: bilingualSchema,
      showOnWebsite: z.boolean(),
    }),
  },
];

/** Sections for every page except Home and About (those live in sections.ts). */
export const PAGE_SECTIONS: Partial<Record<PageKey, readonly SectionDefinition[]>> = {
  infrastructure,
  finance,
  services,
  grievance,
  culture,
  employment,
  education,
  environment,
  announcements,
  gallery,
  contact,
};
