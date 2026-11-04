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
  /** Event date/time for the public calendar (with offset, e.g. "2026-11-20T10:00:00+05:30"); null = not an event. */
  eventStartAt: z.iso.datetime({ offset: true }).optional().nullable(),
  eventEndAt: z.iso.datetime({ offset: true }).optional().nullable(),
  eventLocationEn: optionalShortText,
  eventLocationMr: optionalShortText,
};

const eventEndsAfterStart = (v: { eventStartAt?: string | null; eventEndAt?: string | null }) =>
  !v.eventEndAt || (!!v.eventStartAt && new Date(v.eventEndAt) >= new Date(v.eventStartAt));

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
  .refine(eventEndsAfterStart, { message: "The event must end after it starts (and needs a start)", path: ["eventEndAt"] })
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

export const publicAnnouncementsQuerySchema = paginationQuerySchema
  .extend({
    page: z.enum(PAGE_KEYS).optional(),
    priority: prioritySchema.optional(),
    category: z.string().trim().min(1).max(60).optional(),
    /** Calendar: only events starting in [from, to). Dates or date-times. */
    from: z.iso.date().or(z.iso.datetime({ offset: true })).optional(),
    to: z.iso.date().or(z.iso.datetime({ offset: true })).optional(),
    /** `true` = events only. */
    events: z.enum(["true", "false"]).optional(),
    /** `true` = only announcements with a downloadable attachment (Downloads tiles). */
    hasAttachment: z.enum(["true", "false"]).optional(),
  })
  .refine((v) => !v.from || !v.to || new Date(v.from) < new Date(v.to), { message: "`from` must be before `to`", path: ["to"] })
  .refine((v) => !v.from || !v.to || new Date(v.to).getTime() - new Date(v.from).getTime() <= 400 * 24 * 60 * 60 * 1000, {
    message: "The range can be at most 400 days",
    path: ["to"],
  });

export const publicAnnouncementCategoriesQuerySchema = z.object({ page: z.enum(PAGE_KEYS).optional() });
export type PublicAnnouncementsQuery = z.infer<typeof publicAnnouncementsQuerySchema>;
