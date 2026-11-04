import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import { ROLE_CAPABILITIES } from "@/lib/permissions";
import { EXPORT_MAX_ROWS, toCsv } from "@/lib/csv";
import { idSchema, paginate, paginationQuerySchema } from "@/lib/validation";
import type { AuditLogDto } from "@/types/api";

export const auditResultSchema = z.enum(["SUCCESS", "FAILURE", "DENIED"]);

export const listAuditQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  unitId: idSchema.optional(),
  actorId: idSchema.optional(),
  action: z.string().trim().min(1).max(80).optional(),
  entityType: z.string().trim().min(1).max(40).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  result: auditResultSchema.optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

const auditInclude = {
  actor: { select: { name: true, email: true } },
  tenant: { select: { slug: true, nameEn: true } },
} satisfies Prisma.AuditLogInclude;
type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

function toDto(a: AuditRow): AuditLogDto {
  return {
    id: a.id,
    actorId: a.actorId,
    actorName: a.actor?.name ?? null,
    actorEmail: a.actor?.email ?? null,
    actorRole: a.actorRole,
    tenantSlug: a.tenant?.slug ?? null,
    tenantName: a.tenant?.nameEn ?? null,
    result: a.result as AuditLogDto["result"],
    ipAddress: a.ipAddress,
    userAgent: a.userAgent,
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
function auditWhere(ctx: AuthContext, query: Omit<ListAuditQuery, "limit" | "cursor">): Prisma.AuditLogWhereInput {
  const readPaths = ctx.assignments.filter((a) => ROLE_CAPABILITIES[a.role].has("audit:read")).map((a) => a.unitPath);
  const ownOnly = ctx.assignments.some((a) => ROLE_CAPABILITIES[a.role].has("audit:read-own"));
  if (readPaths.length === 0 && !ownOnly) throw Errors.forbidden();

  const visibility: Prisma.AuditLogWhereInput[] = [{ actorId: ctx.user.id }];
  if (readPaths.length) {
    const pathFilter = { OR: readPaths.map((p) => ({ path: { startsWith: p } })) };
    visibility.push(
      { tenant: { unit: pathFilter } },
      { unit: pathFilter },
      // Sign-in events (incl. failed / blocked ones) carry no website: show them for staff whose active role is in scope.
      { action: { startsWith: "auth." }, actor: { roleAssignments: { some: { revokedAt: null, unit: pathFilter } } } },
    );
  }

  return {
    OR: visibility,
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.unitId ? { unitId: query.unitId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.action ? { action: { startsWith: query.action } } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
    ...(query.result ? { result: query.result } : {}),
  };
}

export async function listAuditLogs(ctx: AuthContext, query: ListAuditQuery) {
  const rows = await db.auditLog.findMany({
    where: auditWhere(ctx, query),
    include: auditInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toDto) };
}

/** Same filters and visibility as the list, as CSV rows (newest first, at most EXPORT_MAX_ROWS). Before/after payloads are left out. */
export async function exportAuditLogs(ctx: AuthContext, query: Omit<ListAuditQuery, "limit" | "cursor">): Promise<string> {
  const rows = await db.auditLog.findMany({
    where: auditWhere(ctx, query),
    include: auditInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: EXPORT_MAX_ROWS,
  });
  return toCsv(
    ["Time (UTC)", "Actor", "Actor email", "Role", "Action", "Entity", "Entity id", "Website", "Result", "IP address"],
    rows.map((a) => [a.createdAt, a.actor?.name ?? "", a.actor?.email ?? "", a.actorRole ?? "", a.action, a.entityType, a.entityId ?? "", a.tenant?.slug ?? "", a.result, a.ipAddress ?? ""]),
  );
}

export const exportAuditQuerySchema = listAuditQuerySchema.omit({ limit: true, cursor: true });
