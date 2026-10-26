import { z } from "zod";
import { idSchema, paginationQuerySchema, shortText, slugSchema } from "@/lib/validation";

export const adminUnitLevelSchema = z.enum(["STATE", "DISTRICT", "TALUKA", "BLOCK", "GRAM_PANCHAYAT"]);

export const createUnitSchema = z.object({
  level: adminUnitLevelSchema,
  parentId: idSchema.nullable(),
  slug: slugSchema,
  nameEn: shortText,
  nameMr: shortText,
  code: z.string().trim().min(1).max(32).optional().nullable(),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z
  .object({
    slug: slugSchema.optional(),
    nameEn: shortText.optional(),
    nameMr: shortText.optional(),
    code: z.string().trim().min(1).max(32).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const listUnitsQuerySchema = paginationQuerySchema.extend({
  parentId: idSchema.optional(),
  level: adminUnitLevelSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;
