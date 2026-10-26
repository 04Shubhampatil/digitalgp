import type { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope, unitPathScopeFilter } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, getUnitForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { AnnouncementDto, PublicAnnouncementDto } from "@/types/api";
import { assertEditable, nextStatus, transitionCapability, type WorkflowAction } from "@/features/content/workflow";
import type {
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  PublicAnnouncementsQuery,
  UpdateAnnouncementInput,
} from "@/features/announcements/validators";

const MODULE = "announcements" as const;

const announcementInclude = {
  ownerUnit: { select: { id: true, path: true } },
  targets: { include: { unit: { select: { id: true, level: true, nameEn: true, nameMr: true } } } },
} satisfies Prisma.AnnouncementInclude;

type AnnouncementRow = Prisma.AnnouncementGetPayload<{ include: typeof announcementInclude }>;

export function toAnnouncementDto(a: AnnouncementRow): AnnouncementDto {
  return {
    id: a.id,
    tenantId: a.tenantId,
    ownerUnitId: a.ownerUnitId,
    category: a.category,
    priority: a.priority,
    titleEn: a.titleEn,
    titleMr: a.titleMr,
    bodyEn: a.bodyEn,
    bodyMr: a.bodyMr,
    attachmentId: a.attachmentId,
    displayPages: a.displayPages,
    status: a.status,
    publishAt: a.publishAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    targets: a.targets.map((t) => ({ unitId: t.unit.id, level: t.unit.level, nameEn: t.unit.nameEn, nameMr: t.unit.nameMr })),
    createdById: a.createdById,
    submittedAt: a.submittedAt?.toISOString() ?? null,
    reviewedById: a.reviewedById,
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    reviewNote: a.reviewNote,
    publishedById: a.publishedById,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function toPublicDto(a: AnnouncementRow): PublicAnnouncementDto {
  return {
    id: a.id,
    category: a.category,
    priority: a.priority,
    titleEn: a.titleEn,
    titleMr: a.titleMr,
    bodyEn: a.bodyEn,
    bodyMr: a.bodyMr,
    attachmentId: a.attachmentId,
    displayPages: a.displayPages,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    isShared: a.tenantId === null,
  };
}

/** Load an announcement the actor can see (owner unit inside scope); 404 otherwise. */
async function findInScope(ctx: AuthContext, id: string): Promise<AnnouncementRow> {
  const row = await db.announcement.findFirst({ where: { id, deletedAt: null }, include: announcementInclude });
  if (!row) throw Errors.notFound("Announcement");
  assertInScope(ctx, row.ownerUnit.path, "Announcement");
  return row;
}

/** Every target must lie inside the owner unit's subtree — explicit, bounded scope. */
async function validateTargets(ownerPath: string, targetUnitIds: string[]) {
  const unique = [...new Set(targetUnitIds)];
  const units = await db.adminUnit.findMany({ where: { id: { in: unique } }, select: { id: true, path: true } });
  if (units.length !== unique.length) throw Errors.badRequest("One or more target units do not exist");
  const outside = units.filter((u) => !u.path.startsWith(ownerPath));
  if (outside.length) throw Errors.badRequest("Targets must be within the owner unit's area", { unitIds: outside.map((u) => u.id) });
  return unique;
}

function baseData(input: Partial<CreateAnnouncementInput>): Prisma.AnnouncementUncheckedUpdateInput {
  const data: Prisma.AnnouncementUncheckedUpdateInput = {};
  if (input.category !== undefined) data.category = input.category;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.titleEn !== undefined) data.titleEn = input.titleEn;
  if (input.titleMr !== undefined) data.titleMr = input.titleMr;
  if (input.bodyEn !== undefined) data.bodyEn = input.bodyEn;
  if (input.bodyMr !== undefined) data.bodyMr = input.bodyMr;
  if (input.attachmentId !== undefined) data.attachmentId = input.attachmentId;
  if (input.displayPages !== undefined) data.displayPages = input.displayPages;
  if (input.publishAt !== undefined) data.publishAt = input.publishAt ? new Date(input.publishAt) : null;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  return data;
}

// ---------------------------------------------------------------------------
// Admin: queries
// ---------------------------------------------------------------------------

export async function listAnnouncements(ctx: AuthContext, query: ListAnnouncementsQuery) {
  const where: Prisma.AnnouncementWhereInput = {
    deletedAt: null,
    ownerUnit: unitPathScopeFilter(ctx),
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.q ? { OR: [{ titleEn: { contains: query.q, mode: "insensitive" } }, { titleMr: { contains: query.q } }] } : {}),
  };
  const rows = await db.announcement.findMany({
    where,
    include: announcementInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toAnnouncementDto) };
}

export async function getAnnouncement(ctx: AuthContext, id: string): Promise<AnnouncementDto> {
  return toAnnouncementDto(await findInScope(ctx, id));
}

// ---------------------------------------------------------------------------
// Admin: mutations
// ---------------------------------------------------------------------------

export async function createAnnouncement(ctx: AuthContext, input: CreateAnnouncementInput, client: ClientInfo): Promise<AnnouncementDto> {
  let tenantId: string | null = null;
  let ownerUnitId: string;
  let ownerPath: string;
  let targetUnitIds: string[] = [];

  if (input.tenantId) {
    const tenant = await getTenantForActor(ctx, input.tenantId);
    assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
    tenantId = tenant.id;
    ownerUnitId = tenant.unitId;
    ownerPath = tenant.unitPath;
  } else {
    const owner = await getUnitForActor(ctx, input.ownerUnitId!);
    if (owner.level === "GRAM_PANCHAYAT") throw Errors.badRequest("Use tenantId to create an announcement for a Gram Panchayat");
    assertCan(ctx, "content:share", { unitPath: owner.path });
    ownerUnitId = owner.id;
    ownerPath = owner.path;
    targetUnitIds = await validateTargets(owner.path, input.targetUnitIds!);
  }

  const created = await db.$transaction(async (tx) => {
    const row = await tx.announcement.create({
      data: {
        ...(baseData(input) as Prisma.AnnouncementUncheckedCreateInput),
        category: input.category,
        tenantId,
        ownerUnitId,
        createdById: ctx.user.id,
        targets: { create: targetUnitIds.map((unitId) => ({ unitId })) },
      },
      include: announcementInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "announcement.create", entityType: "Announcement", entityId: row.id, tenantId, unitId: ownerUnitId, after: toAnnouncementDto(row) },
      tx,
    );
    return row;
  });
  void ownerPath;
  return toAnnouncementDto(created);
}

export async function updateAnnouncement(ctx: AuthContext, id: string, input: UpdateAnnouncementInput, client: ClientInfo): Promise<AnnouncementDto> {
  const before = await findInScope(ctx, id);
  assertEditable(before.status);
  if (before.tenantId) {
    assertCan(ctx, "content:edit", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
    if (input.targetUnitIds) throw Errors.badRequest("Gram Panchayat announcements have no targets");
  } else {
    assertCan(ctx, "content:share", { unitPath: before.ownerUnit.path });
  }

  const targetUnitIds = input.targetUnitIds ? await validateTargets(before.ownerUnit.path, input.targetUnitIds) : null;

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.announcement.update({
      where: { id },
      data: {
        ...baseData(input),
        // Editing a rejected item returns it to draft for resubmission.
        ...(before.status === "REJECTED" ? { status: "DRAFT", reviewNote: null } : {}),
        ...(targetUnitIds ? { targets: { deleteMany: {}, create: targetUnitIds.map((unitId) => ({ unitId })) } } : {}),
      },
      include: announcementInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "announcement.update", entityType: "Announcement", entityId: id, tenantId: row.tenantId, unitId: row.ownerUnitId, before: toAnnouncementDto(before), after: toAnnouncementDto(row) },
      tx,
    );
    return row;
  });
  return toAnnouncementDto(updated);
}

export async function transitionAnnouncement(
  ctx: AuthContext,
  id: string,
  action: WorkflowAction,
  note: string | null | undefined,
  client: ClientInfo,
): Promise<AnnouncementDto> {
  const before = await findInScope(ctx, id);
  const capability = transitionCapability(action);
  // Shared announcements are governed by the owner unit; operators never reach them (scope).
  assertCan(ctx, capability, { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  const to = nextStatus(before.status, action, note);
  const now = new Date();

  const data: Prisma.AnnouncementUncheckedUpdateInput = { status: to };
  switch (action) {
    case "submit":
      data.submittedAt = now;
      data.reviewNote = null;
      break;
    case "approve":
    case "reject":
      data.reviewedById = ctx.user.id;
      data.reviewedAt = now;
      data.reviewNote = note ?? null;
      break;
    case "publish":
      data.publishedById = ctx.user.id;
      data.publishedAt = now;
      if (!before.publishAt || before.publishAt < now) data.publishAt = now;
      break;
    default:
      break;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.announcement.update({ where: { id }, data, include: announcementInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `announcement.${action}`, entityType: "Announcement", entityId: id, tenantId: row.tenantId, unitId: row.ownerUnitId, before: { status: before.status }, after: { status: to, note: note ?? null } },
      tx,
    );
    return row;
  });
  return toAnnouncementDto(updated);
}

export async function deleteAnnouncement(ctx: AuthContext, id: string, client: ClientInfo): Promise<void> {
  const before = await findInScope(ctx, id);
  if (before.status === "PUBLISHED") throw Errors.conflict("Unpublish or archive the announcement before deleting it");
  assertCan(ctx, before.tenantId ? "content:edit" : "content:share", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  await db.$transaction(async (tx) => {
    await tx.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "announcement.delete", entityType: "Announcement", entityId: id, tenantId: before.tenantId, unitId: before.ownerUnitId, before: { status: before.status } },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Published announcements visible on a tenant website: its own, plus shared ones whose targets
 * include the tenant's unit or any ancestor. Draft/private content never reaches this query.
 */
export async function listPublicAnnouncements(tenantSlug: string, query: PublicAnnouncementsQuery) {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const ancestorIds = tenant.unitPath.split("/").filter(Boolean);
  const now = new Date();
  const rows = await db.announcement.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ tenantId: tenant.id }, { tenantId: null, targets: { some: { unitId: { in: ancestorIds } } } }] },
      ],
      ...(query.page ? { displayPages: { has: query.page } } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
    },
    include: announcementInclude,
    orderBy: [{ publishAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toPublicDto) };
}
