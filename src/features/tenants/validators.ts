import { z } from "zod";
import { modulesSchema } from "@/features/users/validators";
import { emailSchema, idSchema, localeSchema, paginationQuerySchema, passwordSchema, phoneSchema, shortText, slugSchema } from "@/lib/validation";

const bilingual = z.object({ en: z.string().trim().max(300).optional(), mr: z.string().trim().max(300).optional() }).strict();
const url = z.string().trim().url().max(500);

/** Shape of Tenant.settings (Json). Unknown keys are rejected to keep the column tidy. */
export const tenantSettingsSchema = z
  .object({
    contact: z
      .object({
        address: z.string().trim().max(500).optional(),
        // Marathi versions shown on the Marathi site (the English text is the fallback).
        addressMr: z.string().trim().max(500).optional(),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(254).optional(),
        hours: z.string().trim().max(200).optional(),
        hoursMr: z.string().trim().max(200).optional(),
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

/** Login account created together with a website (same rules as POST /users; omit `password` to generate one). */
export const websiteAccountSchema = z.object({
  name: shortText,
  email: emailSchema,
  phone: phoneSchema.optional().nullable(),
  locale: localeSchema.optional(),
  /** Omit to have a temporary password generated and returned once. */
  password: passwordSchema.optional(),
});
export const websiteOperatorSchema = websiteAccountSchema.extend({ modules: modulesSchema });

export const MAX_WEBSITE_OPERATORS = 5;

/** POST /tenants/with-users: the website, its GP Admin and optional Data Entry Operators in one request. */
export const createTenantWithUsersSchema = createTenantSchema
  .extend({
    gpAdmin: websiteAccountSchema,
    operators: z.array(websiteOperatorSchema).max(MAX_WEBSITE_OPERATORS).default([]),
  })
  .superRefine((v, ctx) => {
    const seen = new Map<string, string>([[v.gpAdmin.email, "gpAdmin"]]);
    v.operators.forEach((o, i) => {
      if (seen.has(o.email)) ctx.addIssue({ code: "custom", path: ["operators", i, "email"], message: "This email is used more than once" });
      seen.set(o.email, `operators.${i}`);
    });
  });
export type CreateTenantWithUsersInput = z.infer<typeof createTenantWithUsersSchema>;

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
