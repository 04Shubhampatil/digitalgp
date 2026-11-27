import { describe, expect, it } from "vitest";
import { deleteTenant } from "@/features/tenants/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client, createTenant, createUnit } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

describe("deleting a website", () => {
  it("a super admin deletes an unpublished website and its content; the Gram Panchayat stays", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const unit = await createUnit("GRAM_PANCHAYAT", w.taluka1.id, "to-delete");
    const site = await createTenant(unit.id, "to-delete", "DRAFT");
    // createTenant already adds the default pages; they must go with the website.
    expect(await db.page.count({ where: { tenantId: site.id } })).toBeGreaterThan(0);
    await expectCode(deleteTenant(ctx, site.id, "wrong-address", client), "BAD_REQUEST");
    await deleteTenant(ctx, site.id, "to-delete", client);
    expect(await db.tenant.count({ where: { id: site.id } })).toBe(0);
    expect(await db.page.count({ where: { tenantId: site.id } })).toBe(0);
    expect(await db.adminUnit.count({ where: { id: site.unitId } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "tenant.delete", entityId: site.id } })).toBe(1);
    // The other websites are untouched.
    expect(await db.tenant.count({ where: { id: { in: [w.tenantA.id, w.tenantB.id, w.tenantC.id] } } })).toBe(3);
  });

  it("a published website must be unpublished first", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    await expectCode(deleteTenant(ctx, w.tenantA.id, "gp-a", client), "CONFLICT");
    expect(await db.tenant.count({ where: { id: w.tenantA.id } })).toBe(1);
  });

  it("only the super admin can delete a website", async () => {
    const w = await buildWorld();
    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    await expectCode(deleteTenant(taluka.ctx, w.tenantA.id, "gp-a", client), "FORBIDDEN");
    const gp = await actor("GP_ADMIN", w.gpA.id);
    await expectCode(deleteTenant(gp.ctx, w.tenantA.id, "gp-a", client), "FORBIDDEN");
    expect(await db.tenant.count({ where: { id: w.tenantA.id } })).toBe(1);
  });
});
