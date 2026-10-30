import { z } from "zod";
import type { PageKey } from "@/config/pages";
import { PAGE_SECTIONS } from "@/config/sections-pages";
import { ABOUT_EXTRA_SECTIONS, HOME_EXTRA_SECTIONS, PROJECTS_SECTIONS, SCHEMES_SECTIONS } from "@/config/sections-extra";
import { bilingualLongSchema, bilingualSchema, colour, geometrySchema, href, mediaId, phone, text, type SectionDefinition } from "@/config/section-primitives";

/**
 * Section registry: which sections each public page is made of and the zod schema that
 * `SectionRevision.data` must satisfy. Home and About are defined here; every other page is in
 * sections-pages.ts. Shared primitives live in section-primitives.ts.
 *
 * Conventions: all human text is bilingual `{ en?, mr? }`; media references are `<something>Id`
 * fields holding a Media id (ownership is verified on write, see src/features/pages/service.ts).
 */

export { MEDIA_REF_PATTERN, bilingualLongSchema, bilingualSchema, type SectionDefinition } from "@/config/section-primitives";

const home: SectionDefinition[] = [
  {
    key: "hero",
    sortOrder: 0,
    schema: z
      .object({
        title: bilingualSchema,
        subtitle: bilingualSchema.optional(),
        backgroundImageId: mediaId.optional(),
        cta: z.object({ label: bilingualSchema, href }).strict().optional(),
        /** Full list of hero buttons as shown in the design; `cta` stays as the primary button. */
        actions: z.array(z.object({ label: bilingualSchema, href }).strict()).min(1).max(4).optional(),
      })
      .strict(),
  },
  {
    key: "quick-stats",
    sortOrder: 10,
    schema: z
      .object({
        items: z.array(z.object({ label: bilingualSchema, value: text(40), icon: text(40).optional() }).strict()).min(1).max(8),
      })
      .strict(),
  },
  {
    key: "welcome",
    sortOrder: 20,
    schema: z
      .object({ heading: bilingualSchema, body: bilingualLongSchema, imageId: mediaId.optional() })
      .strict(),
  },
  {
    key: "sarpanch-message",
    sortOrder: 25,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        message: bilingualLongSchema,
        name: bilingualSchema,
        designation: bilingualSchema,
        photoId: mediaId.optional(),
      })
      .strict(),
  },
  {
    key: "monthly-metrics",
    sortOrder: 30,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        /** Period label shown with the change figures, e.g. "this month". */
        period: bilingualSchema.optional(),
        items: z
          .array(z.object({ label: bilingualSchema, value: text(40), change: text(40).optional() }).strict())
          .min(1)
          .max(12),
      })
      .strict(),
  },
  {
    key: "village-progress",
    sortOrder: 35,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        subheading: bilingualSchema.optional(),
        items: z.array(z.object({ label: bilingualSchema, valueText: text(60).optional() }).strict()).min(1).max(20),
      })
      .strict(),
  },
  {
    key: "ward-details",
    sortOrder: 40,
    // Each ward may carry map data: a GeoJSON Polygon/MultiPolygon (`geometry`, preferred — drawn by the
    // frontend map) and/or an uploaded picture (`mapImageId`). `wardNo` links the ward to other data
    // (scheme coverage, markers); it must be unique within the section.
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        wards: z
          .array(
            z
              .object({
                wardNo: text(20).min(1).optional(),
                name: bilingualSchema,
                colour: colour.optional(),
                geometry: geometrySchema.optional(),
                mapImageId: mediaId.optional(),
                items: z.array(z.object({ label: bilingualSchema, valueText: text(60) }).strict()).min(1).max(12),
              })
              .strict(),
          )
          .min(1)
          .max(50)
          .refine((wards) => {
            const nos = wards.map((w) => w.wardNo).filter((n): n is string => !!n);
            return new Set(nos).size === nos.length;
          }, "Ward numbers must be unique"),
      })
      .strict(),
  },
  {
    key: "leaders",
    sortOrder: 45,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        items: z
          .array(z.object({ name: bilingualSchema, designation: bilingualSchema, photoId: mediaId.optional(), phone: phone.optional() }).strict())
          .min(1)
          .max(20),
      })
      .strict(),
  },
  {
    key: "quick-links",
    sortOrder: 50,
    schema: z
      .object({ items: z.array(z.object({ label: bilingualSchema, href, icon: text(40).optional() }).strict()).min(1).max(12) })
      .strict(),
  },
];

const about: SectionDefinition[] = [
  {
    key: "overview",
    sortOrder: 0,
    schema: z.object({ heading: bilingualSchema, body: bilingualLongSchema, imageId: mediaId.optional() }).strict(),
  },
  {
    key: "history",
    sortOrder: 10,
    schema: z.object({ heading: bilingualSchema.optional(), body: bilingualLongSchema }).strict(),
  },
  {
    key: "geography",
    sortOrder: 20,
    schema: z
      .object({
        areaSqKm: z.number().min(0).max(100_000).optional(),
        population: z.number().int().min(0).max(10_000_000).optional(),
        households: z.number().int().min(0).max(5_000_000).optional(),
        wards: z.number().int().min(0).max(500).optional(),
        pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/).optional(),
        nearestCity: bilingualSchema.optional(),
        description: bilingualLongSchema.optional(),
      })
      .strict(),
  },
  {
    key: "members",
    sortOrder: 30,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        items: z
          .array(z.object({ name: bilingualSchema, designation: bilingualSchema, wardNo: text(20).optional(), phone: phone.optional(), photoId: mediaId.optional() }).strict())
          .min(1)
          .max(50),
      })
      .strict(),
  },
  {
    key: "office",
    sortOrder: 40,
    schema: z
      .object({
        address: bilingualLongSchema,
        hours: bilingualSchema.optional(),
        phone: phone.optional(),
        email: z.email().max(254).optional(),
        mapUrl: href.optional(),
      })
      .strict(),
  },
];

export const SECTION_REGISTRY: Partial<Record<PageKey, readonly SectionDefinition[]>> = {
  // Sorted by sortOrder so the registry order matches how the page returns its sections.
  home: [...home, ...HOME_EXTRA_SECTIONS].sort((a, b) => a.sortOrder - b.sortOrder),
  about: [...about, ...ABOUT_EXTRA_SECTIONS].sort((a, b) => a.sortOrder - b.sortOrder),
  projects: PROJECTS_SECTIONS,
  schemes: SCHEMES_SECTIONS,
  ...PAGE_SECTIONS,
};

export function sectionsForPage(pageKey: PageKey): readonly SectionDefinition[] {
  return SECTION_REGISTRY[pageKey] ?? [];
}

export function findSection(pageKey: PageKey, sectionKey: string): SectionDefinition | undefined {
  return sectionsForPage(pageKey).find((s) => s.key === sectionKey);
}

