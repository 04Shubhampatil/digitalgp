import { z } from "zod";
import { Errors } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

/** Prisma cuid() ids. */
export const idSchema = z.string().trim().min(10).max(40).regex(/^[a-z0-9]+$/, "Invalid id");

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email("Invalid email address"))
  .transform((v) => v.toLowerCase());

/** Minimum policy: 10+ chars with letters and digits. Max 128 to bound hashing cost. */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Password must contain letters and numbers");

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers and hyphens");

export const localeSchema = z.enum(["EN", "MR", "HI"]);

export const shortText = z.string().trim().min(1).max(200);
export const longText = z.string().trim().min(1).max(20_000);
export const optionalShortText = z.string().trim().max(200).optional().nullable();
export const optionalLongText = z.string().trim().max(20_000).optional().nullable();

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number");

// ---------------------------------------------------------------------------
// Pagination (cursor based)
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Helper for cursor pagination: fetch `limit + 1` rows ordered by id, then call this to split
 * the page from the cursor.
 */
export function paginate<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
  return { items, nextCursor, limit };
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

function toIssues(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message }));
}

/** Parse a JSON request body with a zod schema. Throws a 400 AppError on failure. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw Errors.badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) throw Errors.validation(toIssues(result.error));
  return result.data;
}

/** Parse URL search params with a zod schema. Throws a 400 AppError on failure. */
export function parseQuery<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) throw Errors.validation(toIssues(result.error));
  return result.data;
}

/** Validate an arbitrary value (e.g. JSON column) with a schema, throwing a 400 on failure. */
export function parseValue<S extends z.ZodType>(value: unknown, schema: S): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw Errors.validation(toIssues(result.error));
  return result.data;
}
