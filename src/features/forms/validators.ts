import { z } from "zod";
import { emailSchema, idSchema, paginationQuerySchema, phoneSchema } from "@/lib/validation";

/** Honeypot: real visitors never fill this field; bots often do. Must be empty or absent. */
const honeypot = z.string().max(0).optional().default("");

const turnstileToken = z.string().trim().min(1).max(2048).optional();

/** Contact-page feedback (public). Email is optional; phone is optional. */
export const feedbackSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema.optional().nullable(),
    phone: phoneSchema.optional().nullable(),
    message: z.string().trim().min(10).max(2000),
    website: honeypot,
    turnstileToken,
  })
  .strict();
export type FeedbackInput = z.infer<typeof feedbackSchema>;

/** Volunteer application (public). Email and phone are required so the office can reach the volunteer. */
export const volunteerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: phoneSchema,
    category: z.string().trim().min(1).max(120),
    message: z.string().trim().max(2000).optional().nullable(),
    website: honeypot,
    turnstileToken,
  })
  .strict();
export type VolunteerInput = z.infer<typeof volunteerSchema>;

export const listFormSubmissionsQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema,
  kind: z.enum(["FEEDBACK", "VOLUNTEER"]),
});
export type ListFormSubmissionsQuery = z.infer<typeof listFormSubmissionsQuerySchema>;

export const formSubmissionSummaryQuerySchema = z.object({ tenantId: idSchema });
