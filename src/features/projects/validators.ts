import { z } from "zod";
import { contentStatusSchema } from "@/features/announcements/validators";
import { amountSchema } from "@/features/schemes/validators";
import { idSchema, optionalLongText, optionalShortText, paginationQuerySchema } from "@/lib/validation";

export const projectStageSchema = z.enum(["UPCOMING", "ONGOING", "COMPLETED"]);

const base = {
  stage: projectStageSchema,
  nameEn: optionalShortText,
  nameMr: optionalShortText,
  descriptionEn: optionalLongText,
  descriptionMr: optionalLongText,
  wardNo: z.string().trim().max(20).optional().nullable(),
  year: z.number().int().min(1950).max(2100).optional().nullable(),
  budget: amountSchema.optional().nullable(),
  familiesBenefited: z.number().int().min(0).max(10_000_000).optional().nullable(),
  outcomeEn: optionalLongText,
  outcomeMr: optionalLongText,
  coverImageId: idSchema.optional().nullable(),
};

const atLeastOneName = (v: { nameEn?: string | null; nameMr?: string | null }) => !!(v.nameEn?.trim() || v.nameMr?.trim());

/** Projects are always owned by one Gram Panchayat website. */
export const createProjectSchema = z
  .object({ ...base, tenantId: idSchema })
  .refine(atLeastOneName, { message: "A name in English or Marathi is required", path: ["nameEn"] });
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object(base)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  status: contentStatusSchema.optional(),
  stage: projectStageSchema.optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const publicProjectsQuerySchema = paginationQuerySchema.extend({
  stage: projectStageSchema.optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
});
export type PublicProjectsQuery = z.infer<typeof publicProjectsQuerySchema>;
