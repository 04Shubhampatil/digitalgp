import type { AdminUnitLevel } from "@/generated/prisma/enums";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, isSuperAdmin, unitPathScopeFilter } from "@/lib/permissions";
import { getUnitForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { AdminUnitDto } from "@/types/api";
import type { CreateUnitInput, ListUnitsQuery, UpdateUnitInput } from "@/features/hierarchy/validators";

const LEVEL_ORDER: Record<AdminUnitLevel, number> = { STATE: 0, DISTRICT: 1, TALUKA: 2, BLOCK: 3, GRAM_PANCHAYAT: 4 };

const unitSelect = {
  id: true,
  level: true,
  code: true,
  nameEn: true,
  nameMr: true,
  slug: true,
  parentId: true,
  path: true,
  tenant: { select: { id: true } },
} as const;

type UnitRow = {
  id: string;
  level: AdminUnitLevel;
  code: string | null;
  nameEn: string;
  nameMr: string;
  slug: string;
  parentId: string | null;
  path: string;
  tenant: { id: string } | null;
};

export function toUnitDto(u: UnitRow): AdminUnitDto {
  return {
    id: u.id,
    level: u.level,
    code: u.code,
    nameEn: u.nameEn,
    nameMr: u.nameMr,
    slug: u.slug,
    parentId: u.parentId,
    path: u.path,
    tenantId: u.tenant?.id ?? null,
  };
}

/** Units within the caller's scope (any role). */
export async function listUnits(ctx: AuthContext, query: ListUnitsQuery) {
  const rows = await db.adminUnit.findMany({
    where: {
      ...unitPathScopeFilter(ctx),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.q
        ? { OR: [{ nameEn: { contains: query.q, mode: "insensitive" } }, { nameMr: { contains: query.q } }, { slug: { contains: query.q } }] }
        : {}),
    },
    select: unitSelect,
    orderBy: [{ path: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toUnitDto) };
}

/** Ancestor chain (root first) of a unit the caller can see — for breadcrumbs. */
export async function getUnitWithAncestors(ctx: AuthContext, unitId: string) {
  const unit = await getUnitForActor(ctx, unitId);
  const ancestorIds = unit.path.split("/").filter(Boolean).filter((id) => id !== unit.id);
  const ancestors = ancestorIds.length
    ? await db.adminUnit.findMany({ where: { id: { in: ancestorIds } }, select: unitSelect })
    : [];
  const byId = new Map(ancestors.map((a) => [a.id, a]));
  const full = await db.adminUnit.findUniqueOrThrow({ where: { id: unit.id }, select: unitSelect });
  return {
    unit: toUnitDto(full),
    ancestors: ancestorIds.map((id) => byId.get(id)).filter((a): a is UnitRow => !!a).map(toUnitDto),
  };
}

export async function createUnit(ctx: AuthContext, input: CreateUnitInput, client: ClientInfo): Promise<AdminUnitDto> {
  let parentPath = "/";
  if (input.parentId) {
    const parent = await getUnitForActor(ctx, input.parentId);
    assertCan(ctx, "hierarchy:manage", { unitPath: parent.path });
    if (LEVEL_ORDER[input.level] <= LEVEL_ORDER[parent.level]) {
      throw Errors.badRequest(`A ${input.level} unit cannot be created under a ${parent.level} unit`);
    }
    if (parent.level === "GRAM_PANCHAYAT") throw Errors.badRequest("Gram Panchayat units cannot have children");
    parentPath = parent.path;
  } else {
    if (input.level !== "STATE") throw Errors.badRequest("Only STATE units can be created without a parent");
    if (!isSuperAdmin(ctx)) throw Errors.forbidden();
  }

  const created = await db.$transaction(async (tx) => {
    const row = await tx.adminUnit.create({
      data: {
        level: input.level,
        parentId: input.parentId,
        slug: input.slug,
        nameEn: input.nameEn,
        nameMr: input.nameMr,
        code: input.code ?? null,
        path: "pending",
      },
    });
    const updated = await tx.adminUnit.update({ where: { id: row.id }, data: { path: `${parentPath}${row.id}/` }, select: unitSelect });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "hierarchy.unit_create", entityType: "AdminUnit", entityId: updated.id, unitId: updated.id, after: toUnitDto(updated) },
      tx,
    );
    return updated;
  });
  return toUnitDto(created);
}

export async function updateUnit(ctx: AuthContext, unitId: string, input: UpdateUnitInput, client: ClientInfo): Promise<AdminUnitDto> {
  const unit = await getUnitForActor(ctx, unitId);
  assertCan(ctx, "hierarchy:manage", { unitPath: unit.path });
  const before = await db.adminUnit.findUniqueOrThrow({ where: { id: unit.id }, select: unitSelect });
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.adminUnit.update({ where: { id: unit.id }, data: input, select: unitSelect });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "hierarchy.unit_update", entityType: "AdminUnit", entityId: unit.id, unitId: unit.id, before: toUnitDto(before), after: toUnitDto(row) },
      tx,
    );
    return row;
  });
  return toUnitDto(updated);
}
