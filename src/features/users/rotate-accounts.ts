import type { Role } from "@/generated/prisma/enums";
import type { ModuleKey } from "@/config/modules";
import { generateTemporaryPassword } from "@/features/users/service";
import { writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import type { db as Db, Tx } from "@/lib/db";

/**
 * Replace the sample sign-in accounts of a deployment with real ones.
 *
 * - The accounts given (Super Admin, Taluka Admin of the website's taluka, GP Admin of the website, one Data Entry
 *   Operator) are created, or kept if they already exist, each with a fresh random temporary password that must be
 *   changed at first sign-in. Their sessions are signed out.
 * - Every other account whose email ends with `removeDomain` (the seed's `@digitalgp.local`) is removed the same
 *   way as "Delete user" in the admin: it can no longer sign in, its roles are revoked, its email is freed, and the
 *   row stays so the audit log keeps the name. Villages, websites and content are not touched.
 * - It never leaves the deployment without a Super Admin: the new one is created before the old ones are removed.
 *
 * Passwords are returned once in the report and are never written to the audit log.
 */
export interface RotateAccountsOptions {
  superAdmin?: { email: string; name?: string };
  /** Taluka Admin of the taluka the website belongs to. */
  talukaAdmin?: { email: string; name?: string };
  gpAdmin?: { email: string; name?: string };
  operator?: { email: string; name?: string; modules?: ModuleKey[] };
  /** Website (slug) the GP Admin, operator and taluka admin belong to. */
  tenantSlug: string;
  /** Remove the remaining sample accounts (default true). false = only create / reset the accounts given. */
  removeSamples?: boolean;
  /** Sample accounts to remove: every active account whose email ends with this (default "@digitalgp.local"). */
  removeDomain?: string;
  /** Report what would happen and change nothing. */
  dryRun?: boolean;
}

export interface RotatedAccount {
  email: string;
  role: Role;
  /** "created" = new account, "reset" = existing account with a new password. */
  outcome: "created" | "reset";
  temporaryPassword: string;
}

export interface RotateAccountsReport {
  dryRun: boolean;
  accounts: RotatedAccount[];
  removed: { email: string; roles: string[] }[];
}

const DEFAULT_OPERATOR_MODULES: ModuleKey[] = ["announcements", "schemes", "projects", "media"];

class DryRunRollback extends Error {}

export async function rotateAccounts(db: typeof Db, opts: RotateAccountsOptions): Promise<RotateAccountsReport> {
  const removeDomain = (opts.removeDomain ?? "@digitalgp.local").toLowerCase();
  const superEmail = opts.superAdmin ? normalize(opts.superAdmin.email) : null;
  const talukaEmail = opts.talukaAdmin ? normalize(opts.talukaAdmin.email) : null;
  const gpEmail = opts.gpAdmin ? normalize(opts.gpAdmin.email) : null;
  const opEmail = opts.operator ? normalize(opts.operator.email) : null;
  const emails = [superEmail, talukaEmail, gpEmail, opEmail].filter((e): e is string => e !== null);
  if (!emails.length) throw new Error("Give at least one account to create or reset");
  const distinct = new Set(emails);
  if (distinct.size !== emails.length) throw new Error("Each account needs its own email");

  const tenant = await db.tenant.findUnique({ where: { slug: opts.tenantSlug }, select: { unitId: true, nameEn: true, unit: { select: { path: true } } } });
  if (!tenant) throw new Error(`No website with address "${opts.tenantSlug}"`);
  const taluka = talukaEmail
    ? await db.adminUnit.findFirst({ where: { id: { in: tenant.unit.path.split("/").filter(Boolean) }, level: "TALUKA" }, select: { id: true, nameEn: true } })
    : null;
  if (talukaEmail && !taluka) throw new Error(`The website "${opts.tenantSlug}" is not inside a taluka`);
  // The Super Admin sits on the root of the hierarchy: the unit of the current super admin, else the (only) state.
  const currentSuper = await db.roleAssignment.findFirst({ where: { role: "SUPER_ADMIN", revokedAt: null }, select: { unitId: true } });
  const root = currentSuper ?? (await db.adminUnit.findFirst({ where: { level: "STATE" }, select: { id: true } }).then((u) => (u ? { unitId: u.id } : null)));
  if (!root) throw new Error("No state unit found; run the seed or bootstrap first");

  const report: RotateAccountsReport = { dryRun: Boolean(opts.dryRun), accounts: [], removed: [] };
  const now = new Date();

  try {
    await db.$transaction(
      async (tx) => {
        // Changes are audited as the Super Admin: the one created/reset here, else the deployment's current one.
        let actor: { userId: string | null; role: Role } = { userId: null, role: "SUPER_ADMIN" };
        if (opts.superAdmin && superEmail) {
          const superUser = await ensureAccount(tx, { email: superEmail, name: opts.superAdmin.name ?? "Super Admin", role: "SUPER_ADMIN", unitId: root.unitId }, report, now);
          actor = { userId: superUser.id, role: "SUPER_ADMIN" };
          await writeAudit(actor, { action: superUser.outcome === "created" ? "user.create" : "user.password_reset", entityType: "User", entityId: superUser.id, unitId: root.unitId, after: { email: superEmail, role: "SUPER_ADMIN" } }, tx);
        } else {
          const current = await tx.roleAssignment.findFirst({ where: { role: "SUPER_ADMIN", revokedAt: null, user: { deletedAt: null } }, select: { userId: true } });
          actor = { userId: current?.userId ?? null, role: "SUPER_ADMIN" };
        }

        if (opts.talukaAdmin && talukaEmail && taluka) {
          const ta = await ensureAccount(tx, { email: talukaEmail, name: opts.talukaAdmin.name ?? `${taluka.nameEn} Taluka Admin`, role: "TALUKA_ADMIN", unitId: taluka.id }, report, now);
          await writeAudit(actor, { action: ta.outcome === "created" ? "user.create" : "user.password_reset", entityType: "User", entityId: ta.id, unitId: taluka.id, after: { email: talukaEmail, role: "TALUKA_ADMIN" } }, tx);
        }

        if (opts.gpAdmin && gpEmail) {
          const gp = await ensureAccount(tx, { email: gpEmail, name: opts.gpAdmin.name ?? `${tenant.nameEn} GP Admin`, role: "GP_ADMIN", unitId: tenant.unitId }, report, now);
          await writeAudit(actor, { action: gp.outcome === "created" ? "user.create" : "user.password_reset", entityType: "User", entityId: gp.id, unitId: tenant.unitId, after: { email: gpEmail, role: "GP_ADMIN" } }, tx);
        }

        if (opts.operator && opEmail) {
          const modules = opts.operator.modules?.length ? opts.operator.modules : DEFAULT_OPERATOR_MODULES;
          const op = await ensureAccount(tx, { email: opEmail, name: opts.operator.name ?? `${tenant.nameEn} Data Entry Operator`, role: "DATA_ENTRY_OPERATOR", unitId: tenant.unitId, modules }, report, now);
          await writeAudit(actor, { action: op.outcome === "created" ? "user.create" : "user.password_reset", entityType: "User", entityId: op.id, unitId: tenant.unitId, after: { email: opEmail, role: "DATA_ENTRY_OPERATOR", modules } }, tx);
        }

        // Remove the remaining sample accounts.
        const samples =
          opts.removeSamples === false
            ? []
            : await tx.user.findMany({
                where: { email: { endsWith: removeDomain }, deletedAt: null, NOT: { email: { in: [...distinct] } } },
                select: { id: true, email: true, name: true, roleAssignments: { where: { revokedAt: null }, select: { role: true, unitId: true } } },
              });
        for (const u of samples) {
          await tx.roleAssignment.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: now } });
          await tx.session.deleteMany({ where: { userId: u.id } });
          await tx.passwordResetToken.deleteMany({ where: { userId: u.id } });
          await tx.user.update({ where: { id: u.id }, data: { deletedAt: now, status: "SUSPENDED", email: `deleted-${u.id}@deleted.invalid`, phone: null } });
          await writeAudit(actor, { action: "user.delete", entityType: "User", entityId: u.id, before: { email: u.email, name: u.name, roles: u.roleAssignments } }, tx);
          report.removed.push({ email: u.email, roles: u.roleAssignments.map((a) => a.role) });
        }

        if ((await tx.roleAssignment.count({ where: { role: "SUPER_ADMIN", revokedAt: null, user: { deletedAt: null, status: "ACTIVE" } } })) < 1) {
          throw new Error("Refusing to continue: no active Super Admin would remain");
        }
        if (opts.dryRun) throw new DryRunRollback();
      },
      { timeout: 60_000 },
    );
  } catch (err) {
    if (!(err instanceof DryRunRollback)) throw err;
  }
  return report;
}

function normalize(email: string): string {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`"${email}" is not a valid email`);
  return e;
}

interface AccountSpec {
  email: string;
  name: string;
  role: Role;
  unitId: string;
  modules?: ModuleKey[];
}

/** Create the account, or give an existing one a new temporary password; make sure it holds exactly this role on this unit. */
async function ensureAccount(tx: Tx, spec: AccountSpec, report: RotateAccountsReport, now: Date): Promise<{ id: string; outcome: "created" | "reset" }> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const existing = await tx.user.findUnique({ where: { email: spec.email }, select: { id: true, deletedAt: true } });
  let id: string;
  let outcome: "created" | "reset";
  if (existing && !existing.deletedAt) {
    id = existing.id;
    outcome = "reset";
    await tx.user.update({ where: { id }, data: { passwordHash, mustResetPassword: true, status: "ACTIVE" } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });
  } else {
    if (existing) throw new Error(`${spec.email} belongs to a deleted account; this should not happen (deleted accounts have their email freed)`);
    const created = await tx.user.create({ data: { email: spec.email, name: spec.name, passwordHash, mustResetPassword: true, locale: "MR" } });
    id = created.id;
    outcome = "created";
  }
  // The role on this unit; any other active role of the account (e.g. a sample role elsewhere) is revoked.
  await tx.roleAssignment.updateMany({ where: { userId: id, revokedAt: null, NOT: { role: spec.role, unitId: spec.unitId } }, data: { revokedAt: now } });
  const assignment = await tx.roleAssignment.upsert({
    where: { userId_role_unitId: { userId: id, role: spec.role, unitId: spec.unitId } },
    create: { userId: id, role: spec.role, unitId: spec.unitId },
    update: { revokedAt: null },
  });
  if (spec.modules) {
    await tx.modulePermission.deleteMany({ where: { roleAssignmentId: assignment.id, moduleKey: { notIn: spec.modules } } });
    for (const moduleKey of spec.modules) {
      await tx.modulePermission.upsert({
        where: { roleAssignmentId_moduleKey: { roleAssignmentId: assignment.id, moduleKey } },
        create: { roleAssignmentId: assignment.id, moduleKey, canWrite: true },
        update: { canWrite: true },
      });
    }
  }
  report.accounts.push({ email: spec.email, role: spec.role, outcome, temporaryPassword });
  return { id, outcome };
}
