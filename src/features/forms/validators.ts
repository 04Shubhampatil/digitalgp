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
    subject: z.string().trim().min(2).max(200).optional().nullable(),
    message: z.string().trim().min(10).max(2000),
    /** Optional 1–5 rating; feeds the public citizen satisfaction rate. */
    rating: z.number().int().min(1).max(5).optional().nullable(),
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
    address: z.string().trim().max(500).optional().nullable(),
    areaOfInterest: z.string().trim().max(200).optional().nullable(),
    message: z.string().trim().max(2000).optional().nullable(),
    website: honeypot,
    turnstileToken,
  })
  .strict();
export type VolunteerInput = z.infer<typeof volunteerSchema>;

/** "Adopt a Tree" request (public, Environment page). Phone is required so the office can follow up. */
export const treeAdoptionSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    email: emailSchema.optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    treeCount: z.number().int().min(1).max(100),
    species: z.string().trim().max(120).optional().nullable(),
    /** Where the citizen would like to plant / adopt, e.g. "Ward 2, school ground". */
    preferredLocation: z.string().trim().max(200).optional().nullable(),
    message: z.string().trim().max(2000).optional().nullable(),
    website: honeypot,
    turnstileToken,
  })
  .strict();
export type TreeAdoptionInput = z.infer<typeof treeAdoptionSchema>;

export const formSubmissionKindSchema = z.enum(["FEEDBACK", "VOLUNTEER", "TREE_ADOPTION"]);

export const listFormSubmissionsQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema,
  kind: formSubmissionKindSchema,
});
export type ListFormSubmissionsQuery = z.infer<typeof listFormSubmissionsQuerySchema>;

export const formSubmissionSummaryQuerySchema = z.object({ tenantId: idSchema });
