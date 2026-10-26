import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_PAGE_KEYS } from "@/config/pages";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, unitPathScopeFilter } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, getUnitForActor } from "@/lib/tenant";
import { paginate, parseValue } from "@/lib/validation";
import type { PublicTenantDto, TenantDto, TenantSettingsDto } from "@/types/api";
import {
  tenantSettingsSchema,
  type CreateTenantInput,
  type ListTenantsQuery,
  type UpdateTenantInput,
} from "@/features/tenants/validators";

type TenantRow = Prisma.TenantGetPayload<Record<string, never>>;

export function toTenantDto(t: TenantRow): TenantDto {
  return {
    id: t.id,
    unitId: t.unitId,
    slug: t.slug,
    customDomain: t.customDomain,
    nameEn: t.nameEn,
    nameMr: t.nameMr,
    status: t.status,
    defaultLocale: t.defaultLocale,
    settings: (t.settings ?? {}) as TenantSettingsDto,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function listTenants(ctx: AuthContext, query: ListTenantsQuery) {
  const scope = unitPathScopeFilter(ctx);
  const rows = await db.tenant.findMany({
    where: {
      unit: query.unitId ? { AND: [scope, { path: { contains: `/${query.unitId}/` } }] } : scope,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ nameEn: { contains: query.q, mode: "insensitive" } }, { nameMr: { contains: query.q } }, { slug: { contains: query.q } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toTenantDto) };
}

export async function getTenant(ctx: AuthContext, tenantId: string): Promise<TenantDto> {
  const resolved = await getTenantForActor(ctx, tenantId);
  const row = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id } });
  return toTenantDto(row);
}

export async function createTenant(ctx: AuthContext, input: CreateTenantInput, client: ClientInfo): Promise<TenantDto> {
  const unit = await getUnitForActor(ctx, input.unitId);
  if (unit.level !== "GRAM_PANCHAYAT") throw Errors.badRequest("A website can only be created for a Gram Panchayat unit");
  assertCan(ctx, "tenant:create", { unitPath: unit.path });

  const existing = await db.tenant.findUnique({ where: { unitId: unit.id } });
  if (existing) throw Errors.conflict("This Gram Panchayat already has a website");

  const created = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        unitId: unit.id,
        slug: input.slug,
        nameEn: input.nameEn,
        nameMr: input.nameMr,
        customDomain: input.customDomain ?? null,
        defaultLocale: input.defaultLocale ?? "MR",
        settings: (input.settings ?? {}) as Prisma.InputJsonValue,
        pages: { create: DEFAULT_PAGE_KEYS.map((pageKey) => ({ pageKey })) },
      },
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "tenant.create", entityType: "Tenant", entityId: tenant.id, tenantId: tenant.id, unitId: unit.id, after: toTenantDto(tenant) },
      tx,
    );
    return tenant;
  });
  return toTenantDto(created);
}

export async function updateTenant(ctx: AuthContext, tenantId: string, input: UpdateTenantInput, client: ClientInfo): Promise<TenantDto> {
  const resolved = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "tenant:update", { unitPath: resolved.unitPath });
  const before = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id } });

  const data: Prisma.TenantUpdateInput = {};
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameMr !== undefined) data.nameMr = input.nameMr;
  if (input.customDomain !== undefined) data.customDomain = input.customDomain;
  if (input.defaultLocale !== undefined) data.defaultLocale = input.defaultLocale;
  if (input.settings !== undefined) {
    // Merge shallowly so clients can update one group without resending everything.
    const merged = { ...((before.settings as object) ?? {}), ...input.settings };
    data.settings = parseValue(merged, tenantSettingsSchema) as Prisma.InputJsonValue;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.tenant.update({ where: { id: resolved.id }, data });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "tenant.update", entityType: "Tenant", entityId: row.id, tenantId: row.id, unitId: row.unitId, before: toTenantDto(before), after: toTenantDto(row) },
      tx,
    );
    return row;
  });
  return toTenantDto(updated);
}

export async function setTenantStatus(ctx: AuthContext, tenantId: string, status: "DRAFT" | "PUBLISHED" | "SUSPENDED", client: ClientInfo) {
  const resolved = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "tenant:publish", { unitPath: resolved.unitPath });
  const before = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id } });
  if (before.status === status) return toTenantDto(before);

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.tenant.update({
      where: { id: resolved.id },
      data: { status, ...(status === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}) },
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `tenant.status.${status.toLowerCase()}`, entityType: "Tenant", entityId: row.id, tenantId: row.id, unitId: row.unitId, before: { status: before.status }, after: { status } },
      tx,
    );
    return row;
  });
  return toTenantDto(updated);
}

/** Public, published-only tenant profile. */
export async function getPublicTenant(slug: string): Promise<PublicTenantDto> {
  const resolved = await getPublicTenantBySlug(slug);
  const row = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id }, select: { id: true, slug: true, nameEn: true, nameMr: true, defaultLocale: true, settings: true } });
  return { ...row, settings: (row.settings ?? {}) as TenantSettingsDto };
}
