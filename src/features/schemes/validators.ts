import { z } from "zod";
import { contentStatusSchema } from "@/features/announcements/validators";
import { idSchema, optionalLongText, optionalShortText, paginationQuerySchema } from "@/lib/validation";

export const schemeLevelSchema = z.enum(["CENTRAL", "STATE", "DISTRICT", "GRAM_PANCHAYAT"]);

/** Money amounts are accepted as non-negative numbers with at most two decimals; returned as strings. */
export const amountSchema = z
  .number()
  .min(0)
  .max(1_000_000_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "At most two decimal places");

/** Indian financial year label "YYYY-YY", e.g. "2026-27" (the second part must be the next year). */
export const financialYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "Use the form 2026-27")
  .refine((v) => (Number(v.slice(0, 4)) + 1) % 100 === Number(v.slice(5)), "The second year must follow the first");

const base = {
  level: schemeLevelSchema,
  nameEn: optionalShortText,
  nameMr: optionalShortText,
  descriptionEn: optionalLongText,
  descriptionMr: optionalLongText,
  eligibilityEn: optionalLongText,
  eligibilityMr: optionalLongText,
  processEn: optionalLongText,
  processMr: optionalLongText,
  externalUrl: z.url().max(2000).optional().nullable(),
  beneficiaryCount: z.number().int().min(0).max(100_000_000).optional().nullable(),
  amountDisbursed: amountSchema.optional().nullable(),
  /** Financial year the amount belongs to, e.g. "2026-27"; counts towards "disbursed this financial year". */
  disbursedFinancialYear: financialYearSchema.optional().nullable(),
  category: z.string().trim().min(1).max(60).optional().nullable(),
  /** Map picture for the coverage block (when the wards have no polygons). */
  mapImageId: idSchema.optional().nullable(),
};

const atLeastOneName = (v: { nameEn?: string | null; nameMr?: string | null }) => !!(v.nameEn?.trim() || v.nameMr?.trim());

/**
 * Either `tenantId` (GP-specific scheme) or `ownerUnitId` + `targetUnitIds` (shared scheme
 * published downward by a higher-level admin). Never both.
 */
export const createSchemeSchema = z
  .object({
    ...base,
    tenantId: idSchema.optional(),
    ownerUnitId: idSchema.optional(),
    targetUnitIds: z.array(idSchema).min(1).max(500).optional(),
  })
  .refine(atLeastOneName, { message: "A name in English or Marathi is required", path: ["nameEn"] })
  .refine((v) => (v.tenantId ? !v.ownerUnitId && !v.targetUnitIds : !!v.ownerUnitId && !!v.targetUnitIds), {
    message: "Provide tenantId for a Gram Panchayat scheme, or ownerUnitId with targetUnitIds for a shared one",
    path: ["tenantId"],
  });
export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;

export const updateSchemeSchema = z
  .object({ ...base, targetUnitIds: z.array(idSchema).min(1).max(500).optional() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;

export const listSchemesQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  ownerUnitId: idSchema.optional(),
  status: contentStatusSchema.optional(),
  level: schemeLevelSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListSchemesQuery = z.infer<typeof listSchemesQuerySchema>;

export const publicSchemesQuerySchema = paginationQuerySchema.extend({
  level: schemeLevelSchema.optional(),
  category: z.string().trim().min(1).max(60).optional(),
});
export type PublicSchemesQuery = z.infer<typeof publicSchemesQuerySchema>;
