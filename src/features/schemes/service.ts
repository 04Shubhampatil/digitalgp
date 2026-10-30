import { revalidateWebsitesUnder } from "@/lib/revalidate";
import { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope, unitPathScopeFilter } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, getUnitForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { PublicSchemeDto, SchemeDto } from "@/types/api";
import { assertEditable, nextStatus, transitionCapability, type WorkflowAction } from "@/features/content/workflow";
import type { CreateSchemeInput, ListSchemesQuery, PublicSchemesQuery, UpdateSchemeInput } from "@/features/schemes/validators";

const MODULE = "schemes" as const;

const schemeInclude = {
  ownerUnit: { select: { id: true, path: true } },
  targets: { include: { unit: { select: { id: true, level: true, nameEn: true, nameMr: true } } } },
} satisfies Prisma.SchemeInclude;

type SchemeRow = Prisma.SchemeGetPayload<{ include: typeof schemeInclude }>;

export function decimalToString(v: Prisma.Decimal | null): string | null {
  return v === null ? null : v.toFixed(2);
}

export function toSchemeDto(s: SchemeRow): SchemeDto {
  return {
    id: s.id,
    tenantId: s.tenantId,
    ownerUnitId: s.ownerUnitId,
    level: s.level,
    nameEn: s.nameEn,
    nameMr: s.nameMr,
    descriptionEn: s.descriptionEn,
    descriptionMr: s.descriptionMr,
    eligibilityEn: s.eligibilityEn,
    eligibilityMr: s.eligibilityMr,
    processEn: s.processEn,
    processMr: s.processMr,
    externalUrl: s.externalUrl,
    beneficiaryCount: s.beneficiaryCount,
    amountDisbursed: decimalToString(s.amountDisbursed),
    status: s.status,
    targets: s.targets.map((t) => ({ unitId: t.unit.id, level: t.unit.level, nameEn: t.unit.nameEn, nameMr: t.unit.nameMr })),
    createdById: s.createdById,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    reviewedById: s.reviewedById,
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
    reviewNote: s.reviewNote,
    publishedById: s.publishedById,
    publishedAt: s.publishedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function toPublicDto(s: SchemeRow): PublicSchemeDto {
  return {
    id: s.id,
    level: s.level,
    nameEn: s.nameEn,
    nameMr: s.nameMr,
    descriptionEn: s.descriptionEn,
    descriptionMr: s.descriptionMr,
    eligibilityEn: s.eligibilityEn,
    eligibilityMr: s.eligibilityMr,
    processEn: s.processEn,
    processMr: s.processMr,
    externalUrl: s.externalUrl,
    beneficiaryCount: s.beneficiaryCount,
    amountDisbursed: decimalToString(s.amountDisbursed),
    publishedAt: s.publishedAt?.toISOString() ?? null,
    isShared: s.tenantId === null,
  };
}

/** Load a scheme the actor can see (owner unit inside scope); 404 otherwise. */
async function findInScope(ctx: AuthContext, id: string): Promise<SchemeRow> {
  const row = await db.scheme.findFirst({ where: { id, deletedAt: null }, include: schemeInclude });
  if (!row) throw Errors.notFound("Scheme");
  assertInScope(ctx, row.ownerUnit.path, "Scheme");
  return row;
}

/** Every target must lie inside the owner unit subtree — explicit, bounded scope. */
async function validateTargets(ownerPath: string, targetUnitIds: string[]) {
  const unique = [...new Set(targetUnitIds)];
  const units = await db.adminUnit.findMany({ where: { id: { in: unique } }, select: { id: true, path: true } });
  if (units.length !== unique.length) throw Errors.badRequest("One or more target units do not exist");
  const outside = units.filter((u) => !u.path.startsWith(ownerPath));
  if (outside.length) throw Errors.badRequest("Targets must be within the owner unit's area", { unitIds: outside.map((u) => u.id) });
  return unique;
}

function baseData(input: Partial<CreateSchemeInput>): Prisma.SchemeUncheckedUpdateInput {
  const data: Prisma.SchemeUncheckedUpdateInput = {};
  if (input.level !== undefined) data.level = input.level;
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameMr !== undefined) data.nameMr = input.nameMr;
  if (input.descriptionEn !== undefined) data.descriptionEn = input.descriptionEn;
  if (input.descriptionMr !== undefined) data.descriptionMr = input.descriptionMr;
  if (input.eligibilityEn !== undefined) data.eligibilityEn = input.eligibilityEn;
  if (input.eligibilityMr !== undefined) data.eligibilityMr = input.eligibilityMr;
  if (input.processEn !== undefined) data.processEn = input.processEn;
  if (input.processMr !== undefined) data.processMr = input.processMr;
  if (input.externalUrl !== undefined) data.externalUrl = input.externalUrl;
  if (input.beneficiaryCount !== undefined) data.beneficiaryCount = input.beneficiaryCount;
  if (input.amountDisbursed !== undefined) {
    data.amountDisbursed = input.amountDisbursed === null ? null : new Prisma.Decimal(input.amountDisbursed.toFixed(2));
  }
  return data;
}

// ---------------------------------------------------------------------------
// Admin: queries
// ---------------------------------------------------------------------------

export async function listSchemes(ctx: AuthContext, query: ListSchemesQuery) {
  const where: Prisma.SchemeWhereInput = {
    deletedAt: null,
    ownerUnit: unitPathScopeFilter(ctx),
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.level ? { level: query.level } : {}),
    ...(query.q ? { OR: [{ nameEn: { contains: query.q, mode: "insensitive" } }, { nameMr: { contains: query.q } }] } : {}),
  };
  const rows = await db.scheme.findMany({
    where,
    include: schemeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toSchemeDto) };
}

export async function getScheme(ctx: AuthContext, id: string): Promise<SchemeDto> {
  return toSchemeDto(await findInScope(ctx, id));
}

// ---------------------------------------------------------------------------
// Admin: mutations
// ---------------------------------------------------------------------------

export async function createScheme(ctx: AuthContext, input: CreateSchemeInput, client: ClientInfo): Promise<SchemeDto> {
  let tenantId: string | null = null;
  let ownerUnitId: string;
  let targetUnitIds: string[] = [];

  if (input.tenantId) {
    const tenant = await getTenantForActor(ctx, input.tenantId);
    assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
    tenantId = tenant.id;
    ownerUnitId = tenant.unitId;
  } else {
    const owner = await getUnitForActor(ctx, input.ownerUnitId!);
    if (owner.level === "GRAM_PANCHAYAT") throw Errors.badRequest("Use tenantId to create a scheme for a Gram Panchayat");
    assertCan(ctx, "content:share", { unitPath: owner.path });
    ownerUnitId = owner.id;
    targetUnitIds = await validateTargets(owner.path, input.targetUnitIds!);
  }

  const created = await db.$transaction(async (tx) => {
    const row = await tx.scheme.create({
      data: {
        ...(baseData(input) as Prisma.SchemeUncheckedCreateInput),
        level: input.level,
        tenantId,
        ownerUnitId,
        createdById: ctx.user.id,
        targets: { create: targetUnitIds.map((unitId) => ({ unitId })) },
      },
      include: schemeInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "scheme.create", entityType: "Scheme", entityId: row.id, tenantId, unitId: ownerUnitId, after: toSchemeDto(row) },
      tx,
    );
    return row;
  });
  return toSchemeDto(created);
}

export async function updateScheme(ctx: AuthContext, id: string, input: UpdateSchemeInput, client: ClientInfo): Promise<SchemeDto> {
  const before = await findInScope(ctx, id);
  assertEditable(before.status);
  if (before.tenantId) {
    assertCan(ctx, "content:edit", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
    if (input.targetUnitIds) throw Errors.badRequest("Gram Panchayat schemes have no targets");
  } else {
    assertCan(ctx, "content:share", { unitPath: before.ownerUnit.path });
  }

  const targetUnitIds = input.targetUnitIds ? await validateTargets(before.ownerUnit.path, input.targetUnitIds) : null;

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.scheme.update({
      where: { id },
      data: {
        ...baseData(input),
        // Editing a rejected item returns it to draft for resubmission.
        ...(before.status === "REJECTED" ? { status: "DRAFT", reviewNote: null } : {}),
        ...(targetUnitIds ? { targets: { deleteMany: {}, create: targetUnitIds.map((unitId) => ({ unitId })) } } : {}),
      },
      include: schemeInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "scheme.update", entityType: "Scheme", entityId: id, tenantId: row.tenantId, unitId: row.ownerUnitId, before: toSchemeDto(before), after: toSchemeDto(row) },
      tx,
    );
    return row;
  });
  return toSchemeDto(updated);
}

export async function transitionScheme(
  ctx: AuthContext,
  id: string,
  action: WorkflowAction,
  note: string | null | undefined,
  client: ClientInfo,
): Promise<SchemeDto> {
  const before = await findInScope(ctx, id);
  assertCan(ctx, transitionCapability(action), { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  const to = nextStatus(before.status, action, note);
  const now = new Date();

  const data: Prisma.SchemeUncheckedUpdateInput = { status: to };
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
      break;
    default:
      break;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.scheme.update({ where: { id }, data, include: schemeInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `scheme.${action}`, entityType: "Scheme", entityId: id, tenantId: row.tenantId, unitId: row.ownerUnitId, before: { status: before.status }, after: { status: to, note: note ?? null } },
      tx,
    );
    return row;
  });
  return toSchemeDto(updated);
}

export async function deleteScheme(ctx: AuthContext, id: string, client: ClientInfo): Promise<void> {
  const before = await findInScope(ctx, id);
  if (before.status === "PUBLISHED") throw Errors.conflict("Unpublish or archive the scheme before deleting it");
  assertCan(ctx, before.tenantId ? "content:edit" : "content:share", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  await db.$transaction(async (tx) => {
    await tx.scheme.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "scheme.delete", entityType: "Scheme", entityId: id, tenantId: before.tenantId, unitId: before.ownerUnitId, before: { status: before.status } },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Published schemes on a tenant website: its own plus shared ones targeted at it or an ancestor. */
export async function listPublicSchemes(tenantSlug: string, query: PublicSchemesQuery) {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const ancestorIds = tenant.unitPath.split("/").filter(Boolean);
  const rows = await db.scheme.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
      OR: [{ tenantId: tenant.id }, { tenantId: null, targets: { some: { unitId: { in: ancestorIds } } } }],
      ...(query.level ? { level: query.level } : {}),
    },
    include: schemeInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toPublicDto) };
}
