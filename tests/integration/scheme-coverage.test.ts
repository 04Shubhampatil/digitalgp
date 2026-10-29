import { describe, expect, it } from "vitest";
import { deleteSchemeCoverage, getPublicSchemeCoverage, getSchemeCoverage, putSchemeCoverage } from "@/features/schemes/coverage";
import { createScheme, transitionScheme } from "@/features/schemes/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

async function publishedScheme(ctx: Parameters<typeof createScheme>[0], tenantId: string, nameEn: string) {
  const s = await createScheme(ctx, { tenantId, level: "GRAM_PANCHAYAT", nameEn }, client);
  await transitionScheme(ctx, s.id, "submit", null, client);
  await transitionScheme(ctx, s.id, "approve", null, client);
  await transitionScheme(ctx, s.id, "publish", null, client);
  return s;
}

describe("scheme ward coverage", () => {
  it("staff replace the per-ward counts; the public endpoint returns aggregates for published schemes only", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes" }]);
    const published = await publishedScheme(admin.ctx, w.tenantA.id, "PM Awas");
    const draft = await createScheme(admin.ctx, { tenantId: w.tenantA.id, level: "STATE", nameEn: "Draft scheme" }, client);

    const saved = await putSchemeCoverage(operator.ctx, w.tenantA.id, published.id, { wards: [{ wardNo: "2", households: 40 }, { wardNo: "1", households: 25 }] }, client);
    expect(saved).toMatchObject({ schemeId: published.id, totalHouseholds: 65, wards: [{ wardNo: "1", households: 25 }, { wardNo: "2", households: 40 }] });
    expect((await getSchemeCoverage(admin.ctx, w.tenantA.id, published.id)).totalHouseholds).toBe(65);
    await putSchemeCoverage(admin.ctx, w.tenantA.id, draft.id, { wards: [{ wardNo: "1", households: 99 }] }, client);

    expect(await getPublicSchemeCoverage("gp-a", published.id)).toEqual({ schemeId: published.id, totalHouseholds: 65, wards: [{ wardNo: "1", households: 25 }, { wardNo: "2", households: 40 }] });
    await expectCode(getPublicSchemeCoverage("gp-a", draft.id), "NOT_FOUND");
    // Without a scheme id: per-ward maximum across published schemes (draft scheme's 99 is excluded).
    expect(await getPublicSchemeCoverage("gp-a", undefined)).toEqual({ schemeId: null, totalHouseholds: 65, wards: [{ wardNo: "1", households: 25 }, { wardNo: "2", households: 40 }] });

    // Replace shrinks the list; audit recorded; delete clears it.
    await putSchemeCoverage(admin.ctx, w.tenantA.id, published.id, { wards: [{ wardNo: "1", households: 30 }] }, client);
    expect((await getPublicSchemeCoverage("gp-a", published.id)).wards).toEqual([{ wardNo: "1", households: 30 }]);
    await deleteSchemeCoverage(admin.ctx, w.tenantA.id, published.id, client);
    expect((await getPublicSchemeCoverage("gp-a", published.id)).wards).toEqual([]);
    expect((await db.auditLog.findMany({ where: { entityId: published.id, action: "scheme.coverage_update" } })).length).toBe(3);
  });

  it("validates ward numbers and household counts", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const s = await publishedScheme(admin.ctx, w.tenantA.id, "X");
    const { putCoverageSchema } = await import("@/features/schemes/coverage");
    expect(putCoverageSchema.safeParse({ wards: [{ wardNo: "1", households: 1 }, { wardNo: "1", households: 2 }] }).success).toBe(false);
    expect(putCoverageSchema.safeParse({ wards: [{ wardNo: "1", households: -1 }] }).success).toBe(false);
    expect(putCoverageSchema.safeParse({ wards: [{ wardNo: "", households: 1 }] }).success).toBe(false);
    expect(putCoverageSchema.safeParse({ wards: [], extra: 1 }).success).toBe(false);
    await expect(putSchemeCoverage(admin.ctx, w.tenantA.id, s.id, { wards: [] }, client)).resolves.toMatchObject({ totalHouseholds: 0 });
  });

  it("enforces tenant scope, scheme visibility and operator module grants", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes", canWrite: false }]);
    const own = await publishedScheme(adminA.ctx, w.tenantA.id, "Own");
    const wards = { wards: [{ wardNo: "1", households: 5 }] };

    await expectCode(putSchemeCoverage(adminB.ctx, w.tenantA.id, own.id, wards, client), "NOT_FOUND");
    await expectCode(getSchemeCoverage(adminB.ctx, w.tenantA.id, own.id), "NOT_FOUND");
    // Website B cannot record coverage for website A's scheme, even on its own tenant.
    await expectCode(putSchemeCoverage(adminB.ctx, w.tenantB.id, own.id, wards, client), "NOT_FOUND");
    await expectCode(putSchemeCoverage(noModule.ctx, w.tenantA.id, own.id, wards, client), "FORBIDDEN");
    await expectCode(putSchemeCoverage(readOnly.ctx, w.tenantA.id, own.id, wards, client), "FORBIDDEN");
    expect((await getSchemeCoverage(readOnly.ctx, w.tenantA.id, own.id)).wards).toEqual([]);

    // A shared scheme targeted at the taluka can carry coverage on each website under it.
    const shared = await createScheme(taluka.ctx, { level: "STATE", nameEn: "Shared", ownerUnitId: w.taluka1.id, targetUnitIds: [w.taluka1.id] }, client);
    await transitionScheme(taluka.ctx, shared.id, "submit", null, client);
    await transitionScheme(taluka.ctx, shared.id, "approve", null, client);
    await transitionScheme(taluka.ctx, shared.id, "publish", null, client);
    await putSchemeCoverage(adminA.ctx, w.tenantA.id, shared.id, { wards: [{ wardNo: "1", households: 7 }] }, client);
    await putSchemeCoverage(adminB.ctx, w.tenantB.id, shared.id, { wards: [{ wardNo: "1", households: 9 }] }, client);
    expect((await getPublicSchemeCoverage("gp-a", shared.id)).totalHouseholds).toBe(7);
    expect((await getPublicSchemeCoverage("gp-b", shared.id)).totalHouseholds).toBe(9);
    await expectCode(getPublicSchemeCoverage("gp-c", shared.id), "NOT_FOUND");
    await expectCode(getPublicSchemeCoverage("gp-a", own.id).then(() => getPublicSchemeCoverage("gp-b", own.id)), "NOT_FOUND");
  });
});
