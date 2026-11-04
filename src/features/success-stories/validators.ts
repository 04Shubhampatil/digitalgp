import { z } from "zod";
import { PAGE_KEYS } from "@/config/pages";
import { contentStatusSchema } from "@/features/announcements/validators";
import { idSchema, optionalLongText, optionalShortText, paginationQuerySchema } from "@/lib/validation";

/** Pages that show success stories. */
export const STORY_PAGE_KEYS = ["home", "projects", "schemes", "employment", "education", "culture", "environment"] as const satisfies readonly (typeof PAGE_KEYS)[number][];
export const storyPageKeySchema = z.enum(STORY_PAGE_KEYS);

const shortLine = z.string().trim().max(160).optional().nullable();

const base = {
  pageKey: storyPageKeySchema,
  titleEn: optionalShortText,
  titleMr: optionalShortText,
  summaryEn: z.string().trim().max(500).optional().nullable(),
  summaryMr: z.string().trim().max(500).optional().nullable(),
  bodyEn: optionalLongText,
  bodyMr: optionalLongText,
  quoteEn: z.string().trim().max(500).optional().nullable(),
  quoteMr: z.string().trim().max(500).optional().nullable(),
  personName: z.string().trim().max(120).optional().nullable(),
  personRoleEn: shortLine,
  personRoleMr: shortLine,
  location: shortLine,
  photoId: idSchema.optional().nullable(),
  projectId: idSchema.optional().nullable(),
  schemeId: idSchema.optional().nullable(),
  /** The person agreed to be named / pictured on the website. Required to submit a story that names or shows someone. */
  consentConfirmed: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
};

const atLeastOneTitle = (v: { titleEn?: string | null; titleMr?: string | null }) => !!(v.titleEn?.trim() || v.titleMr?.trim());

export const createStorySchema = z
  .object({ ...base, tenantId: idSchema })
  .strict()
  .refine(atLeastOneTitle, { message: "A title in English or Marathi is required", path: ["titleEn"] });
export type CreateStoryInput = z.infer<typeof createStorySchema>;

export const updateStorySchema = z
  .object(base)
  .strict()
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;

export const listStoriesQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  status: contentStatusSchema.optional(),
  pageKey: storyPageKeySchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListStoriesQuery = z.infer<typeof listStoriesQuerySchema>;

export const publicStoriesQuerySchema = paginationQuerySchema.extend({
  page: storyPageKeySchema.optional(),
  projectId: idSchema.optional(),
  schemeId: idSchema.optional(),
});
export type PublicStoriesQuery = z.infer<typeof publicStoriesQuerySchema>;
