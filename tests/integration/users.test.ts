import { describe, expect, it } from "vitest";
import { addAssignment, createUser, revokeAssignment, updateAssignmentModules, updateUser } from "@/features/users/service";
import { createSession, validateSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const op = (unitId: string) => ({ role: "DATA_ENTRY_OPERATOR" as const, unitId, modules: [{ moduleKey: "announcements" as const, canWrite: true }] });

describe("user management", () => {
  it("a GP admin creates an operator in their own tenant with a temporary password", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);
    const result = await createUser(ctx, { email: "op@test.local", name: "Op", assignment: op(w.gpA.id) }, client);
    expect(result.temporaryPassword).toBeTruthy();
    expect(result.user.mustResetPassword).toBe(true);
    expect(result.user.assignments[0]).toMatchObject({ role: "DATA_ENTRY_OPERATOR", unitId: w.gpA.id, modules: [{ moduleKey: "announcements", canWrite: true }] });
    const audit = await db.auditLog.findMany({ where: { entityId: result.user.id, action: "user.create" } });
    expect(audit).toHaveLength(1);
  });

  it("a GP admin cannot create operators in another tenant or grant higher roles", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);
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
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);
    await createUser(ctx, { email: "dup@test.local", name: "D", assignment: op(w.gpA.id) }, client);
    await expectCode(createUser(ctx, { email: "DUP@test.local", name: "D2", assignment: op(w.gpA.id) }, client), "CONFLICT");
  });

  it("suspending a user revokes their sessions; self-suspension is refused", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const { token } = await createSession(operator.user.id);
    expect(await validateSessionToken(token)).not.toBeNull();

    await updateUser(admin.ctx, operator.user.id, { status: "SUSPENDED" }, client);
    expect(await validateSessionToken(token)).toBeNull();
    await expectCode(updateUser(admin.ctx, admin.user.id, { status: "SUSPENDED" }, client), "BAD_REQUEST");
  });

  it("revoking the last assignment logs the user out; module grants can be replaced", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
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

  it("a GP admin cannot add an out-of-scope assignment to a visible user", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const created = await createUser(admin.ctx, { email: "add@test.local", name: "A", assignment: op(w.gpA.id) }, client);
    await expectCode(addAssignment(admin.ctx, created.user.id, op(w.gpB.id), client), "NOT_FOUND");
  });
});
