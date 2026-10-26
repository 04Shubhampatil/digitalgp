import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { actorFromContext, writeAudit } from "@/lib/audit";
import { hashPassword, revokeAllUserSessions, type AuthContext } from "@/lib/auth";
import { db, type Tx } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { ROLE_LEVELS, canGrantRole, unitPathScopeFilter } from "@/lib/permissions";
import { getUnitForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { UserDto } from "@/types/api";
import { toUserDto, userWithAssignmentsInclude } from "@/features/users/mappers";
import type { AssignmentInput, CreateUserInput, ListUsersQuery, UpdateUserInput } from "@/features/users/validators";

/**
 * User management is scoped: an actor may only see users who hold an active assignment inside
 * the actor's scope, and may only grant/revoke roles listed in CREATABLE_ROLES for their own role.
 * Operators never reach these functions (no `user:manage` capability).
 */

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

async function findVisibleUser(ctx: AuthContext, userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, roleAssignments: { some: { revokedAt: null, unit: unitPathScopeFilter(ctx) } } },
    include: userWithAssignmentsInclude,
  });
  if (!user) throw Errors.notFound("User");
  return user;
}

/** The actor must be able to manage at least one of the user's active in-scope assignments. */
async function findManageableUser(ctx: AuthContext, userId: string) {
  const user = await findVisibleUser(ctx, userId);
  const units = await db.adminUnit.findMany({
    where: { id: { in: user.roleAssignments.map((a) => a.unitId) } },
    select: { id: true, path: true },
  });
  const pathById = new Map(units.map((u) => [u.id, u.path]));
  const manageable = user.roleAssignments.some((a) => canGrantRole(ctx, a.role, pathById.get(a.unitId) ?? "\u0000"));
  if (!manageable) throw Errors.forbidden();
  return user;
}

// ---------------------------------------------------------------------------
// Assignment validation
// ---------------------------------------------------------------------------

async function validateAssignment(ctx: AuthContext, input: AssignmentInput) {
  const unit = await getUnitForActor(ctx, input.unitId);
  if (!canGrantRole(ctx, input.role, unit.path)) throw Errors.forbidden(`You cannot grant the role ${input.role} here`);
  if (!ROLE_LEVELS[input.role].has(unit.level)) {
    throw Errors.badRequest(`Role ${input.role} must be assigned at level ${[...ROLE_LEVELS[input.role]].join(" or ")}, not ${unit.level}`);
  }
  if (input.role === "DATA_ENTRY_OPERATOR") {
    if (!input.modules?.length) throw Errors.badRequest("Data Entry Operators need at least one module");
  } else if (input.modules?.length) {
    throw Errors.badRequest("Modules can only be set for Data Entry Operators");
  }
  return unit;
}

async function createAssignment(tx: Tx, userId: string, input: AssignmentInput, grantedById: string) {
  return tx.roleAssignment.create({
    data: {
      userId,
      role: input.role,
      unitId: input.unitId,
      grantedById,
      modules: input.modules ? { create: input.modules.map((m) => ({ moduleKey: m.moduleKey, canWrite: m.canWrite })) } : undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listUsers(ctx: AuthContext, query: ListUsersQuery) {
  const scope = unitPathScopeFilter(ctx);
  const assignmentFilter: Prisma.RoleAssignmentWhereInput = {
    revokedAt: null,
    unit: query.unitId ? { AND: [scope, { path: { contains: `/${query.unitId}/` } }] } : scope,
    ...(query.role ? { role: query.role } : {}),
  };
  const rows = await db.user.findMany({
    where: {
      roleAssignments: { some: assignmentFilter },
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    include: userWithAssignmentsInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toUserDto) };
}

export async function getUser(ctx: AuthContext, userId: string): Promise<UserDto> {
  return toUserDto(await findVisibleUser(ctx, userId));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createUser(ctx: AuthContext, input: CreateUserInput, client: ClientInfo) {
  const unit = await validateAssignment(ctx, input.assignment);
  const email = input.email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw Errors.conflict("A user with this email already exists");

  const temporaryPassword = input.password ? null : `Tmp-${randomBytes(9).toString("base64url")}1`;
  const passwordHash = await hashPassword(input.password ?? temporaryPassword!);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name: input.name,
        phone: input.phone ?? null,
        locale: input.locale ?? "MR",
        passwordHash,
        mustResetPassword: !input.password,
        createdById: ctx.user.id,
      },
    });
    const assignment = await createAssignment(tx, created.id, input.assignment, ctx.user.id);
    const actor = actorFromContext(ctx, client);
    await writeAudit(actor, { action: "user.create", entityType: "User", entityId: created.id, unitId: unit.id, after: { email: created.email, name: created.name } }, tx);
    await writeAudit(
      actor,
      { action: "user.assignment_grant", entityType: "RoleAssignment", entityId: assignment.id, unitId: unit.id, after: { userId: created.id, role: input.assignment.role, unitId: unit.id, modules: input.assignment.modules ?? [] } },
      tx,
    );
    return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: userWithAssignmentsInclude });
  });

  return { user: toUserDto(user), temporaryPassword };
}

export async function updateUser(ctx: AuthContext, userId: string, input: UpdateUserInput, client: ClientInfo): Promise<UserDto> {
  if (userId === ctx.user.id && input.status) throw Errors.badRequest("You cannot change your own account status");
  const before = await findManageableUser(ctx, userId);

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.user.update({ where: { id: userId }, data: input, include: userWithAssignmentsInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: input.status && input.status !== before.status ? `user.${input.status.toLowerCase()}` : "user.update", entityType: "User", entityId: userId, before: { name: before.name, phone: before.phone, status: before.status }, after: { name: row.name, phone: row.phone, status: row.status } },
      tx,
    );
    return row;
  });
  if (input.status === "SUSPENDED") await revokeAllUserSessions(userId);
  return toUserDto(updated);
}

export async function addAssignment(ctx: AuthContext, userId: string, input: AssignmentInput, client: ClientInfo): Promise<UserDto> {
  await findVisibleUser(ctx, userId);
  const unit = await validateAssignment(ctx, input);

  const duplicate = await db.roleAssignment.findUnique({ where: { userId_role_unitId: { userId, role: input.role, unitId: input.unitId } } });
  if (duplicate && !duplicate.revokedAt) throw Errors.conflict("The user already holds this role here");

  const user = await db.$transaction(async (tx) => {
    const assignment = duplicate
      ? await tx.roleAssignment.update({
          where: { id: duplicate.id },
          data: {
            revokedAt: null,
            grantedById: ctx.user.id,
            modules: { deleteMany: {}, create: input.modules?.map((m) => ({ moduleKey: m.moduleKey, canWrite: m.canWrite })) ?? [] },
          },
        })
      : await createAssignment(tx, userId, input, ctx.user.id);
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "user.assignment_grant", entityType: "RoleAssignment", entityId: assignment.id, unitId: unit.id, after: { userId, role: input.role, unitId: unit.id, modules: input.modules ?? [] } },
      tx,
    );
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: userWithAssignmentsInclude });
  });
  return toUserDto(user);
}

export async function revokeAssignment(ctx: AuthContext, userId: string, assignmentId: string, client: ClientInfo): Promise<UserDto> {
  if (userId === ctx.user.id) throw Errors.badRequest("You cannot revoke your own role");
  await findVisibleUser(ctx, userId);
  const assignment = await db.roleAssignment.findFirst({ where: { id: assignmentId, userId, revokedAt: null }, include: { unit: true } });
  if (!assignment) throw Errors.notFound("Assignment");
  if (!canGrantRole(ctx, assignment.role, assignment.unit.path)) throw Errors.forbidden();

  const user = await db.$transaction(async (tx) => {
    await tx.roleAssignment.update({ where: { id: assignmentId }, data: { revokedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "user.assignment_revoke", entityType: "RoleAssignment", entityId: assignmentId, unitId: assignment.unitId, before: { userId, role: assignment.role, unitId: assignment.unitId } },
      tx,
    );
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: userWithAssignmentsInclude });
  });
  if (user.roleAssignments.length === 0) await revokeAllUserSessions(userId);
  return toUserDto(user);
}

export async function updateAssignmentModules(
  ctx: AuthContext,
  userId: string,
  assignmentId: string,
  modules: { moduleKey: string; canWrite: boolean }[],
  client: ClientInfo,
): Promise<UserDto> {
  await findVisibleUser(ctx, userId);
  const assignment = await db.roleAssignment.findFirst({ where: { id: assignmentId, userId, revokedAt: null }, include: { unit: true, modules: true } });
  if (!assignment) throw Errors.notFound("Assignment");
  if (assignment.role !== ("DATA_ENTRY_OPERATOR" satisfies Role)) throw Errors.badRequest("Modules can only be set for Data Entry Operators");
  if (!canGrantRole(ctx, assignment.role, assignment.unit.path)) throw Errors.forbidden();

  const user = await db.$transaction(async (tx) => {
    await tx.modulePermission.deleteMany({ where: { roleAssignmentId: assignmentId } });
    await tx.modulePermission.createMany({ data: modules.map((m) => ({ roleAssignmentId: assignmentId, moduleKey: m.moduleKey, canWrite: m.canWrite })) });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "user.modules_update", entityType: "RoleAssignment", entityId: assignmentId, unitId: assignment.unitId, before: assignment.modules.map((m) => ({ moduleKey: m.moduleKey, canWrite: m.canWrite })), after: modules },
      tx,
    );
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: userWithAssignmentsInclude });
  });
  return toUserDto(user);
}
