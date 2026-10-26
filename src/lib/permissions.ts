import { Role } from "@/generated/prisma/enums";
import type { AuthAssignment, AuthContext } from "@/lib/auth";
import { Errors } from "@/lib/errors";
import type { ModuleKey } from "@/config/modules";

/**
 * Permission model
 * ----------------
 * A user holds RoleAssignments; each grants a Role over the subtree rooted at an AdminUnit.
 * Every protected operation checks, in order:
 *   1. scope   — some assignment's unit path is a prefix of the target unit path
 *   2. role    — that role has the capability (matrix below)
 *   3. module  — for DATA_ENTRY_OPERATOR, the module must be granted (and writable for writes)
 *   4. workflow (content transitions) — see src/features/content/workflow.ts
 *
 * The matrix is fixed in code pending client approval (requirements open decision #9).
 * Adjust ROLE_CAPABILITIES / CREATABLE_ROLES here; everything else derives from them.
 */

export type Capability =
  | "hierarchy:read"
  | "hierarchy:manage"
  | "tenant:read"
  | "tenant:create"
  | "tenant:update"
  | "tenant:publish"
  | "user:read"
  | "user:manage"
  | "content:read"
  | "content:edit"
  | "content:submit"
  | "content:review"
  | "content:publish"
  | "content:share" // create shared content targeted at a scope below the owner unit
  | "media:manage"
  | "grievance:manage"
  | "audit:read"
  | "audit:read-own"
  | "roles:manage";

const ALL_CONTENT: Capability[] = ["content:read", "content:edit", "content:submit", "content:review", "content:publish"];

export const ROLE_CAPABILITIES: Readonly<Record<Role, ReadonlySet<Capability>>> = {
  SUPER_ADMIN: new Set<Capability>([
    "hierarchy:read",
    "hierarchy:manage",
    "tenant:read",
    "tenant:create",
    "tenant:update",
    "tenant:publish",
    "user:read",
    "user:manage",
    ...ALL_CONTENT,
    "content:share",
    "media:manage",
    "grievance:manage",
    "audit:read",
    "roles:manage",
  ]),
  TALUKA_ADMIN: new Set<Capability>([
    "hierarchy:read",
    "tenant:read",
    "tenant:create",
    "tenant:update",
    "tenant:publish",
    "user:read",
    "user:manage",
    ...ALL_CONTENT,
    "content:share",
    "media:manage",
    "grievance:manage",
    "audit:read",
  ]),
  BLOCK_ADMIN: new Set<Capability>([
    "hierarchy:read",
    "tenant:read",
    "tenant:update",
    "tenant:publish",
    "user:read",
    "user:manage",
    ...ALL_CONTENT,
    "content:share",
    "media:manage",
    "grievance:manage",
    "audit:read",
  ]),
  GP_ADMIN: new Set<Capability>([
    "hierarchy:read",
    "tenant:read",
    "tenant:update",
    "tenant:publish",
    "user:read",
    "user:manage",
    ...ALL_CONTENT,
    "media:manage",
    "grievance:manage",
    "audit:read",
  ]),
  DATA_ENTRY_OPERATOR: new Set<Capability>([
    "tenant:read",
    "content:read",
    "content:edit",
    "content:submit",
    "media:manage",
    "audit:read-own",
  ]),
};

/** Which roles each role may create/manage within its own scope. */
export const CREATABLE_ROLES: Readonly<Record<Role, ReadonlySet<Role>>> = {
  SUPER_ADMIN: new Set<Role>([Role.SUPER_ADMIN, Role.TALUKA_ADMIN, Role.BLOCK_ADMIN, Role.GP_ADMIN, Role.DATA_ENTRY_OPERATOR]),
  TALUKA_ADMIN: new Set<Role>([Role.BLOCK_ADMIN, Role.GP_ADMIN, Role.DATA_ENTRY_OPERATOR]),
  BLOCK_ADMIN: new Set<Role>([Role.GP_ADMIN, Role.DATA_ENTRY_OPERATOR]),
  GP_ADMIN: new Set<Role>([Role.DATA_ENTRY_OPERATOR]),
  DATA_ENTRY_OPERATOR: new Set<Role>(),
};

/** Hierarchy level at which each role may be assigned. */
export const ROLE_LEVELS: Readonly<Record<Role, ReadonlySet<string>>> = {
  SUPER_ADMIN: new Set(["STATE", "DISTRICT"]),
  TALUKA_ADMIN: new Set(["TALUKA"]),
  BLOCK_ADMIN: new Set(["BLOCK"]),
  GP_ADMIN: new Set(["GRAM_PANCHAYAT"]),
  DATA_ENTRY_OPERATOR: new Set(["GRAM_PANCHAYAT"]),
};

export const ROLE_RANK: Readonly<Record<Role, number>> = {
  SUPER_ADMIN: 50,
  TALUKA_ADMIN: 40,
  BLOCK_ADMIN: 30,
  GP_ADMIN: 20,
  DATA_ENTRY_OPERATOR: 10,
};

/** Capabilities that write content and therefore need a writable module grant for operators. */
const WRITE_CAPABILITIES: ReadonlySet<Capability> = new Set(["content:edit", "content:submit", "media:manage"]);

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

export function isWithinScope(scopePath: string, targetPath: string): boolean {
  return targetPath.startsWith(scopePath);
}

/** Assignments whose scope contains the target unit, highest role first. */
export function assignmentsForUnit(ctx: AuthContext, targetPath: string): AuthAssignment[] {
  return ctx.assignments
    .filter((a) => isWithinScope(a.unitPath, targetPath))
    .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role]);
}

export function hasAnyAssignment(ctx: AuthContext): boolean {
  return ctx.assignments.length > 0;
}

export function isSuperAdmin(ctx: AuthContext): boolean {
  return ctx.assignments.some((a) => a.role === Role.SUPER_ADMIN);
}

/** Highest-ranked role the user holds anywhere (for display / audit). */
export function primaryRole(ctx: AuthContext): Role | null {
  let best: Role | null = null;
  for (const a of ctx.assignments) {
    if (!best || ROLE_RANK[a.role] > ROLE_RANK[best]) best = a.role;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

export interface PermissionTarget {
  /** Materialized path of the unit the operation targets (tenant unit, or hierarchy unit). */
  unitPath: string;
  /** Required for operator module checks on content/media operations. */
  moduleKey?: ModuleKey;
}

/** Returns the assignment that authorizes the capability on the target, or null. */
export function findAuthorizingAssignment(
  ctx: AuthContext,
  capability: Capability,
  target: PermissionTarget,
): AuthAssignment | null {
  for (const a of assignmentsForUnit(ctx, target.unitPath)) {
    if (!ROLE_CAPABILITIES[a.role].has(capability)) continue;
    if (a.role === Role.DATA_ENTRY_OPERATOR && target.moduleKey !== undefined) {
      const canWrite = a.modules.get(target.moduleKey);
      if (canWrite === undefined) continue;
      if (WRITE_CAPABILITIES.has(capability) && !canWrite) continue;
    } else if (a.role === Role.DATA_ENTRY_OPERATOR && WRITE_CAPABILITIES.has(capability)) {
      // Operators must always be checked against a module for writes.
      continue;
    }
    return a;
  }
  return null;
}

export function can(ctx: AuthContext, capability: Capability, target: PermissionTarget): boolean {
  return findAuthorizingAssignment(ctx, capability, target) !== null;
}

/** Throws 403 when the capability is not granted on the target. */
export function assertCan(ctx: AuthContext, capability: Capability, target: PermissionTarget): AuthAssignment {
  const a = findAuthorizingAssignment(ctx, capability, target);
  if (!a) throw Errors.forbidden();
  return a;
}

/** Throws 404 when the target is outside every scope the user holds (hides existence). */
export function assertInScope(ctx: AuthContext, targetPath: string, entity = "Resource"): void {
  if (assignmentsForUnit(ctx, targetPath).length === 0) throw Errors.notFound(entity);
}

/** Whether `actor` may grant `role` at a unit with `targetPath`. */
export function canGrantRole(ctx: AuthContext, role: Role, targetPath: string): boolean {
  return assignmentsForUnit(ctx, targetPath).some(
    (a) => ROLE_CAPABILITIES[a.role].has("user:manage") && CREATABLE_ROLES[a.role].has(role),
  );
}

/** Paths of all scope roots the user holds — used to build "in my scope" queries. */
export function scopePaths(ctx: AuthContext): string[] {
  return ctx.assignments.map((a) => a.unitPath);
}

/** Prisma `OR` filter matching units within any of the user's scopes. */
export function unitPathScopeFilter(ctx: AuthContext): { OR: { path: { startsWith: string } }[] } {
  const paths = scopePaths(ctx);
  // Impossible prefix when the user holds no assignments (real paths are "/<cuid>/..."), so
  // queries return nothing instead of everything.
  return { OR: (paths.length ? paths : ["/__no-scope__/"]).map((p) => ({ path: { startsWith: p } })) };
}
