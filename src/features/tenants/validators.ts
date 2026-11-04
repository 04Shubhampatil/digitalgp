import { z } from "zod";
import { idSchema, localeSchema, paginationQuerySchema, shortText, slugSchema } from "@/lib/validation";

const bilingual = z.object({ en: z.string().trim().max(300).optional(), mr: z.string().trim().max(300).optional() }).strict();
const url = z.string().trim().url().max(500);

/** Shape of Tenant.settings (Json). Unknown keys are rejected to keep the column tidy. */
export const tenantSettingsSchema = z
  .object({
    contact: z
      .object({
        address: z.string().trim().max(500).optional(),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(254).optional(),
        hours: z.string().trim().max(200).optional(),
      })
      .strict()
      .optional(),
    social: z.object({ facebook: url.optional(), instagram: url.optional(), youtube: url.optional(), twitter: url.optional() }).strict().optional(),
    branding: z.object({ logoMediaId: idSchema.optional(), tagline: bilingual.optional() }).strict().optional(),
    seo: z.object({ title: bilingual.optional(), description: bilingual.optional() }).strict().optional(),
    /** Place name sent to the weather provider, e.g. "Khed,IN". */
    weather: z.object({ location: z.string().trim().min(2).max(120) }).strict().optional(),
    /**
     * Monthly service figures typed in by the GP office (there is no certificate or tax module).
     * Shown by GET /public/:slug/stats/services only while `month` is the current month.
     */
    serviceStats: z
      .object({
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the form 2026-11"),
        certificatesIssued: z.number().int().min(0).max(1_000_000).optional(),
        /** Rupees, at most two decimals. */
        taxCollected: z.number().min(0).max(1_000_000_000).optional(),
        /** Percentage 0–100; used only while fewer than 5 feedback ratings exist for the last 90 days. */
        satisfactionRate: z.number().min(0).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const createTenantSchema = z.object({
  unitId: idSchema,
  slug: slugSchema,
  nameEn: shortText,
  nameMr: shortText,
  customDomain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid domain").optional().nullable(),
  defaultLocale: localeSchema.optional(),
  settings: tenantSettingsSchema.optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = createTenantSchema
  .omit({ unitId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const tenantStatusSchema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "SUSPENDED"]) });

export const listTenantsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "SUSPENDED"]).optional(),
  unitId: idSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
