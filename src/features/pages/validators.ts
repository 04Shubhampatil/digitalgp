import { z } from "zod";
import { PAGE_KEYS } from "@/config/pages";
import { idSchema, optionalShortText } from "@/lib/validation";

export const pageKeySchema = z.enum(PAGE_KEYS);

export const updatePageSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    seoTitleEn: optionalShortText,
    seoTitleMr: optionalShortText,
    seoDescriptionEn: z.string().trim().max(500).optional().nullable(),
    seoDescriptionMr: z.string().trim().max(500).optional().nullable(),
    shareImageId: idSchema.optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

/** Draft payload; `data` is validated against the section's registry schema in the service. */
export const saveSectionDraftSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
export type SaveSectionDraftInput = z.infer<typeof saveSectionDraftSchema>;

export const sectionActionSchema = z.enum(["submit", "start_review", "approve", "reject", "publish", "unpublish"]);
export type SectionAction = z.infer<typeof sectionActionSchema>;
