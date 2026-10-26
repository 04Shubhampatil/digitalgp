import { z } from "zod";
import { MODULE_KEYS } from "@/config/modules";
import { emailSchema, idSchema, localeSchema, paginationQuerySchema, passwordSchema, phoneSchema, shortText } from "@/lib/validation";

export const roleSchema = z.enum(["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"]);

export const modulesSchema = z
  .array(z.object({ moduleKey: z.enum(MODULE_KEYS), canWrite: z.boolean().default(true) }))
  .min(1)
  .max(MODULE_KEYS.length)
  .refine((arr) => new Set(arr.map((m) => m.moduleKey)).size === arr.length, "Duplicate module keys");

export const assignmentInputSchema = z.object({
  role: roleSchema,
  unitId: idSchema,
  /** Required for DATA_ENTRY_OPERATOR, forbidden for other roles. */
  modules: modulesSchema.optional(),
});
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const createUserSchema = z.object({
  email: emailSchema,
  name: shortText,
  phone: phoneSchema.optional().nullable(),
  locale: localeSchema.optional(),
  /** Omit to have a temporary password generated and returned once. */
  password: passwordSchema.optional(),
  assignment: assignmentInputSchema,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: shortText.optional(),
    phone: phoneSchema.nullable().optional(),
    locale: localeSchema.optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateModulesSchema = z.object({ modules: modulesSchema });

export const listUsersQuerySchema = paginationQuerySchema.extend({
  unitId: idSchema.optional(),
  role: roleSchema.optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
