import type { Prisma } from "@/generated/prisma/client";
import type { AssignmentDto, UserDto } from "@/types/api";

export const assignmentInclude = {
  unit: { select: { id: true, level: true, nameEn: true, nameMr: true, tenant: { select: { id: true } } } },
  modules: { select: { moduleKey: true, canWrite: true } },
} satisfies Prisma.RoleAssignmentInclude;

export const userWithAssignmentsInclude = {
  roleAssignments: { where: { revokedAt: null }, include: assignmentInclude, orderBy: { createdAt: "asc" } },
} satisfies Prisma.UserInclude;

type AssignmentRow = Prisma.RoleAssignmentGetPayload<{ include: typeof assignmentInclude }>;
// `passwordHash` is omitted globally by the Prisma client (src/lib/db.ts); the mapper never sees it.
type UserRow = Omit<Prisma.UserGetPayload<{ include: typeof userWithAssignmentsInclude }>, "passwordHash">;

export function toAssignmentDto(a: AssignmentRow): AssignmentDto {
  return {
    id: a.id,
    role: a.role,
    unitId: a.unit.id,
    unitLevel: a.unit.level,
    unitNameEn: a.unit.nameEn,
    unitNameMr: a.unit.nameMr,
    tenantId: a.unit.tenant?.id ?? null,
    modules: a.modules.map((m) => ({ moduleKey: m.moduleKey as AssignmentDto["modules"][number]["moduleKey"], canWrite: m.canWrite })),
    revokedAt: a.revokedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export function toUserDto(u: UserRow): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    locale: u.locale,
    status: u.status,
    mustResetPassword: u.mustResetPassword,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    assignments: u.roleAssignments.map(toAssignmentDto),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
