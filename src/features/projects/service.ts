import { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope, unitPathScopeFilter } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { ProjectDto, PublicProjectDto } from "@/types/api";
import { assertEditable, nextStatus, transitionCapability, type WorkflowAction } from "@/features/content/workflow";
import type { CreateProjectInput, ListProjectsQuery, PublicProjectsQuery, UpdateProjectInput } from "@/features/projects/validators";
import { decimalToString } from "@/features/schemes/service";

const MODULE = "projects" as const;

const projectInclude = {
  tenant: { select: { id: true, unitId: true, unit: { select: { path: true } } } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function toProjectDto(p: ProjectRow): ProjectDto {
  return {
    id: p.id,
    tenantId: p.tenantId,
    stage: p.stage,
    nameEn: p.nameEn,
    nameMr: p.nameMr,
    descriptionEn: p.descriptionEn,
    descriptionMr: p.descriptionMr,
    wardNo: p.wardNo,
    year: p.year,
    budget: decimalToString(p.budget),
    familiesBenefited: p.familiesBenefited,
    outcomeEn: p.outcomeEn,
    outcomeMr: p.outcomeMr,
    coverImageId: p.coverImageId,
    status: p.status,
    createdById: p.createdById,
    submittedAt: p.submittedAt?.toISOString() ?? null,
    reviewedById: p.reviewedById,
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
    reviewNote: p.reviewNote,
    publishedById: p.publishedById,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toPublicDto(p: ProjectRow): PublicProjectDto {
  return {
    id: p.id,
    stage: p.stage,
    nameEn: p.nameEn,
    nameMr: p.nameMr,
    descriptionEn: p.descriptionEn,
    descriptionMr: p.descriptionMr,
    wardNo: p.wardNo,
    year: p.year,
    budget: decimalToString(p.budget),
    familiesBenefited: p.familiesBenefited,
    outcomeEn: p.outcomeEn,
    outcomeMr: p.outcomeMr,
    coverImageId: p.coverImageId,
    publishedAt: p.publishedAt?.toISOString() ?? null,
  };
}

/** Load a project the actor can see (tenant unit inside scope); 404 otherwise. */
async function findInScope(ctx: AuthContext, id: string): Promise<ProjectRow> {
  const row = await db.project.findFirst({ where: { id, deletedAt: null }, include: projectInclude });
  if (!row) throw Errors.notFound("Project");
  assertInScope(ctx, row.tenant.unit.path, "Project");
  return row;
}

/** A cover image must belong to the same tenant (or be shared from an ancestor) and not be deleted. */
async function validateCoverImage(tenantId: string, tenantPath: string, coverImageId: string) {
  const media = await db.media.findFirst({
    where: { id: coverImageId, deletedAt: null, kind: "IMAGE" },
    select: { tenantId: true, ownerUnit: { select: { path: true } } },
  });
  if (!media) throw Errors.badRequest("Cover image not found");
  const allowed = media.tenantId === tenantId || (media.tenantId === null && tenantPath.startsWith(media.ownerUnit.path));
  if (!allowed) throw Errors.badRequest("Cover image belongs to another website");
}

function baseData(input: Partial<CreateProjectInput>): Prisma.ProjectUncheckedUpdateInput {
  const data: Prisma.ProjectUncheckedUpdateInput = {};
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameMr !== undefined) data.nameMr = input.nameMr;
  if (input.descriptionEn !== undefined) data.descriptionEn = input.descriptionEn;
  if (input.descriptionMr !== undefined) data.descriptionMr = input.descriptionMr;
  if (input.wardNo !== undefined) data.wardNo = input.wardNo;
  if (input.year !== undefined) data.year = input.year;
  if (input.budget !== undefined) data.budget = input.budget === null ? null : new Prisma.Decimal(input.budget.toFixed(2));
  if (input.familiesBenefited !== undefined) data.familiesBenefited = input.familiesBenefited;
  if (input.outcomeEn !== undefined) data.outcomeEn = input.outcomeEn;
  if (input.outcomeMr !== undefined) data.outcomeMr = input.outcomeMr;
  if (input.coverImageId !== undefined) data.coverImageId = input.coverImageId;
  return data;
}

// ---------------------------------------------------------------------------
// Admin: queries
// ---------------------------------------------------------------------------

export async function listProjects(ctx: AuthContext, query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    tenant: { unit: unitPathScopeFilter(ctx) },
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.year ? { year: query.year } : {}),
    ...(query.q ? { OR: [{ nameEn: { contains: query.q, mode: "insensitive" } }, { nameMr: { contains: query.q } }] } : {}),
  };
  const rows = await db.project.findMany({
    where,
    include: projectInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toProjectDto) };
}

export async function getProject(ctx: AuthContext, id: string): Promise<ProjectDto> {
  return toProjectDto(await findInScope(ctx, id));
}

// ---------------------------------------------------------------------------
// Admin: mutations
// ---------------------------------------------------------------------------

export async function createProject(ctx: AuthContext, input: CreateProjectInput, client: ClientInfo): Promise<ProjectDto> {
  const tenant = await getTenantForActor(ctx, input.tenantId);
  assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
  if (input.coverImageId) await validateCoverImage(tenant.id, tenant.unitPath, input.coverImageId);

  const created = await db.$transaction(async (tx) => {
    const row = await tx.project.create({
      data: {
        ...(baseData(input) as Prisma.ProjectUncheckedCreateInput),
        stage: input.stage,
        tenantId: tenant.id,
        createdById: ctx.user.id,
      },
      include: projectInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "project.create", entityType: "Project", entityId: row.id, tenantId: tenant.id, unitId: tenant.unitId, after: toProjectDto(row) },
      tx,
    );
    return row;
  });
  return toProjectDto(created);
}

export async function updateProject(ctx: AuthContext, id: string, input: UpdateProjectInput, client: ClientInfo): Promise<ProjectDto> {
  const before = await findInScope(ctx, id);
  assertEditable(before.status);
  assertCan(ctx, "content:edit", { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  if (input.coverImageId) await validateCoverImage(before.tenantId, before.tenant.unit.path, input.coverImageId);

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.project.update({
      where: { id },
      data: {
        ...baseData(input),
        ...(before.status === "REJECTED" ? { status: "DRAFT", reviewNote: null } : {}),
      },
      include: projectInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "project.update", entityType: "Project", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: toProjectDto(before), after: toProjectDto(row) },
      tx,
    );
    return row;
  });
  return toProjectDto(updated);
}

export async function transitionProject(
  ctx: AuthContext,
  id: string,
  action: WorkflowAction,
  note: string | null | undefined,
  client: ClientInfo,
): Promise<ProjectDto> {
  const before = await findInScope(ctx, id);
  assertCan(ctx, transitionCapability(action), { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  const to = nextStatus(before.status, action, note);
  const now = new Date();

  const data: Prisma.ProjectUncheckedUpdateInput = { status: to };
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
    const row = await tx.project.update({ where: { id }, data, include: projectInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `project.${action}`, entityType: "Project", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: { status: before.status }, after: { status: to, note: note ?? null } },
      tx,
    );
    return row;
  });
  return toProjectDto(updated);
}

export async function deleteProject(ctx: AuthContext, id: string, client: ClientInfo): Promise<void> {
  const before = await findInScope(ctx, id);
  if (before.status === "PUBLISHED") throw Errors.conflict("Unpublish or archive the project before deleting it");
  assertCan(ctx, "content:edit", { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "project.delete", entityType: "Project", entityId: id, tenantId: before.tenantId, unitId: before.tenant.unitId, before: { status: before.status } },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Published projects of a published website, optionally filtered by stage/year. */
export async function listPublicProjects(tenantSlug: string, query: PublicProjectsQuery) {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const rows = await db.project.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      status: "PUBLISHED",
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.year ? { year: query.year } : {}),
    },
    include: projectInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toPublicDto) };
}
