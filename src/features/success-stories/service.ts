import type { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope, unitPathScopeFilter } from "@/lib/permissions";
import { revalidateWebsitesUnder } from "@/lib/revalidate";
import { getPublicTenantBySlug, getTenantForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { PublicSuccessStoryDto, SuccessStoryDto } from "@/types/api";
import { assertEditable, nextStatus, transitionCapability, type WorkflowAction } from "@/features/content/workflow";
import { assertUsableMedia } from "@/features/media/ownership";
import type { CreateStoryInput, ListStoriesQuery, PublicStoriesQuery, UpdateStoryInput } from "@/features/success-stories/validators";

/**
 * Citizen success stories ("Read Story"). Tenant-owned, same draft → review → publish workflow as
 * projects. Data-entry operators need the `pages` module (stories are page content).
 * A story that names or pictures a person cannot be submitted until `consentConfirmed` is true.
 */
const MODULE = "pages" as const;

const storyInclude = {
  tenant: { select: { id: true, unitId: true, unit: { select: { path: true } } } },
} satisfies Prisma.SuccessStoryInclude;

type StoryRow = Prisma.SuccessStoryGetPayload<{ include: typeof storyInclude }>;

export function toStoryDto(s: StoryRow): SuccessStoryDto {
  return {
    ...publicFields(s),
    tenantId: s.tenantId,
    consentConfirmed: s.consentConfirmed,
    sortOrder: s.sortOrder,
    status: s.status,
    createdById: s.createdById,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    reviewedById: s.reviewedById,
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
    reviewNote: s.reviewNote,
    publishedById: s.publishedById,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function publicFields(s: StoryRow): PublicSuccessStoryDto {
  return {
    id: s.id,
    pageKey: s.pageKey,
    titleEn: s.titleEn,
    titleMr: s.titleMr,
    summaryEn: s.summaryEn,
    summaryMr: s.summaryMr,
    bodyEn: s.bodyEn,
    bodyMr: s.bodyMr,
    quoteEn: s.quoteEn,
    quoteMr: s.quoteMr,
    personName: s.personName,
    personRoleEn: s.personRoleEn,
    personRoleMr: s.personRoleMr,
    location: s.location,
    photoId: s.photoId,
    projectId: s.projectId,
    schemeId: s.schemeId,
    publishedAt: s.publishedAt?.toISOString() ?? null,
  };
}

async function findInScope(ctx: AuthContext, id: string): Promise<StoryRow> {
  const row = await db.successStory.findFirst({ where: { id, deletedAt: null }, include: storyInclude });
  if (!row) throw Errors.notFound("Success story");
  assertInScope(ctx, row.tenant.unit.path, "Success story");
  return row;
}

/** Photo, project and scheme references must belong to (or be visible on) the same website. */
async function validateRefs(tenantId: string, unitPath: string, input: Partial<CreateStoryInput>) {
  if (input.photoId) await assertUsableMedia(input.photoId, { tenantId, unitPath }, { kind: "IMAGE", label: "Photo" });
  if (input.projectId) {
    const project = await db.project.findFirst({ where: { id: input.projectId, tenantId, deletedAt: null }, select: { id: true } });
    if (!project) throw Errors.badRequest("Project not found on this website");
  }
  if (input.schemeId) {
    const ancestorIds = unitPath.split("/").filter(Boolean);
    const scheme = await db.scheme.findFirst({
      where: { id: input.schemeId, deletedAt: null, OR: [{ tenantId }, { tenantId: null, targets: { some: { unitId: { in: ancestorIds } } } }] },
      select: { id: true },
    });
    if (!scheme) throw Errors.badRequest("Scheme not found on this website");
  }
}

function baseData(input: Partial<CreateStoryInput>): Prisma.SuccessStoryUncheckedUpdateInput {
  const data: Prisma.SuccessStoryUncheckedUpdateInput = {};
  const keys = [
    "pageKey", "titleEn", "titleMr", "summaryEn", "summaryMr", "bodyEn", "bodyMr", "quoteEn", "quoteMr",
    "personName", "personRoleEn", "personRoleMr", "location", "photoId", "projectId", "schemeId", "consentConfirmed", "sortOrder",
  ] as const;
  for (const key of keys) {
    if (input[key] !== undefined) (data as Record<string, unknown>)[key] = input[key];
  }
  return data;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listStories(ctx: AuthContext, query: ListStoriesQuery) {
  const rows = await db.successStory.findMany({
    where: {
      deletedAt: null,
      tenant: { unit: unitPathScopeFilter(ctx) },
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.pageKey ? { pageKey: query.pageKey } : {}),
      ...(query.q ? { OR: [{ titleEn: { contains: query.q, mode: "insensitive" } }, { titleMr: { contains: query.q } }, { personName: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    include: storyInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toStoryDto) };
}

export async function getStory(ctx: AuthContext, id: string): Promise<SuccessStoryDto> {
  return toStoryDto(await findInScope(ctx, id));
}

export async function createStory(ctx: AuthContext, input: CreateStoryInput, client: ClientInfo): Promise<SuccessStoryDto> {
  const tenant = await getTenantForActor(ctx, input.tenantId);
  assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
  await validateRefs(tenant.id, tenant.unitPath, input);
  const created = await db.$transaction(async (tx) => {
    const row = await tx.successStory.create({
      data: { ...(baseData(input) as Prisma.SuccessStoryUncheckedCreateInput), pageKey: input.pageKey, tenantId: tenant.id, createdById: ctx.user.id },
      include: storyInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "success_story.create", entityType: "SuccessStory", entityId: row.id, tenantId: tenant.id, unitId: tenant.unitId, after: { pageKey: row.pageKey, titleEn: row.titleEn } },
      tx,
    );
    return row;
  });
  return toStoryDto(created);
}

export async function updateStory(ctx: AuthContext, id: string, input: UpdateStoryInput, client: ClientInfo): Promise<SuccessStoryDto> {
  const before = await findInScope(ctx, id);
  assertEditable(before.status);
  assertCan(ctx, "content:edit", { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  await validateRefs(before.tenantId, before.tenant.unit.path, input);
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.successStory.update({
      where: { id },
      data: { ...baseData(input), ...(before.status === "REJECTED" ? { status: "DRAFT", reviewNote: null } : {}) },
      include: storyInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "success_story.update", entityType: "SuccessStory", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: { status: before.status }, after: { status: row.status } },
      tx,
    );
    return row;
  });
  return toStoryDto(updated);
}

export async function transitionStory(ctx: AuthContext, id: string, action: WorkflowAction, note: string | null | undefined, client: ClientInfo): Promise<SuccessStoryDto> {
  const before = await findInScope(ctx, id);
  assertCan(ctx, transitionCapability(action), { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  const to = nextStatus(before.status, action, note);
  if (action === "submit" && (before.personName || before.photoId) && !before.consentConfirmed) {
    throw Errors.badRequest("Confirm that the person agreed to be named or pictured before submitting this story");
  }
  const now = new Date();
  const data: Prisma.SuccessStoryUncheckedUpdateInput = { status: to };
  if (action === "submit") Object.assign(data, { submittedAt: now, reviewNote: null });
  if (action === "approve" || action === "reject") Object.assign(data, { reviewedById: ctx.user.id, reviewedAt: now, reviewNote: note ?? null });
  if (action === "publish") Object.assign(data, { publishedById: ctx.user.id, publishedAt: now });

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.successStory.update({ where: { id }, data, include: storyInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `success_story.${action}`, entityType: "SuccessStory", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: { status: before.status }, after: { status: to, note: note ?? null } },
      tx,
    );
    return row;
  });
  if (action === "publish" || action === "unpublish" || action === "archive") await revalidateWebsitesUnder(before.tenant.unit.path);
  return toStoryDto(updated);
}

export async function deleteStory(ctx: AuthContext, id: string, client: ClientInfo): Promise<void> {
  const before = await findInScope(ctx, id);
  if (before.status === "PUBLISHED") throw Errors.conflict("Unpublish or archive the story before deleting it");
  assertCan(ctx, "content:edit", { unitPath: before.tenant.unit.path, moduleKey: MODULE });
  await db.$transaction(async (tx) => {
    await tx.successStory.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "success_story.delete", entityType: "SuccessStory", entityId: id, tenantId: before.tenantId, unitId: before.tenant.unitId, before: { status: before.status } },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function listPublicStories(tenantSlug: string, query: PublicStoriesQuery) {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const rows = await db.successStory.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      status: "PUBLISHED",
      ...(query.page ? { pageKey: query.page } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.schemeId ? { schemeId: query.schemeId } : {}),
    },
    include: storyInclude,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(publicFields) };
}

export async function getPublicStory(tenantSlug: string, id: string): Promise<PublicSuccessStoryDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const row = await db.successStory.findFirst({ where: { id, tenantId: tenant.id, deletedAt: null, status: "PUBLISHED" }, include: storyInclude });
  if (!row) throw Errors.notFound("Success story");
  return publicFields(row);
}
