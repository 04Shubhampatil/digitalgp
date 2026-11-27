import { describe, expect, it } from "vitest";
import { rotateAccounts } from "@/features/users/rotate-accounts";
import { createSession, validateSessionToken, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { assign, buildWorld, createUser } from "../helpers/factories";

const domain = `@sample-${Date.now().toString(36)}.local`;

async function world() {
  const w = await buildWorld();
  const site = w.tenantA; // the website of gpA
  const oldSuper = await createUser({ email: `superadmin${domain}` });
  await assign(oldSuper.id, "SUPER_ADMIN", w.state.id);
  const oldGp = await createUser({ email: `gp${domain}` });
  await assign(oldGp.id, "GP_ADMIN", w.gpA.id);
  const oldOp = await createUser({ email: `gp.operator${domain}` });
  await assign(oldOp.id, "DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "pages" }]);
  const other = await createUser({ email: `other${domain}` });
  await assign(other.id, "TALUKA_ADMIN", w.taluka2.id);
  const realUser = await createUser({ email: `keep-${Date.now().toString(36)}@real.example` });
  await assign(realUser.id, "GP_ADMIN", w.gpB.id);
  return { w, site, oldSuper, oldGp, oldOp, other, realUser };
}

describe("rotating the sample accounts", () => {
  it("creates the real accounts with one-time passwords, keeps a reused address, removes the other sample accounts", async () => {
    const { w, site, oldSuper, oldOp, other, realUser } = await world();
    const { token: oldSuperToken } = await createSession(oldSuper.id);
    const { token: oldOpToken } = await createSession(oldOp.id);

    const r = await rotateAccounts(db, {
      superAdmin: { email: `Real.Admin${domain.replace("sample", "mine")}` },
      gpAdmin: { email: `panchayat${domain.replace("sample", "mine")}` },
      operator: { email: `gp.operator${domain}` }, // same address as the sample operator: kept, new password
      tenantSlug: site.slug,
      removeDomain: domain,
    });

    expect(r.accounts.map((a) => [a.role, a.outcome])).toEqual([
      ["SUPER_ADMIN", "created"],
      ["GP_ADMIN", "created"],
      ["DATA_ENTRY_OPERATOR", "reset"],
    ]);
    expect(r.removed.map((x) => x.email).sort()).toEqual([`gp${domain}`, `other${domain}`, `superadmin${domain}`]);

    // New passwords work once and force a change; the operator keeps its account but has new modules and no session.
    for (const a of r.accounts) {
      const user = await db.user.findUniqueOrThrow({
        where: { email: a.email.toLowerCase() },
        select: { id: true, passwordHash: true, mustResetPassword: true, roleAssignments: { where: { revokedAt: null }, include: { modules: true } } },
      });
      expect(await verifyPassword(user.passwordHash, a.temporaryPassword)).toBe(true);
      expect(user.mustResetPassword).toBe(true);
      expect(user.roleAssignments.map((x) => x.role)).toEqual([a.role]);
      if (a.role === "DATA_ENTRY_OPERATOR") {
        expect(user.id).toBe(oldOp.id);
        expect(user.roleAssignments[0]!.modules.map((m) => m.moduleKey).sort()).toEqual(["announcements", "media", "projects", "schemes"]);
      }
      if (a.role === "SUPER_ADMIN") expect(user.roleAssignments[0]!.unitId).toBe(w.state.id);
      if (a.role === "GP_ADMIN") expect(user.roleAssignments[0]!.unitId).toBe(w.gpA.id);
    }
    expect(await validateSessionToken(oldOpToken)).toBeNull();

    // Removed accounts: signed out, roles revoked, email freed, row kept.
    expect(await validateSessionToken(oldSuperToken)).toBeNull();
    const gone = await db.user.findUniqueOrThrow({ where: { id: other.id }, include: { roleAssignments: true } });
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.email).toBe(`deleted-${other.id}@deleted.invalid`);
    expect(gone.roleAssignments.every((x) => x.revokedAt)).toBe(true);
    expect(await db.user.count({ where: { email: { endsWith: domain }, deletedAt: null } })).toBe(1); // the kept operator

    // Accounts outside the sample domain, the website and the units are untouched.
    expect((await db.user.findUniqueOrThrow({ where: { id: realUser.id } })).deletedAt).toBeNull();
    expect(await db.tenant.count({ where: { id: site.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "user.delete", entityId: { in: [oldSuper.id, other.id] } } })).toBe(2);
    // Passwords never reach the audit log.
    const logs = await db.auditLog.findMany({ where: { actorId: (await db.user.findUniqueOrThrow({ where: { email: r.accounts[0]!.email } })).id } });
    expect(JSON.stringify(logs)).not.toContain(r.accounts[0]!.temporaryPassword);
  });

  it("a dry run changes nothing", async () => {
    const { site, oldSuper } = await world();
    const before = await db.user.count({ where: { email: { endsWith: domain }, deletedAt: null } });
    const r = await rotateAccounts(db, { superAdmin: { email: `dry${domain.replace("sample", "mine")}` }, gpAdmin: { email: `drygp${domain.replace("sample", "mine")}` }, tenantSlug: site.slug, removeDomain: domain, dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.accounts).toHaveLength(2);
    expect(r.removed.length).toBeGreaterThan(0);
    expect(await db.user.count({ where: { email: { endsWith: domain }, deletedAt: null } })).toBe(before);
    expect(await db.user.count({ where: { email: `dry${domain.replace("sample", "mine")}` } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: oldSuper.id } })).deletedAt).toBeNull();
  });

  it("refuses duplicate emails and unknown websites", async () => {
    const { site } = await world();
    await expect(rotateAccounts(db, { superAdmin: { email: `a${domain}` }, gpAdmin: { email: `A${domain}` }, tenantSlug: site.slug, removeDomain: domain })).rejects.toThrow(/own email/);
    await expect(rotateAccounts(db, { superAdmin: { email: `a${domain}` }, gpAdmin: { email: `b${domain}` }, tenantSlug: "no-such-site", removeDomain: domain })).rejects.toThrow(/No website/);
  });
});
