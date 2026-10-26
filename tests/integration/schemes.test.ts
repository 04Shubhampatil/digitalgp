import { describe, expect, it } from "vitest";
import {
  createScheme,
  deleteScheme,
  getScheme,
  listPublicSchemes,
  listSchemes,
  transitionScheme,
  updateScheme,
} from "@/features/schemes/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const draft = (tenantId: string, nameEn = "PM Awas Yojana") => ({ tenantId, level: "GRAM_PANCHAYAT" as const, nameEn });

describe("scheme workflow", () => {
  it("operator drafts and submits; admin approves and publishes; audit trail recorded", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);

    const s = await createScheme(operator.ctx, { ...draft(w.tenantA.id), beneficiaryCount: 120, amountDisbursed: 150000.5 }, client);
    expect(s.status).toBe("DRAFT");
    expect(s.amountDisbursed).toBe("150000.50");
    expect((await transitionScheme(operator.ctx, s.id, "submit", null, client)).status).toBe("SUBMITTED");

    await expectCode(transitionScheme(operator.ctx, s.id, "approve", null, client), "FORBIDDEN");
    await expectCode(transitionScheme(operator.ctx, s.id, "publish", null, client), "FORBIDDEN");
    await expectCode(updateScheme(operator.ctx, s.id, { nameEn: "late edit" }, client), "CONFLICT");

    expect((await transitionScheme(admin.ctx, s.id, "approve", null, client)).status).toBe("APPROVED");
    const published = await transitionScheme(admin.ctx, s.id, "publish", null, client);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedById).toBe(admin.user.id);

    const actions = (await db.auditLog.findMany({ where: { entityId: s.id }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions).toEqual(["scheme.create", "scheme.submit", "scheme.approve", "scheme.publish"]);
  });

  it("rejection needs a note and editing a rejected scheme reopens it as a draft", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const s = await createScheme(operator.ctx, draft(w.tenantA.id), client);
    await transitionScheme(operator.ctx, s.id, "submit", null, client);
    await expectCode(transitionScheme(admin.ctx, s.id, "reject", "", client), "BAD_REQUEST");
    expect(await transitionScheme(admin.ctx, s.id, "reject", "Add eligibility", client)).toMatchObject({ status: "REJECTED", reviewNote: "Add eligibility" });
    const edited = await updateScheme(operator.ctx, s.id, { eligibilityMr: "सर्व" }, client);
    expect(edited).toMatchObject({ status: "DRAFT", reviewNote: null });
    await expectCode(transitionScheme(admin.ctx, s.id, "publish", null, client), "INVALID_TRANSITION");
  });

  it("operators need the schemes module with write access", async () => {
    const w = await buildWorld();
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes", canWrite: false }]);
    await expectCode(createScheme(noModule.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    await expectCode(createScheme(readOnly.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    expect((await listSchemes(readOnly.ctx, { limit: 10 })).items).toEqual([]);
  });

  it("cross-tenant access by id is a 404 and shared schemes require an admin with a valid target", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes" }]);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);

    const s = await createScheme(adminA.ctx, draft(w.tenantA.id), client);
    await expectCode(getScheme(adminB.ctx, s.id), "NOT_FOUND");
    await expectCode(updateScheme(adminB.ctx, s.id, { nameEn: "tampered" }, client), "NOT_FOUND");
    await expectCode(transitionScheme(adminB.ctx, s.id, "submit", null, client), "NOT_FOUND");
    await expectCode(deleteScheme(adminB.ctx, s.id, client), "NOT_FOUND");
    await expectCode(createScheme(adminB.ctx, draft(w.tenantA.id), client), "NOT_FOUND");
    expect((await listSchemes(adminB.ctx, { limit: 10, tenantId: w.tenantA.id })).items).toHaveLength(0);

    await expectCode(createScheme(operator.ctx, { level: "STATE", nameEn: "x", ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpA.id] }, client), "NOT_FOUND");
    await expectCode(createScheme(adminA.ctx, { level: "STATE", nameEn: "x", ownerUnitId: w.gpA.id, targetUnitIds: [w.gpA.id] }, client), "BAD_REQUEST");
    await expectCode(createScheme(taluka.ctx, { level: "STATE", nameEn: "x", ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpC.id] }, client), "BAD_REQUEST");
    // A shared scheme owned by the taluka is outside a GP admin scope (404); GP schemes have no targets (400).
    const shared = await createScheme(taluka.ctx, { level: "STATE", nameEn: "Shared", ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpA.id] }, client);
    await expectCode(updateScheme(adminA.ctx, shared.id, { nameEn: "y" }, client), "NOT_FOUND");
    await expectCode(updateScheme(adminA.ctx, s.id, { targetUnitIds: [w.gpA.id] }, client), "BAD_REQUEST");
  });
});

describe("public schemes", () => {
  it("shows own published schemes plus shared ones targeted at the GP or an ancestor", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const publish = async (ctx: typeof adminA.ctx, id: string) => {
      await transitionScheme(ctx, id, "submit", null, client);
      await transitionScheme(ctx, id, "approve", null, client);
      await transitionScheme(ctx, id, "publish", null, client);
    };
    const own = await createScheme(adminA.ctx, draft(w.tenantA.id, "Own"), client);
    await publish(adminA.ctx, own.id);
    await createScheme(adminA.ctx, draft(w.tenantA.id, "Own draft"), client);
    const toB = await createScheme(taluka.ctx, { level: "STATE", nameEn: "To B", ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpB.id] }, client);
    await publish(taluka.ctx, toB.id);
    const wide = await createScheme(taluka.ctx, { level: "CENTRAL", nameEn: "Taluka wide", ownerUnitId: w.taluka1.id, targetUnitIds: [w.taluka1.id] }, client);
    await publish(taluka.ctx, wide.id);

    const names = async (slug: string, level?: "CENTRAL" | "STATE" | "DISTRICT" | "GRAM_PANCHAYAT") =>
      (await listPublicSchemes(slug, { limit: 50, level })).items.map((i) => i.nameEn).sort();
    expect(await names("gp-a")).toEqual(["Own", "Taluka wide"]);
    expect(await names("gp-b")).toEqual(["Taluka wide", "To B"]);
    expect(await names("gp-c")).toEqual([]);
    expect(await names("gp-a", "CENTRAL")).toEqual(["Taluka wide"]);

    const onA = (await listPublicSchemes("gp-a", { limit: 50 })).items;
    expect(onA.find((i) => i.nameEn === "Taluka wide")?.isShared).toBe(true);
    expect(Object.keys(onA[0]!)).not.toContain("createdById");

    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    await expectCode(listPublicSchemes("gp-a", { limit: 10 }), "NOT_FOUND");
  });

  it("published schemes must be unpublished before deletion", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const s = await createScheme(admin.ctx, draft(w.tenantA.id), client);
    await transitionScheme(admin.ctx, s.id, "submit", null, client);
    await transitionScheme(admin.ctx, s.id, "approve", null, client);
    await transitionScheme(admin.ctx, s.id, "publish", null, client);
    await expectCode(deleteScheme(admin.ctx, s.id, client), "CONFLICT");
    await transitionScheme(admin.ctx, s.id, "unpublish", null, client);
    await deleteScheme(admin.ctx, s.id, client);
    expect((await listSchemes(admin.ctx, { limit: 10 })).items).toHaveLength(0);
  });
});
