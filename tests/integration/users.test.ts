import { describe, expect, it } from "vitest";
import { login } from "@/features/auth/service";
import { addAssignment, createUser, deleteUser, getUser, listUsers, resetUserPassword, revokeAssignment, updateAssignmentModules, updateUser } from "@/features/users/service";
import { createSession, validateSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const op = (unitId: string) => ({ role: "DATA_ENTRY_OPERATOR" as const, unitId, modules: [{ moduleKey: "announcements" as const, canWrite: true }] });

describe("user management", () => {
  it("a taluka admin creates an operator in a Gram Panchayat of their taluka with a temporary password", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const result = await createUser(ctx, { email: "op@test.local", name: "Op", assignment: op(w.gpA.id) }, client);
    expect(result.temporaryPassword).toBeTruthy();
    expect(result.user.mustResetPassword).toBe(true);
    expect(result.user.assignments[0]).toMatchObject({ role: "DATA_ENTRY_OPERATOR", unitId: w.gpA.id, modules: [{ moduleKey: "announcements", canWrite: true }] });
    const audit = await db.auditLog.findMany({ where: { entityId: result.user.id, action: "user.create" } });
    expect(audit).toHaveLength(1);
  });

  it("a GP admin only edits their Gram Panchayat: they cannot create any user, here or elsewhere", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);
    await expectCode(createUser(ctx, { email: "own@test.local", name: "Own", assignment: op(w.gpA.id) }, client), "FORBIDDEN");
    await expectCode(createUser(ctx, { email: "x@test.local", name: "X", assignment: op(w.gpB.id) }, client), "NOT_FOUND");
    await expectCode(createUser(ctx, { email: "y@test.local", name: "Y", assignment: { role: "GP_ADMIN", unitId: w.gpA.id } }, client), "FORBIDDEN");
    await expectCode(createUser(ctx, { email: "z@test.local", name: "Z", assignment: { role: "TALUKA_ADMIN", unitId: w.taluka1.id } }, client), "NOT_FOUND");
  });

  it("operators cannot manage users at all", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    await expectCode(createUser(ctx, { email: "q@test.local", name: "Q", assignment: op(w.gpA.id) }, client), "FORBIDDEN");
  });

  it("a taluka admin creates GP admins only inside the taluka and at the right level", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const ok = await createUser(ctx, { email: "gpadmin@test.local", name: "GP", password: "Strong-Pass-123", assignment: { role: "GP_ADMIN", unitId: w.gpB.id } }, client);
    expect(ok.temporaryPassword).toBeNull();
    await expectCode(createUser(ctx, { email: "other@test.local", name: "O", assignment: { role: "GP_ADMIN", unitId: w.gpC.id } }, client), "NOT_FOUND");
    await expectCode(createUser(ctx, { email: "lvl@test.local", name: "L", assignment: { role: "GP_ADMIN", unitId: w.taluka1.id } }, client), "BAD_REQUEST");
    await expectCode(createUser(ctx, { email: "peer@test.local", name: "P", assignment: { role: "TALUKA_ADMIN", unitId: w.taluka1.id } }, client), "FORBIDDEN");
  });

  it("operators require modules; other roles must not have them", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    await expectCode(createUser(ctx, { email: "m1@test.local", name: "M", assignment: { role: "DATA_ENTRY_OPERATOR", unitId: w.gpA.id } }, client), "BAD_REQUEST");
    await expectCode(createUser(ctx, { email: "m2@test.local", name: "M", assignment: { role: "GP_ADMIN", unitId: w.gpA.id, modules: [{ moduleKey: "media", canWrite: true }] } }, client), "BAD_REQUEST");
  });

  it("duplicate emails are rejected", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    await createUser(ctx, { email: "dup@test.local", name: "D", assignment: op(w.gpA.id) }, client);
    await expectCode(createUser(ctx, { email: "DUP@test.local", name: "D2", assignment: op(w.gpA.id) }, client), "CONFLICT");
  });

  it("suspending a user revokes their sessions; self-suspension is refused", async () => {
    const w = await buildWorld();
    const admin = await actor("TALUKA_ADMIN", w.taluka1.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const { token } = await createSession(operator.user.id);
    expect(await validateSessionToken(token)).not.toBeNull();

    await updateUser(admin.ctx, operator.user.id, { status: "SUSPENDED" }, client);
    expect(await validateSessionToken(token)).toBeNull();
    await expectCode(updateUser(admin.ctx, admin.user.id, { status: "SUSPENDED" }, client), "BAD_REQUEST");
  });

  it("revoking the last assignment logs the user out; module grants can be replaced", async () => {
    const w = await buildWorld();
    const admin = await actor("TALUKA_ADMIN", w.taluka1.id);
    const created = await createUser(admin.ctx, { email: "rev@test.local", name: "R", assignment: op(w.gpA.id) }, client);
    const assignmentId = created.user.assignments[0]!.id;

    const updated = await updateAssignmentModules(admin.ctx, created.user.id, assignmentId, [{ moduleKey: "projects", canWrite: false }], client);
    expect(updated.assignments[0]!.modules).toEqual([{ moduleKey: "projects", canWrite: false }]);

    const { token } = await createSession(created.user.id);
    const after = await revokeAssignment(admin.ctx, created.user.id, assignmentId, client);
    expect(after.assignments).toHaveLength(0);
    expect(await validateSessionToken(token)).toBeNull();
    await expectCode(revokeAssignment(admin.ctx, admin.user.id, admin.ctx.assignments[0]!.id, client), "BAD_REQUEST");
  });

  it("a taluka admin cannot add an out-of-scope assignment to a visible user", async () => {
    const w = await buildWorld();
    const admin = await actor("TALUKA_ADMIN", w.taluka1.id);
    const created = await createUser(admin.ctx, { email: "add@test.local", name: "A", assignment: op(w.gpA.id) }, client);
    await expectCode(addAssignment(admin.ctx, created.user.id, op(w.gpC.id), client), "NOT_FOUND");
  });

  it("super admin creates each user type at its own level, each logs in with its own credentials", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const gp = await createUser(ctx, { email: "gp@test.local", name: "GP", password: "Strong-Pass-123", assignment: { role: "GP_ADMIN", unitId: w.gpA.id } }, client);
    const tk = await createUser(ctx, { email: "tk@test.local", name: "TK", password: "Strong-Pass-456", assignment: { role: "TALUKA_ADMIN", unitId: w.taluka1.id } }, client);
    const opr = await createUser(ctx, { email: "opr@test.local", name: "OP", password: "Strong-Pass-789", assignment: op(w.gpB.id) }, client);
    expect([gp, tk, opr].map((r) => r.user.assignments[0]!.role)).toEqual(["GP_ADMIN", "TALUKA_ADMIN", "DATA_ENTRY_OPERATOR"]);
    // Wrong level for the type is refused.
    await expectCode(createUser(ctx, { email: "bad1@test.local", name: "B", assignment: { role: "TALUKA_ADMIN", unitId: w.gpA.id } }, client), "BAD_REQUEST");
    await expectCode(createUser(ctx, { email: "bad2@test.local", name: "B", assignment: { role: "GP_ADMIN", unitId: w.taluka1.id } }, client), "BAD_REQUEST");
    // Separate credentials: each password only opens its own account.
    expect(await login({ email: "gp@test.local", password: "Strong-Pass-123", rememberMe: false }, client)).toBeTruthy();
    await expectCode(login({ email: "gp@test.local", password: "Strong-Pass-456", rememberMe: false }, client), "UNAUTHENTICATED");
  });

  it("data isolation: a GP admin sees only users of their own Gram Panchayat; a taluka admin only their taluka", async () => {
    const w = await buildWorld();
    const sup = await actor("SUPER_ADMIN", w.state.id);
    const inA = await createUser(sup.ctx, { email: "a@test.local", name: "A", assignment: op(w.gpA.id) }, client);
    const inB = await createUser(sup.ctx, { email: "b@test.local", name: "B", assignment: op(w.gpB.id) }, client);
    const inC = await createUser(sup.ctx, { email: "c@test.local", name: "C", assignment: op(w.gpC.id) }, client);

    const gpAdmin = await actor("GP_ADMIN", w.gpA.id);
    const gpIds = (await listUsers(gpAdmin.ctx, { limit: 100 } as never)).items.map((u) => u.id);
    expect(gpIds).toContain(inA.user.id);
    expect(gpIds).not.toContain(inB.user.id);
    await expectCode(getUser(gpAdmin.ctx, inB.user.id), "NOT_FOUND");
    await expectCode(deleteUser(gpAdmin.ctx, inB.user.id, client), "NOT_FOUND");
    await expectCode(resetUserPassword(gpAdmin.ctx, inB.user.id, client), "NOT_FOUND");

    const talukaAdmin = await actor("TALUKA_ADMIN", w.taluka1.id);
    const tkIds = (await listUsers(talukaAdmin.ctx, { limit: 100 } as never)).items.map((u) => u.id);
    expect(tkIds).toEqual(expect.arrayContaining([inA.user.id, inB.user.id]));
    expect(tkIds).not.toContain(inC.user.id);
    await expectCode(updateUser(talukaAdmin.ctx, inC.user.id, { status: "SUSPENDED" }, client), "NOT_FOUND");
  });

  it("deleting a user revokes roles, ends sessions, blocks sign-in, hides them and frees the email", async () => {
    const w = await buildWorld();
    const sup = await actor("SUPER_ADMIN", w.state.id);
    const created = await createUser(sup.ctx, { email: "gone@test.local", name: "Gone", password: "Strong-Pass-123", assignment: { role: "GP_ADMIN", unitId: w.gpA.id } }, client);
    const { token } = await createSession(created.user.id);

    await deleteUser(sup.ctx, created.user.id, client);
    expect(await validateSessionToken(token)).toBeNull();
    await expectCode(login({ email: "gone@test.local", password: "Strong-Pass-123", rememberMe: false }, client), "UNAUTHENTICATED");
    await expectCode(getUser(sup.ctx, created.user.id), "NOT_FOUND");
    expect((await listUsers(sup.ctx, { limit: 100 } as never)).items.map((u) => u.id)).not.toContain(created.user.id);
    const row = await db.user.findUniqueOrThrow({ where: { id: created.user.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.status).toBe("SUSPENDED");
    expect(await db.roleAssignment.count({ where: { userId: created.user.id, revokedAt: null } })).toBe(0);
    expect(await db.auditLog.count({ where: { entityId: created.user.id, action: "user.delete" } })).toBe(1);
    // The email can be used again.
    await createUser(sup.ctx, { email: "gone@test.local", name: "Back", assignment: { role: "GP_ADMIN", unitId: w.gpA.id } }, client);
    // Self-delete is refused.
    await expectCode(deleteUser(sup.ctx, sup.user.id, client), "BAD_REQUEST");
  });

  it("GP admins and operators cannot delete users; a taluka admin can within the taluka", async () => {
    const w = await buildWorld();
    const sup = await actor("SUPER_ADMIN", w.state.id);
    const both = await createUser(sup.ctx, { email: "both@test.local", name: "Both", assignment: op(w.gpA.id) }, client);
    await addAssignment(sup.ctx, both.user.id, op(w.gpB.id), client);
    const gpAdmin = await actor("GP_ADMIN", w.gpA.id);
    await expectCode(deleteUser(gpAdmin.ctx, both.user.id, client), "FORBIDDEN");
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    await expectCode(deleteUser(operator.ctx, both.user.id, client), "FORBIDDEN");
    // A GP admin cannot delete anyone, even a user only in their GP; the taluka admin can.
    const only = await createUser(sup.ctx, { email: "only@test.local", name: "Only", assignment: op(w.gpA.id) }, client);
    await expectCode(deleteUser(gpAdmin.ctx, only.user.id, client), "FORBIDDEN");
    const talukaAdmin = await actor("TALUKA_ADMIN", w.taluka1.id);
    await deleteUser(talukaAdmin.ctx, only.user.id, client);
  });

  it("an admin password reset gives a working temporary password and signs the user out", async () => {
    const w = await buildWorld();
    const sup = await actor("SUPER_ADMIN", w.state.id);
    const created = await createUser(sup.ctx, { email: "rp@test.local", name: "RP", password: "Strong-Pass-123", assignment: { role: "TALUKA_ADMIN", unitId: w.taluka1.id } }, client);
    const { token } = await createSession(created.user.id);
    const res = await resetUserPassword(sup.ctx, created.user.id, client);
    expect(res.user.mustResetPassword).toBe(true);
    expect(await validateSessionToken(token)).toBeNull();
    await expectCode(login({ email: "rp@test.local", password: "Strong-Pass-123", rememberMe: false }, client), "UNAUTHENTICATED");
    expect(await login({ email: "rp@test.local", password: res.temporaryPassword, rememberMe: false }, client)).toBeTruthy();
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: created.user.id, action: "user.password_reset" } });
    expect(JSON.stringify(audit)).not.toContain(res.temporaryPassword);
    await expectCode(resetUserPassword(sup.ctx, sup.user.id, client), "BAD_REQUEST");
  });
});
