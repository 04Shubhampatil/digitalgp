import { describe, expect, it } from "vitest";
import { createAnnouncement, getAnnouncement, listAnnouncements, transitionAnnouncement, updateAnnouncement } from "@/features/announcements/service";
import { getTenant, listTenants, setTenantStatus, updateTenant } from "@/features/tenants/service";
import { getUser, listUsers } from "@/features/users/service";
import { AppError } from "@/lib/errors";
import { getTenantForActor } from "@/lib/tenant";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

describe("tenant isolation", () => {
  it("a GP admin cannot read, update or publish another Gram Panchayat's website (404)", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);

    await expect(getTenant(ctx, w.tenantA.id)).resolves.toMatchObject({ id: w.tenantA.id });
    await expectCode(getTenant(ctx, w.tenantB.id), "NOT_FOUND");
    await expectCode(getTenantForActor(ctx, w.tenantB.id), "NOT_FOUND");
    await expectCode(updateTenant(ctx, w.tenantB.id, { nameEn: "Hacked" }, client), "NOT_FOUND");
    await expectCode(setTenantStatus(ctx, w.tenantB.id, "SUSPENDED", client), "NOT_FOUND");

    const list = await listTenants(ctx, { limit: 50 });
    expect(list.items.map((t) => t.id)).toEqual([w.tenantA.id]);
  });

  it("a taluka admin sees only tenants under their taluka", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const list = await listTenants(ctx, { limit: 50 });
    expect(list.items.map((t) => t.id).sort()).toEqual([w.tenantA.id, w.tenantB.id].sort());
    await expectCode(getTenant(ctx, w.tenantC.id), "NOT_FOUND");
  });

  it("announcements cannot be read or changed across tenants by manipulating ids", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);

    const a = await createAnnouncement(adminA.ctx, { tenantId: w.tenantA.id, category: "notice", priority: "NORMAL", titleEn: "A only", displayPages: ["home"] }, client);

    await expectCode(getAnnouncement(adminB.ctx, a.id), "NOT_FOUND");
    await expectCode(updateAnnouncement(adminB.ctx, a.id, { titleEn: "tampered" }, client), "NOT_FOUND");
    await expectCode(transitionAnnouncement(adminB.ctx, a.id, "submit", null, client), "NOT_FOUND");
    // Creating content *for* another tenant is also refused.
    await expectCode(createAnnouncement(adminB.ctx, { tenantId: w.tenantA.id, category: "notice", priority: "NORMAL", titleEn: "x", displayPages: ["home"] }, client), "NOT_FOUND");

    const listB = await listAnnouncements(adminB.ctx, { limit: 50 });
    expect(listB.items).toHaveLength(0);
    // Passing another tenant's id as a filter yields nothing rather than leaking.
    const filtered = await listAnnouncements(adminB.ctx, { limit: 50, tenantId: w.tenantA.id });
    expect(filtered.items).toHaveLength(0);
  });

  it("users of another tenant are invisible", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const operatorB = await actor("DATA_ENTRY_OPERATOR", w.gpB.id, [{ moduleKey: "announcements" }]);

    await expectCode(getUser(adminA.ctx, operatorB.user.id), "NOT_FOUND");
    const list = await listUsers(adminA.ctx, { limit: 50 });
    expect(list.items.map((u) => u.id)).not.toContain(operatorB.user.id);
    expect(list.items.map((u) => u.id)).toContain(adminA.user.id);
  });

  it("a user with no assignments sees nothing", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("GP_ADMIN", w.gpA.id);
    const emptyCtx = { ...ctx, assignments: [] };
    expect((await listTenants(emptyCtx, { limit: 50 })).items).toHaveLength(0);
    await expectCode(getTenant(emptyCtx, w.tenantA.id), "NOT_FOUND");
  });
});
