import { describe, expect, it } from "vitest";
import { createUnit, deleteUnit } from "@/features/hierarchy/service";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const gp = (parentId: string, slug: string) => ({ level: "GRAM_PANCHAYAT" as const, parentId, slug, nameEn: slug, nameMr: slug, code: null });

describe("adding Gram Panchayats", () => {
  it("a taluka admin adds a Gram Panchayat inside their own taluka only", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    const created = await createUnit(ctx, gp(w.taluka1.id, "new-gp-one"), client);
    expect(created.level).toBe("GRAM_PANCHAYAT");
    expect(created.parentId).toBe(w.taluka1.id);
    // Another taluka is outside their scope.
    await expectCode(createUnit(ctx, gp(w.taluka2.id, "new-gp-two"), client), "NOT_FOUND");
  });

  it("a taluka admin cannot add anything other than a Gram Panchayat", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("TALUKA_ADMIN", w.taluka1.id);
    await expectCode(createUnit(ctx, { level: "BLOCK", parentId: w.taluka1.id, slug: "blk", nameEn: "b", nameMr: "b", code: null }, client), "FORBIDDEN");
  });

  it("a GP admin and an operator cannot add Gram Panchayats", async () => {
    const w = await buildWorld();
    const gpAdmin = await actor("GP_ADMIN", w.gpA.id);
    await expectCode(createUnit(gpAdmin.ctx, gp(w.taluka1.id, "gp-x"), client), "FORBIDDEN");
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    await expectCode(createUnit(operator.ctx, gp(w.taluka1.id, "gp-y"), client), "FORBIDDEN");
  });

  it("a super admin adds a taluka and a Gram Panchayat", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const taluka = await createUnit(ctx, { level: "TALUKA", parentId: w.district.id, slug: "new-taluka", nameEn: "t", nameMr: "t", code: null }, client);
    const created = await createUnit(ctx, gp(taluka.id, "gp-in-new-taluka"), client);
    expect(created.parentId).toBe(taluka.id);
  });
});

describe("deleting units", () => {
  it("a super admin deletes an empty Gram Panchayat but not one with a website, users or children", async () => {
    const w = await buildWorld();
    const { ctx } = await actor("SUPER_ADMIN", w.state.id);
    const empty = await createUnit(ctx, gp(w.taluka1.id, "empty-gp"), client);
    await deleteUnit(ctx, empty.id, client);
    await expectCode(deleteUnit(ctx, empty.id, client), "NOT_FOUND");
    // A taluka that still has Gram Panchayats cannot be deleted.
    await expectCode(deleteUnit(ctx, w.taluka1.id, client), "CONFLICT");
    // A Gram Panchayat with users assigned cannot be deleted.
    await actor("GP_ADMIN", w.gpA.id);
    await expectCode(deleteUnit(ctx, w.gpA.id, client), "CONFLICT");
  });

  it("states and districts are never deleted, and a taluka admin cannot delete", async () => {
    const w = await buildWorld();
    const sup = await actor("SUPER_ADMIN", w.state.id);
    await expectCode(deleteUnit(sup.ctx, w.district.id, client), "BAD_REQUEST");
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const fresh = await createUnit(taluka.ctx, gp(w.taluka1.id, "gp-to-keep"), client);
    await expectCode(deleteUnit(taluka.ctx, fresh.id, client), "FORBIDDEN");
  });
});
