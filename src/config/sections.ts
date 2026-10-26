import { z } from "zod";
import type { PageKey } from "@/config/pages";

/**
 * Section registry: which sections each public page is made of and the zod schema that
 * `SectionRevision.data` must satisfy. The frontend renders by `sectionKey`; the backend validates
 * every draft write against the schema here. Add pages/sections by extending this file — the
 * database needs no migration (`Section.sectionKey` + JSON data).
 *
 * Conventions: all human text is bilingual `{ en?, mr? }`; media references are `<something>Id`
 * fields holding a Media id (ownership is verified on write, see src/features/pages/service.ts).
 */

const text = (max: number) => z.string().trim().max(max);
export const bilingualSchema = z.object({ en: text(200).optional(), mr: text(200).optional() }).strict();
export const bilingualLongSchema = z.object({ en: text(20_000).optional(), mr: text(20_000).optional() }).strict();
const mediaId = z.string().trim().min(10).max(40).regex(/^[a-z0-9]+$/, "Invalid media id");
const href = z.string().trim().max(2000).regex(/^(https?:\/\/|\/|mailto:|tel:)/, "Links must be absolute URLs, site-relative paths, mailto: or tel:");
const phone = z.string().trim().regex(/^\+?[0-9]{10,15}$/).optional();

export interface SectionDefinition {
  key: string;
  /** Zod schema for `SectionRevision.data`. Unknown keys are rejected. */
  schema: z.ZodType;
  /** Default ordering on first save. */
  sortOrder: number;
}

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
    key: "leaders",
    sortOrder: 30,
    schema: z
      .object({
        heading: bilingualSchema.optional(),
        items: z
          .array(z.object({ name: bilingualSchema, designation: bilingualSchema, photoId: mediaId.optional(), phone }).strict())
          .min(1)
          .max(20),
      })
      .strict(),
  },
  {
    key: "quick-links",
    sortOrder: 40,
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
          .array(z.object({ name: bilingualSchema, designation: bilingualSchema, wardNo: text(20).optional(), phone, photoId: mediaId.optional() }).strict())
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
        phone,
        email: z.email().max(254).optional(),
        mapUrl: href.optional(),
      })
      .strict(),
  },
];

export const SECTION_REGISTRY: Partial<Record<PageKey, readonly SectionDefinition[]>> = { home, about };

export function sectionsForPage(pageKey: PageKey): readonly SectionDefinition[] {
  return SECTION_REGISTRY[pageKey] ?? [];
}

export function findSection(pageKey: PageKey, sectionKey: string): SectionDefinition | undefined {
  return sectionsForPage(pageKey).find((s) => s.key === sectionKey);
}

/** Keys of fields that reference Media ids, used for ownership verification on write. */
export const MEDIA_REF_PATTERN = /(image|photo|media)Id$/i;
