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
  text,
  topStatItem,
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
  variant: z.enum(["tiles", "strip"]).optional(),
  items: list(topStatItem, 8),
});

const successStories = strict({
  items: list(
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
      items: list(
        strict({
          title: bilingualSchema,
          status: z.enum(["open", "in-progress", "resolved"]),
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
      items: list(
        strict({
          icon: iconName,
          title: bilingualSchema,
          value: text(40),
          description: bilingualSchema.optional(),
          theme: z.enum(["blue", "orange", "green", "purple"]),
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
      items: list(strict({ label: bilingualSchema, amount, colour }), 12),
      note: bilingualLongSchema.optional(),
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
    schema: strict({ items: list(strict({ icon: iconName, label: bilingualSchema, key: text(40), active: z.boolean() }), 12) }),
  },
  {
    key: "coverage-map",
    sortOrder: 20,
    // Per-ward beneficiary counts. Households here are the reach of schemes; the scheme records carry the totals.
    schema: strict({
      heading: bilingualSchema.optional(),
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
    // Manual fallback for the live weather card (used when no provider is configured or it fails).
    key: "weather",
    sortOrder: 22,
    schema: strict({
      location: text(120).optional(),
      current: strict({ temperature: text(20), humidity: text(20), wind: text(40), feelsLike: text(20), condition: text(120) }),
      forecast: list(strict({ date: isoDate, icon: iconName, maxTemp: text(20), minTemp: text(20) }), 7),
    }),
  },
  {
    key: "whats-new",
    sortOrder: 42,
    schema: strict({
      heading: bilingualSchema.optional(),
      items: list(strict({ title: bilingualSchema, date: text(60), status: text(40), href: href.optional() }), 12),
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
      items: list(strict({ icon: iconName, title: bilingualSchema, description: bilingualSchema.optional(), buttonText: bilingualSchema.optional(), buttonLink: href.optional() }), 8),
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

