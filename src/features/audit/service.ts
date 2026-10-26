import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import { ROLE_CAPABILITIES } from "@/lib/permissions";
import { idSchema, paginate, paginationQuerySchema } from "@/lib/validation";
import type { AuditLogDto } from "@/types/api";

export const listAuditQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  unitId: idSchema.optional(),
  actorId: idSchema.optional(),
  action: z.string().trim().min(1).max(80).optional(),
  entityType: z.string().trim().min(1).max(40).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

function toDto(a: Prisma.AuditLogGetPayload<Record<string, never>>): AuditLogDto {
  return {
    id: a.id,
    actorId: a.actorId,
    actorRole: a.actorRole,
    tenantId: a.tenantId,
    unitId: a.unitId,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    before: a.before,
    after: a.after,
    createdAt: a.createdAt.toISOString(),
  };
}

/**
 * Audit visibility:
 *  - roles with `audit:read` see events whose tenant or unit lies inside their scope
 *  - everyone sees their own actions (`audit:read-own`)
 */
export async function listAuditLogs(ctx: AuthContext, query: ListAuditQuery) {
  const readPaths = ctx.assignments.filter((a) => ROLE_CAPABILITIES[a.role].has("audit:read")).map((a) => a.unitPath);
  const ownOnly = ctx.assignments.some((a) => ROLE_CAPABILITIES[a.role].has("audit:read-own"));
  if (readPaths.length === 0 && !ownOnly) throw Errors.forbidden();

  const visibility: Prisma.AuditLogWhereInput[] = [{ actorId: ctx.user.id }];
  if (readPaths.length) {
    const pathFilter = { OR: readPaths.map((p) => ({ path: { startsWith: p } })) };
    visibility.push({ tenant: { unit: pathFilter } }, { unit: pathFilter });
  }

  const rows = await db.auditLog.findMany({
    where: {
      OR: visibility,
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toDto) };
}
