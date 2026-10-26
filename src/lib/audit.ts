import type { Role } from "@/generated/prisma/enums";
import type { AuthContext } from "@/lib/auth";
import { db, type Tx } from "@/lib/db";
import type { ClientInfo } from "@/lib/http";
import { primaryRole } from "@/lib/permissions";

export interface AuditEntry {
  action: string; // e.g. "announcement.publish", "user.create", "auth.login"
  entityType: string; // e.g. "Announcement"
  entityId?: string | null;
  tenantId?: string | null;
  unitId?: string | null;
  before?: unknown;
  after?: unknown;
}

export interface AuditActor {
  userId: string | null;
  role?: Role | null;
  client?: ClientInfo | null;
}

export function actorFromContext(ctx: AuthContext | null, client?: ClientInfo | null): AuditActor {
  return { userId: ctx?.user.id ?? null, role: ctx ? primaryRole(ctx) : null, client: client ?? null };
}

/**
 * Append an audit event. Pass the transaction client when the event must be atomic with the
 * change it records. Audit rows are never updated or deleted by application code.
 */
export async function writeAudit(actor: AuditActor, entry: AuditEntry, tx: Tx | typeof db = db): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: actor.userId,
      actorRole: actor.role ?? null,
      tenantId: entry.tenantId ?? null,
      unitId: entry.unitId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? undefined : toJson(entry.before),
      after: entry.after === undefined ? undefined : toJson(entry.after),
      ipAddress: actor.client?.ipAddress ?? null,
      userAgent: actor.client?.userAgent?.slice(0, 512) ?? null,
    },
  });
}

function toJson(value: unknown) {
  // Strip undefined / Date / Decimal into plain JSON for the Json column.
  return JSON.parse(JSON.stringify(value)) as object;
}
