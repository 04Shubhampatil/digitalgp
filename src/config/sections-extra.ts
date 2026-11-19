import { z } from "zod";
import {
  amount,
  bannerSchema,
  bilingualLongSchema,
  bilingualSchema,
  colour,
  href,
  iconName,
  isoDate,
  mediaId,
  order,
  phone,
  listHeader,
  successStoriesSchema,
  text,
  topStatItem,
  viewAllSchema,
  type SectionDefinition,
} from "@/config/section-primitives";

/**
 * Sections for the Projects, Schemes and extra Home / About blocks in the Figma admin.
 * Same conventions as sections-pages.ts: strict objects, bilingual text, https-only links,
 * media ids checked for ownership, enums and bounds on every field.
 */

const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);
const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

const topStats = strict({
  heading: bilingualSchema.optional(),
  subheading: bilingualSchema.optional(),
  variant: z.enum(["tiles", "strip", "card", "band"]).optional(),
  items: list(topStatItem, 8),
});

const successStories = successStoriesSchema;

// ---------------------------------------------------------------------------
// Projects page
// ---------------------------------------------------------------------------

export const PROJECTS_SECTIONS: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  { key: "top-stats", sortOrder: 5, schema: topStats },
  {
    key: "before-after-gallery",
    sortOrder: 10,
    schema: strict({
      eyebrow: bilingualSchema.optional(),
      heading: bilingualSchema.optional(),
      viewAll: viewAllSchema.optional(),
      items: list(
        strict({ beforeImageId: mediaId, afterImageId: mediaId, title: bilingualSchema, description: bilingualSchema.optional(), order }),
        20,
      ),
    }),
  },
  {
    key: "village-resolution-tracker",
    sortOrder: 20,
    schema: strict({
      heading: bilingualSchema.optional(),
      subtitle: bilingualSchema.optional(),
      items: list(
        strict({
          title: bilingualSchema,
          // `percent` draws the design's progress bar; `status` (open / in progress / resolved) is the older way and
          // is only used when no percent is given.
          percent: z.number().int().min(0).max(100).optional(),
          status: z.enum(["open", "in-progress", "resolved"]).optional(),
          date: isoDate.optional(),
          wardNo: text(20).optional(),
          updateNote: bilingualSchema.optional(),
        }),
        30,
      ),
    }),
  },
  {
    key: "impact-dashboard",
    sortOrder: 30,
    schema: strict({
      heading: bilingualSchema.optional(),
      subtitle: bilingualSchema.optional(),
      items: list(
        strict({
          icon: iconName.optional(),
          title: bilingualSchema,
          value: text(40),
          description: bilingualSchema.optional(),
          theme: z.enum(["blue", "orange", "green", "purple"]).optional(),
        }),
        12,
      ),
    }),
  },
  {
    key: "financial-overview",
    sortOrder: 40,
    schema: strict({
      heading: bilingualSchema,
      subtitle: bilingualSchema.optional(),
      currency: z.string().trim().min(3).max(10).default("INR"),
      // The design's two lists: where the budget goes (bars, in %) and where the money comes from (donut + legend).
      budgetLabel: bilingualSchema.optional(),
      sourcesLabel: bilingualSchema.optional(),
      allocation: list(strict({ label: bilingualSchema, percent: z.number().min(0).max(100) }), 10).optional(),
      sources: list(strict({ label: bilingualSchema, amount: text(30), value: z.number().min(0).max(1_000_000) }), 8).optional(),
      action: viewAllSchema.optional(),
      // Older single list of heads, still accepted.
      items: list(strict({ label: bilingualSchema, amount, colour }), 12).optional(),
      note: bilingualLongSchema.optional(),
    }),
  },
  {
    // Development Timeline card: one step per year; `done: false` marks the step that is still in progress.
    key: "dev-timeline",
    sortOrder: 35,
    schema: strict({
      title: bilingualSchema.optional(),
      steps: list(strict({ year: text(10), label: bilingualSchema, status: bilingualSchema.optional(), done: z.boolean().optional() }), 12),
      action: viewAllSchema.optional(),
    }),
  },
  { key: "success-stories", sortOrder: 50, schema: successStories },
  {
    key: "development-suggestions",
    sortOrder: 60,
    schema: strict({
      heading: bilingualSchema,
      description: bilingualSchema.optional(),
      imageId: mediaId.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
    }),
  },
];

// ---------------------------------------------------------------------------
// Schemes page
// ---------------------------------------------------------------------------

export const SCHEMES_SECTIONS: SectionDefinition[] = [
  { key: "banner", sortOrder: 0, schema: bannerSchema },
  {
    key: "category-strip",
    sortOrder: 10,
    // `iconImageId`: the picture of the level card (the design shows a picture, not an icon); `icon` is the fallback.
    schema: strict({ items: list(strict({ icon: iconName.optional(), iconImageId: mediaId.optional(), label: bilingualSchema, key: text(40), active: z.boolean() }), 12) }),
  },
  {
    key: "coverage-map",
    sortOrder: 20,
    // Per-ward beneficiary counts. Households here are the reach of schemes; the scheme records carry the totals.
    schema: strict({
      heading: bilingualSchema.optional(),
      subheading: bilingualSchema.optional(),
      mapImageId: mediaId.optional(),
      wards: list(
        strict({
          wardNo: text(20),
          households: z.number().int().min(0).max(1_000_000),
          beneficiaries: z.number().int().min(0).max(1_000_000),
          colour: colour.optional(),
        }),
        60,
      ),
    }),
  },
  {
    // "Scheme Information" cards: purpose, eligibility, procedure, documents, benefits. `layout` "list" = one column with arrows.
    key: "link-cards",
    sortOrder: 15,
    schema: strict({
      ...listHeader,
      layout: z.enum(["grid", "list"]).optional(),
      items: list(
        strict({
          icon: iconName.optional(),
          iconId: mediaId.optional(),
          title: bilingualSchema,
          body: bilingualSchema.optional(),
          cta: bilingualSchema.optional(),
          href: href.optional(),
        }),
        12,
      ),
    }),
  },
  { key: "statistics", sortOrder: 30, schema: strict({ items: list(strict({ icon: iconName, title: bilingualSchema, value: text(40), description: bilingualSchema.optional() }), 12) }) },
  { key: "success-stories", sortOrder: 40, schema: successStories },
  {
    key: "quick-actions",
    sortOrder: 50,
    schema: strict({
      items: list(
        strict({
          icon: iconName,
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          buttonText: bilingualSchema,
          buttonLink: href,
          active: z.boolean(),
        }),
        12,
      ),
    }),
  },
];

// ---------------------------------------------------------------------------
// Extra Home blocks (weather, what's new, achievements, about cards, notices)
// ---------------------------------------------------------------------------

export const HOME_EXTRA_SECTIONS: SectionDefinition[] = [
  { key: "banner", sortOrder: 2, schema: bannerSchema },
  {
    // "Welcome to <village>" video card: thumbnail picture, the button text and the video link (YouTube / Vimeo).
    key: "welcome-video",
    sortOrder: 50,
    schema: strict({ heading: bilingualSchema.optional(), watchLabel: bilingualSchema.optional(), imageId: mediaId.optional(), videoUrl: href.optional() }),
  },
  {
    // Photo strip at the bottom of the home page (the full gallery lives on the Gallery page).
    key: "home-gallery",
    sortOrder: 56,
    schema: strict({ heading: bilingualSchema.optional(), photos: list(strict({ imageId: mediaId, caption: bilingualSchema.optional() }), 12) }),
  },
  {
    // Live weather card. The figures come from the weather provider (server-side), never from the editor: only the
    // place is typed. `location` is the text shown on the card, `place` the name sent to the provider ("Khed,IN").
    // `current` / `forecast` are the legacy manual figures: still accepted so older rows keep validating, no longer edited.
    key: "weather",
    sortOrder: 22,
    schema: strict({
      location: text(120).optional(),
      place: text(120).optional(),
      current: strict({ temperature: text(20), humidity: text(20), wind: text(40), feelsLike: text(20), condition: text(120) }).optional(),
      forecast: list(strict({ date: isoDate, icon: iconName, maxTemp: text(20), minTemp: text(20) }), 7).optional(),
    }),
  },
  {
    key: "whats-new",
    sortOrder: 42,
    schema: strict({
      heading: bilingualSchema.optional(),
      viewAll: viewAllSchema.optional(),
      // imageId: the row thumbnail (optional; ownership-checked like every *Id media reference).
      items: list(strict({ title: bilingualSchema, date: text(60), status: text(40), href: href.optional(), imageId: mediaId.optional() }), 12),
    }),
  },
  {
    key: "achievements",
    sortOrder: 44,
    schema: strict({
      heading: bilingualSchema.optional(),
      items: list(
        strict({
          title: bilingualSchema,
          description: bilingualSchema.optional(),
          completedOn: text(60),
          rank: z.number().int().min(1).max(10).optional(),
        }),
        10,
      ),
    }),
  },
  {
    key: "about-cards",
    sortOrder: 12,
    schema: strict({
      // Block heading and intro, the three pictures of the collage (large photo, small photo, map picture), the
      // address on the map with its link, and the Read More button. All optional: the design values show until set.
      heading: bilingualSchema.optional(),
      subheading: bilingualLongSchema.optional(),
      mainImageId: mediaId.optional(),
      secondImageId: mediaId.optional(),
      mapImageId: mediaId.optional(),
      address: bilingualSchema.optional(),
      mapUrl: href.optional(),
      buttonText: bilingualSchema.optional(),
      buttonLink: href.optional(),
      items: list(strict({ icon: iconName, title: bilingualSchema, description: bilingualLongSchema.optional(), buttonText: bilingualSchema.optional(), buttonLink: href.optional() }), 8),
    }),
  },
  {
    key: "notice-categories",
    sortOrder: 46,
    schema: strict({ items: list(strict({ key: text(40), label: bilingualSchema, icon: iconName }), 12) }),
  },
  {
    key: "notices",
    sortOrder: 48,
    schema: strict({
      items: list(
        strict({
          title: bilingualSchema,
          category: text(60),
          publishedAt: isoDate,
          fileId: mediaId.optional(),
          buttonLink: href.optional(),
          active: z.boolean(),
        }),
        20,
      ),
    }),
  },
];

// ---------------------------------------------------------------------------
// Extra About blocks (banner, leaders profile grid, roles, emergency services)
// ---------------------------------------------------------------------------

export const ABOUT_EXTRA_SECTIONS: SectionDefinition[] = [
  // Sorted before the existing About sections (overview is 0) so the banner is always first.
  { key: "banner", sortOrder: -1, schema: bannerSchema },
  {
    key: "leaders-profile-grid",
    sortOrder: 25,
    schema: strict({
      heading: bilingualSchema.optional(),
      items: list(
        strict({
          photoId: mediaId.optional(),
          name: bilingualSchema,
          designation: bilingualSchema,
          bio: bilingualSchema.optional(),
          phone: phone.optional(),
          wardNo: text(20).optional(),
        }),
        30,
      ),
    }),
  },
  {
    key: "vision-mission",
    sortOrder: 15,
    schema: strict({
      heading: bilingualSchema.optional(),
      vision: strict({ title: bilingualSchema.optional(), body: bilingualLongSchema, icon: iconName.optional() }),
      mission: strict({
        title: bilingualSchema.optional(),
        body: bilingualLongSchema.optional(),
        icon: iconName.optional(),
        points: list(bilingualSchema, 10).optional(),
      }),
      /** "Core values" chips. */
      valuesTitle: bilingualSchema.optional(),
      values: list(bilingualSchema, 10).optional(),
      imageId: mediaId.optional(),
    }),
  },
  {
    key: "roles-cards",
    sortOrder: 35,
    schema: strict({
      heading: bilingualSchema.optional(),
      items: list(strict({ icon: iconName, title: bilingualSchema, responsibilities: list(bilingualSchema, 6) }), 12),
    }),
  },
  {
    key: "emergency-services",
    sortOrder: 45,
    schema: strict({
      heading: bilingualSchema.optional(),
      items: list(
        strict({
          title: bilingualSchema,
          number: z.string().trim().regex(/^[0-9+\- ]{3,20}$/, "Use digits, + or -"),
          category: z.enum(["health", "police", "fire", "disaster", "utility", "other"]),
          icon: iconName,
          active: z.boolean(),
        }),
        20,
      ),
    }),
  },
];

