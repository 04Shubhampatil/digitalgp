import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_PAGE_KEYS, OPTIONAL_PAGE_KEYS } from "@/config/pages";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db, type Tx } from "@/lib/db";
import { Errors, isAppError } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, unitPathScopeFilter } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, getUnitForActor } from "@/lib/tenant";
import { revalidatePublicTags, tenantTag } from "@/lib/revalidate";
import { getStorage } from "@/lib/storage";
import { paginate, parseValue } from "@/lib/validation";
import type { CreateTenantWithUsersResultDto, ModuleKey, PublicTenantDto, TenantAdminRefDto, TenantDto, TenantSettingsDto, TenantUserDto, UserDto } from "@/types/api";
import { insertPreparedUser, prepareUser, type PreparedUser } from "@/features/users/service";
import { EXPORT_MAX_ROWS, toCsv } from "@/lib/csv";
import {
  tenantSettingsSchema,
  type CreateTenantInput,
  type CreateTenantWithUsersInput,
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

function tenantListWhere(ctx: AuthContext, query: Omit<ListTenantsQuery, "limit" | "cursor">): Prisma.TenantWhereInput {
  const scope = unitPathScopeFilter(ctx);
  return {
    unit: query.unitId ? { AND: [scope, { path: { contains: `/${query.unitId}/` } }] } : scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { OR: [{ nameEn: { contains: query.q, mode: "insensitive" } }, { nameMr: { contains: query.q } }, { slug: { contains: query.q } }] } : {}),
  };
}

type TenantWithUnit = TenantRow & { unit: { path: string } };

/**
 * Active Taluka Admins (and older Block Admin accounts) whose area contains each website (the "Taluka Admin" column).
 * Only names and emails of staff are returned, and only to callers who can already see the website.
 */
async function blockAdminsByTenant(rows: TenantWithUnit[]): Promise<Map<string, TenantAdminRefDto[]>> {
  const ancestorIds = [...new Set(rows.flatMap((t) => t.unit.path.split("/").filter(Boolean)))];
  const assignments = ancestorIds.length
    ? await db.roleAssignment.findMany({
        where: { role: { in: ["TALUKA_ADMIN", "BLOCK_ADMIN"] }, revokedAt: null, unitId: { in: ancestorIds }, user: { status: "ACTIVE" } },
        select: { unitId: true, user: { select: { id: true, name: true, email: true } } },
      })
    : [];
  const result = new Map<string, TenantAdminRefDto[]>();
  for (const t of rows) {
    const ids = new Set(t.unit.path.split("/").filter(Boolean));
    const admins = assignments.filter((a) => ids.has(a.unitId)).map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email }));
    result.set(t.id, [...new Map(admins.map((a) => [a.id, a])).values()]);
  }
  return result;
}

/** Active GP Admins and the number of active Data Entry Operators of each website (for the websites list). */
async function siteUsersByTenant(rows: TenantRow[]): Promise<Map<string, { gpAdmins: TenantAdminRefDto[]; operatorCount: number }>> {
  const assignments = rows.length
    ? await db.roleAssignment.findMany({
        where: { role: { in: ["GP_ADMIN", "DATA_ENTRY_OPERATOR"] }, revokedAt: null, unitId: { in: rows.map((t) => t.unitId) }, user: { status: "ACTIVE", deletedAt: null } },
        select: { unitId: true, role: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  return new Map(
    rows.map((t) => {
      const here = assignments.filter((a) => a.unitId === t.unitId);
      return [t.id, { gpAdmins: here.filter((a) => a.role === "GP_ADMIN").map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email })), operatorCount: here.filter((a) => a.role === "DATA_ENTRY_OPERATOR").length }];
    }),
  );
}

export async function listTenants(ctx: AuthContext, query: ListTenantsQuery) {
  const rows = await db.tenant.findMany({
    where: tenantListWhere(ctx, query),
    include: { unit: { select: { path: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  const [admins, siteUsers] = await Promise.all([blockAdminsByTenant(page.items), siteUsersByTenant(page.items)]);
  return {
    ...page,
    items: page.items.map((t) => ({ ...toTenantDto(t), blockAdmins: admins.get(t.id) ?? [], gpAdmins: siteUsers.get(t.id)?.gpAdmins ?? [], operatorCount: siteUsers.get(t.id)?.operatorCount ?? 0 })),
  };
}

/** GP websites list as CSV (same filters and scope as the list, at most EXPORT_MAX_ROWS). */
export async function exportTenants(ctx: AuthContext, query: Omit<ListTenantsQuery, "limit" | "cursor">): Promise<string> {
  const rows = await db.tenant.findMany({
    where: tenantListWhere(ctx, query),
    include: { unit: { select: { path: true, parent: { select: { nameEn: true } } } } },
    orderBy: [{ nameEn: "asc" }, { id: "asc" }],
    take: EXPORT_MAX_ROWS,
  });
  const admins = await blockAdminsByTenant(rows);
  return toCsv(
    ["Website (English)", "Website (Marathi)", "Slug", "Custom domain", "Parent unit", "Status", "Published at", "Block admins", "Block admin emails", "Created at"],
    rows.map((t) => {
      const a = admins.get(t.id) ?? [];
      return [t.nameEn, t.nameMr, t.slug, t.customDomain ?? "", t.unit.parent?.nameEn ?? "", t.status, t.publishedAt ?? "", a.map((x) => x.name).join("; "), a.map((x) => x.email).join("; "), t.createdAt];
    }),
  );
}

export async function getTenant(ctx: AuthContext, tenantId: string): Promise<TenantDto> {
  const resolved = await getTenantForActor(ctx, tenantId);
  const row = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id } });
  return toTenantDto(row);
}

/** Unit checks shared by both create flows: a Gram Panchayat in the actor's scope, tenant:create there, no website yet. */
async function resolveUnitForNewTenant(ctx: AuthContext, unitId: string) {
  const unit = await getUnitForActor(ctx, unitId);
  if (unit.level !== "GRAM_PANCHAYAT") throw Errors.badRequest("A website can only be created for a Gram Panchayat unit");
  assertCan(ctx, "tenant:create", { unitPath: unit.path });
  const existing = await db.tenant.findUnique({ where: { unitId: unit.id } });
  if (existing) throw Errors.conflict("This Gram Panchayat already has a website");
  return unit;
}

async function insertTenant(tx: Tx, ctx: AuthContext, unit: { id: string }, input: CreateTenantInput, client: ClientInfo) {
  const tenant = await tx.tenant.create({
    data: {
      unitId: unit.id,
      slug: input.slug,
      nameEn: input.nameEn,
      nameMr: input.nameMr,
      customDomain: input.customDomain ?? null,
      defaultLocale: input.defaultLocale ?? "MR",
      settings: (input.settings ?? {}) as Prisma.InputJsonValue,
      pages: { create: DEFAULT_PAGE_KEYS.map((pageKey) => ({ pageKey, isEnabled: !OPTIONAL_PAGE_KEYS.includes(pageKey) })) },
    },
  });
  await writeAudit(
    actorFromContext(ctx, client),
    { action: "tenant.create", entityType: "Tenant", entityId: tenant.id, tenantId: tenant.id, unitId: unit.id, after: toTenantDto(tenant) },
    tx,
  );
  return tenant;
}

export async function createTenant(ctx: AuthContext, input: CreateTenantInput, client: ClientInfo): Promise<TenantDto> {
  const unit = await resolveUnitForNewTenant(ctx, input.unitId);
  const created = await db.$transaction((tx) => insertTenant(tx, ctx, unit, input, client));
  return toTenantDto(created);
}

/**
 * One-step website creation: the website, its GP Admin and optional Data Entry Operators in ONE transaction.
 * Every account goes through the same checks as POST /users (scope, CREATABLE_ROLES / canGrantRole, level, modules,
 * duplicate email, password policy). If anything fails nothing is created and a field error (`gpAdmin.email`,
 * `operators.1.email`, `slug`) comes back. Passwords are hashed before the transaction; generated temporary
 * passwords are returned once and never stored or audited in plain text.
 */
export async function createTenantWithUsers(ctx: AuthContext, input: CreateTenantWithUsersInput, client: ClientInfo): Promise<CreateTenantWithUsersResultDto> {
  const unit = await resolveUnitForNewTenant(ctx, input.unitId);

  const slugTaken = await db.tenant.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (slugTaken) throw Errors.validation([{ path: "slug", message: "This website address is already taken" }]);

  const accounts = [
    { path: "gpAdmin", input: { ...input.gpAdmin, assignment: { role: "GP_ADMIN" as const, unitId: unit.id } } },
    ...input.operators.map((o, i) => ({
      path: `operators.${i}`,
      input: { ...o, assignment: { role: "DATA_ENTRY_OPERATOR" as const, unitId: unit.id, modules: o.modules } },
    })),
  ];

  // Validate and hash every account first (no writes yet); duplicate emails become field errors.
  const prepared: PreparedUser[] = [];
  for (const a of accounts) {
    try {
      prepared.push(await prepareUser(ctx, a.input));
    } catch (err) {
      if (isAppError(err) && err.code === "CONFLICT") throw Errors.validation([{ path: `${a.path}.email`, message: err.message }]);
      throw err;
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const tenant = await insertTenant(tx, ctx, unit, input, client);
      const users: UserDto[] = [];
      for (const p of prepared) users.push(await insertPreparedUser(tx, ctx, p, client));
      return { tenant, users };
    });
    const [admin, ...operators] = result.users;
    return {
      tenant: toTenantDto(result.tenant),
      gpAdmin: { user: admin!, temporaryPassword: prepared[0]!.temporaryPassword },
      operators: operators.map((user, i) => ({ user, temporaryPassword: prepared[i + 1]!.temporaryPassword })),
    };
  } catch (err) {
    // A concurrent request can win the race on a unique column after the checks above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = JSON.stringify(err.meta ?? {});
      if (target.includes("email")) throw Errors.validation([{ path: "gpAdmin.email", message: "A user with this email already exists" }]);
      if (target.includes("slug")) throw Errors.validation([{ path: "slug", message: "This website address is already taken" }]);
      throw Errors.conflict("A record with the same unique value already exists");
    }
    throw err;
  }
}

/** Active GP Admins and Data Entry Operators of a website (the people who can sign in to run it). */
export async function listTenantUsers(ctx: AuthContext, tenantId: string): Promise<TenantUserDto[]> {
  const resolved = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "user:read", { unitPath: resolved.unitPath });
  const rows = await db.roleAssignment.findMany({
    where: { unitId: resolved.unitId, revokedAt: null, role: { in: ["GP_ADMIN", "DATA_ENTRY_OPERATOR"] }, user: { deletedAt: null } },
    include: { modules: { select: { moduleKey: true, canWrite: true } }, user: { select: { id: true, name: true, email: true, phone: true, status: true, mustResetPassword: true, lastLoginAt: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((a) => ({
    id: a.user.id,
    name: a.user.name,
    email: a.user.email,
    phone: a.user.phone,
    role: a.role,
    status: a.user.status,
    mustResetPassword: a.user.mustResetPassword,
    lastLoginAt: a.user.lastLoginAt?.toISOString() ?? null,
    modules: a.modules.map((m) => ({ moduleKey: m.moduleKey as ModuleKey, canWrite: m.canWrite })),
  }));
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
  const row = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id }, select: { id: true, slug: true, nameEn: true, nameMr: true, defaultLocale: true, settings: true, unit: { select: { path: true } } } });
  // Taluka and district names (public, no ids) so placeholder text can name the right ones.
  const ancestors = await db.adminUnit.findMany({
    where: { id: { in: row.unit.path.split("/").filter(Boolean) }, level: { in: ["TALUKA", "DISTRICT"] } },
    select: { level: true, nameEn: true, nameMr: true },
  });
  const taluka = ancestors.find((a) => a.level === "TALUKA");
  const district = ancestors.find((a) => a.level === "DISTRICT");
  const { unit: _unit, ...rest } = row;
  return {
    ...rest,
    settings: (row.settings ?? {}) as TenantSettingsDto,
    area: {
      ...(taluka ? { taluka: { nameEn: taluka.nameEn, nameMr: taluka.nameMr } } : {}),
      ...(district ? { district: { nameEn: district.nameEn, nameMr: district.nameMr } } : {}),
    },
  };
}

/**
 * Delete a website and everything that belongs to it (pages, sections and their history, announcements, schemes,
 * projects, success stories, media and uploaded files, grievances, form submissions). The Gram Panchayat unit stays,
 * so it can be reused or deleted; users assigned to it keep their accounts.
 *
 * Super Admin only (`hierarchy:manage`), and only after the website has been unpublished: a live site is never deleted
 * in one step. The caller must type the website's address (`confirmSlug`) to confirm. Audit entries about the website
 * stay (they only lose the link to it) and a `tenant.delete` entry is added.
 */
export async function deleteTenant(ctx: AuthContext, tenantId: string, confirmSlug: string, client: ClientInfo): Promise<void> {
  const resolved = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "hierarchy:manage", { unitPath: resolved.unitPath });
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: resolved.id } });
  if (confirmSlug !== tenant.slug) throw Errors.badRequest("The address you typed does not match this website");
  if (tenant.status === "PUBLISHED") throw Errors.conflict("Unpublish the website before deleting it");

  // Uploaded files (not the pictures shipped with the site) are removed from storage after the rows are gone.
  const files = await db.media.findMany({ where: { tenantId: tenant.id, source: { not: "SITE_ASSET" } }, select: { storageKey: true } });

  await db.$transaction(async (tx) => {
    // Complaint attachments point at media with RESTRICT, so they go first; everything else follows the tenant.
    await tx.grievanceAttachment.deleteMany({ where: { grievance: { tenantId: tenant.id } } });
    await tx.tenant.delete({ where: { id: tenant.id } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "tenant.delete", entityType: "Tenant", entityId: tenant.id, unitId: tenant.unitId, before: { slug: tenant.slug, nameEn: tenant.nameEn, nameMr: tenant.nameMr, status: tenant.status } },
      tx,
    );
  });

  const storage = getStorage();
  await Promise.all(files.map((f) => storage.delete(f.storageKey).catch(() => undefined)));
  revalidatePublicTags([tenantTag(tenant.slug)]);
}
