import { z } from "zod";
import { PAGE_KEYS } from "@/config/pages";
import { idSchema, optionalLongText, optionalShortText, paginationQuerySchema } from "@/lib/validation";

export const prioritySchema = z.enum(["NORMAL", "IMPORTANT", "URGENT", "EMERGENCY"]);
export const contentStatusSchema = z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"]);

const base = {
  category: z.string().trim().min(1).max(60),
  priority: prioritySchema.default("NORMAL"),
  titleEn: optionalShortText,
  titleMr: optionalShortText,
  bodyEn: optionalLongText,
  bodyMr: optionalLongText,
  attachmentId: idSchema.optional().nullable(),
  displayPages: z.array(z.enum(PAGE_KEYS)).min(1).max(PAGE_KEYS.length).default(["home", "announcements"]),
  publishAt: z.iso.datetime().optional().nullable(),
  expiresAt: z.iso.datetime().optional().nullable(),
};

const atLeastOneTitle = (v: { titleEn?: string | null; titleMr?: string | null }) => !!(v.titleEn?.trim() || v.titleMr?.trim());

/**
 * Either `tenantId` (GP-owned announcement) or `ownerUnitId` + `targetUnitIds` (shared
 * announcement published downward by a higher-level admin). Never both.
 */
export const createAnnouncementSchema = z
  .object({
    ...base,
    tenantId: idSchema.optional(),
    ownerUnitId: idSchema.optional(),
    targetUnitIds: z.array(idSchema).min(1).max(500).optional(),
  })
  .refine(atLeastOneTitle, { message: "A title in English or Marathi is required", path: ["titleEn"] })
  .refine((v) => (v.tenantId ? !v.ownerUnitId && !v.targetUnitIds : !!v.ownerUnitId && !!v.targetUnitIds), {
    message: "Provide tenantId for a Gram Panchayat announcement, or ownerUnitId with targetUnitIds for a shared one",
    path: ["tenantId"],
  });
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z
  .object({ ...base, targetUnitIds: z.array(idSchema).min(1).max(500).optional() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const transitionSchema = z.object({ note: z.string().trim().max(1000).optional().nullable() });

export const listAnnouncementsQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  ownerUnitId: idSchema.optional(),
  status: contentStatusSchema.optional(),
  priority: prioritySchema.optional(),
  category: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;

export const publicAnnouncementsQuerySchema = paginationQuerySchema.extend({
  page: z.enum(PAGE_KEYS).optional(),
  priority: prioritySchema.optional(),
  category: z.string().trim().min(1).max(60).optional(),
});
export type PublicAnnouncementsQuery = z.infer<typeof publicAnnouncementsQuerySchema>;
