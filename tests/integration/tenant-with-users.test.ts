import { describe, expect, it } from "vitest";
import { createTenantWithUsers, listTenantUsers } from "@/features/tenants/service";
import type { CreateTenantWithUsersInput } from "@/features/tenants/validators";
import { login } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client, createUnit, createUser } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const issuePaths = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof AppError && e.code === "VALIDATION_ERROR") return (e.details as { path: string }[]).map((i) => i.path);
    throw e;
  }
  throw new Error("expected a validation error");
};

const input = (unitId: string, over: Partial<CreateTenantWithUsersInput> = {}): CreateTenantWithUsersInput => ({
  unitId,
  slug: `new-gp-${Math.random().toString(36).slice(2, 8)}`,
  nameEn: "New GP",
  nameMr: "नवीन ग्रा.पं.",
  gpAdmin: { name: "GP Admin", email: `gpadmin-${Math.random().toString(36).slice(2, 8)}@test.local` },
  operators: [],
  ...over,
});

/** World plus a Gram Panchayat in taluka1 / taluka2 that has no website yet. */
async function worldWithFreeGps() {
  const w = await buildWorld();
  const freeInT1 = await createUnit("GRAM_PANCHAYAT", w.taluka1.id);
  const freeInT2 = await createUnit("GRAM_PANCHAYAT", w.taluka2.id);
  return { ...w, freeInT1, freeInT2 };
}

const counts = async () => ({
  tenants: await db.tenant.count(),
  users: await db.user.count(),
  assignments: await db.roleAssignment.count(),
  audits: await db.auditLog.count(),
});

describe("one-step website creation (POST /tenants/with-users)", () => {
  it("a Super Admin creates the website, the GP Admin and an operator together, with audit entries", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const body = input(w.freeInT2.id, {
      operators: [{ name: "Operator", email: "op-one@test.local", modules: [{ moduleKey: "announcements", canWrite: true }] }],
    });

    const res = await createTenantWithUsers(ctx, body, client);

    expect(res.tenant.unitId).toBe(w.freeInT2.id);
    expect(await db.page.count({ where: { tenantId: res.tenant.id } })).toBeGreaterThan(0);
    expect(res.gpAdmin.temporaryPassword).toBeTruthy();
    expect(res.gpAdmin.user.mustResetPassword).toBe(true);
    expect(res.gpAdmin.user.assignments[0]).toMatchObject({ role: "GP_ADMIN", unitId: w.freeInT2.id });
    expect(res.operators).toHaveLength(1);
    expect(res.operators[0]!.user.assignments[0]).toMatchObject({ role: "DATA_ENTRY_OPERATOR", unitId: w.freeInT2.id, modules: [{ moduleKey: "announcements", canWrite: true }] });

    const audits = await db.auditLog.findMany({ where: { OR: [{ entityId: res.tenant.id }, { entityId: res.gpAdmin.user.id }, { entityId: res.operators[0]!.user.id }, { unitId: w.freeInT2.id }] } });
    const actions = audits.map((a) => a.action);
    expect(actions.filter((a) => a === "tenant.create")).toHaveLength(1);
    expect(actions.filter((a) => a === "user.create")).toHaveLength(2);
    expect(actions.filter((a) => a === "user.assignment_grant")).toHaveLength(2);

    // The temporary password is never written to the audit log (nor any hash).
    const serialised = JSON.stringify(audits);
    expect(serialised).not.toContain(res.gpAdmin.temporaryPassword!);
    expect(serialised).not.toContain(res.operators[0]!.temporaryPassword!);
    expect(serialised.toLowerCase()).not.toContain("passwordhash");
  });

  it("a typed password is used as-is and not returned; the new GP Admin can sign in with it", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const body = input(w.freeInT1.id, { gpAdmin: { name: "Typed", email: "typed@test.local", password: "Strong-Pass-123" } });
    const res = await createTenantWithUsers(ctx, body, client);
    expect(res.gpAdmin.temporaryPassword).toBeNull();
    expect(res.gpAdmin.user.mustResetPassword).toBe(false);
    const session = await login({ email: "typed@test.local", password: "Strong-Pass-123", rememberMe: false }, client);
    expect(session).toBeTruthy();
  });

  it("a duplicate email rolls everything back and reports a field error", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    await createUser({ email: "taken@test.local" });
    const before = await counts();

    const paths = await issuePaths(createTenantWithUsers(ctx, input(w.freeInT1.id, { gpAdmin: { name: "Dup", email: "Taken@test.local" } }), client));
    expect(paths).toEqual(["gpAdmin.email"]);
    expect(await counts()).toEqual(before);
    expect(await db.tenant.findUnique({ where: { unitId: w.freeInT1.id } })).toBeNull();
  });

  it("a duplicate operator email also creates nothing (not even the GP Admin or website)", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    await createUser({ email: "op-taken@test.local" });
    const body = input(w.freeInT1.id, { operators: [{ name: "Op", email: "op-taken@test.local", modules: [{ moduleKey: "media", canWrite: true }] }] });
    const before = await counts();

    expect(await issuePaths(createTenantWithUsers(ctx, body, client))).toEqual(["operators.0.email"]);
    expect(await counts()).toEqual(before);
    expect(await db.user.findUnique({ where: { email: body.gpAdmin.email } })).toBeNull();
  });

  it("an existing website or a taken slug creates nothing", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    await expectCode(createTenantWithUsers(ctx, input(w.gpA.id), client), "CONFLICT");
    expect(await issuePaths(createTenantWithUsers(ctx, input(w.freeInT1.id, { slug: "gp-a" }), client))).toEqual(["slug"]);
    expect(await db.tenant.findUnique({ where: { unitId: w.freeInT1.id } })).toBeNull();
  });

  it("a website can only be created for a Gram Panchayat", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    await expectCode(createTenantWithUsers(ctx, input(w.taluka1.id), client), "BAD_REQUEST");
  });

  it("a Taluka Admin creates the website and users inside their own taluka", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const res = await createTenantWithUsers(
      ctx,
      input(w.freeInT1.id, { operators: [{ name: "Op", email: "t1-op@test.local", modules: [{ moduleKey: "schemes", canWrite: false }] }] }),
      client,
    );
    expect(res.operators[0]!.user.assignments[0]!.modules).toEqual([{ moduleKey: "schemes", canWrite: false }]);
    const users = await listTenantUsers(ctx, res.tenant.id);
    expect(users.map((u) => u.role).sort()).toEqual(["DATA_ENTRY_OPERATOR", "GP_ADMIN"]);
    expect(users.every((u) => u.status === "ACTIVE")).toBe(true);
  });

  it("a Taluka Admin cannot create a website or users outside their taluka (nothing is created)", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const before = await counts();
    await expectCode(createTenantWithUsers(ctx, input(w.freeInT2.id), client), "NOT_FOUND");
    expect(await counts()).toEqual(before);
  });

  it("a GP Admin cannot use it, even for a Gram Panchayat without a website", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("GP_ADMIN", w.freeInT1.id);
    const before = await counts();
    await expectCode(createTenantWithUsers(ctx, input(w.freeInT1.id), client), "FORBIDDEN");
    expect(await counts()).toEqual(before);
  });

  it("an operator cannot use it either", async () => {
    const w = await worldWithFreeGps();
    const { ctx } = await actor("DATA_ENTRY_OPERATOR", w.freeInT1.id, [{ moduleKey: "announcements" }]);
    await expectCode(createTenantWithUsers(ctx, input(w.freeInT1.id), client), "FORBIDDEN");
  });
});

describe("GET /tenants/:id/users", () => {
  it("is scoped: in-scope managers see the site's users, other talukas get 404, operators 403", async () => {
    const w = await worldWithFreeGps();
    const { ctx: sa } = await actor("SUPER_ADMIN", w.state.id);
    const res = await createTenantWithUsers(sa, input(w.freeInT1.id), client);

    const own = await actor("TALUKA_ADMIN", w.taluka1.id);
    expect((await listTenantUsers(own.ctx, res.tenant.id)).map((u) => u.email)).toEqual([res.gpAdmin.user.email]);

    const other = await actor("TALUKA_ADMIN", w.taluka2.id);
    await expectCode(listTenantUsers(other.ctx, res.tenant.id), "NOT_FOUND");

    const op = await actor("DATA_ENTRY_OPERATOR", w.freeInT1.id, [{ moduleKey: "announcements" }]);
    await expectCode(listTenantUsers(op.ctx, res.tenant.id), "FORBIDDEN");
  });
});
