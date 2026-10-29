import { z } from "zod";
import { emailSchema, idSchema, paginationQuerySchema, phoneSchema } from "@/lib/validation";

export const grievanceStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]);
export type GrievanceStatus = z.infer<typeof grievanceStatusSchema>;

/** Citizen-facing form (public, unauthenticated). */
export const submitGrievanceSchema = z.object({
  category: z.string().trim().min(1).max(60),
  citizenName: z.string().trim().min(2).max(120),
  citizenPhone: phoneSchema.optional().nullable(),
  citizenEmail: emailSchema.optional().nullable(),
  description: z.string().trim().min(10).max(5000),
  /** Media ids of files the citizen attached. Allowed only when the complaint form enables uploads. */
  attachmentIds: z.array(z.string().trim().min(10).max(40).regex(/^[a-z0-9]+$/, "Invalid file id")).max(5).optional().default([]),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
});
export type SubmitGrievanceInput = z.input<typeof submitGrievanceSchema>;

export const trackingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^GRV-[A-Z0-9]{8}$/, "Invalid tracking code");

export const assignGrievanceSchema = z.object({ assignedToId: idSchema.nullable() });
export type AssignGrievanceInput = z.infer<typeof assignGrievanceSchema>;

/** Status change by staff. A note is mandatory when closing (resolved/rejected) — it is shown to the citizen. */
export const changeGrievanceStatusSchema = z
  .object({
    status: z.enum(["IN_PROGRESS", "RESOLVED", "REJECTED"]),
    note: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => v.status === "IN_PROGRESS" || !!v.note?.trim(), { message: "A note is required when resolving or rejecting", path: ["note"] });
export type ChangeGrievanceStatusInput = z.infer<typeof changeGrievanceStatusSchema>;

export const listGrievancesQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  status: grievanceStatusSchema.optional(),
  category: z.string().trim().min(1).max(60).optional(),
  assignedToId: idSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListGrievancesQuery = z.infer<typeof listGrievancesQuerySchema>;

/** Allowed status moves. Closed grievances can be reopened into IN_PROGRESS by staff. */
export const GRIEVANCE_TRANSITIONS: Readonly<Record<GrievanceStatus, readonly GrievanceStatus[]>> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: ["IN_PROGRESS"],
  REJECTED: ["IN_PROGRESS"],
};
