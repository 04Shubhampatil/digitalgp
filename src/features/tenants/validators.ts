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
    social: z.object({ facebook: url.optional(), instagram: url.optional(), youtube: url.optional() }).strict().optional(),
    branding: z.object({ logoMediaId: idSchema.optional(), tagline: bilingual.optional() }).strict().optional(),
    seo: z.object({ title: bilingual.optional(), description: bilingual.optional() }).strict().optional(),
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
