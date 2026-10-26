import { describe, expect, it } from "vitest";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  listPublicProjects,
  transitionProject,
  updateProject,
} from "@/features/projects/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const draft = (tenantId: string, nameEn = "Road to school", stage: "UPCOMING" | "ONGOING" | "COMPLETED" = "ONGOING") => ({ tenantId, stage, nameEn });

describe("project workflow", () => {
  it("operator drafts and submits; admin approves and publishes; audit trail recorded", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);

    const p = await createProject(operator.ctx, { ...draft(w.tenantA.id), budget: 250000, year: 2026, familiesBenefited: 40 }, client);
    expect(p).toMatchObject({ status: "DRAFT", budget: "250000.00", year: 2026 });
    expect((await transitionProject(operator.ctx, p.id, "submit", null, client)).status).toBe("SUBMITTED");
    await expectCode(transitionProject(operator.ctx, p.id, "approve", null, client), "FORBIDDEN");
    await expectCode(transitionProject(operator.ctx, p.id, "publish", null, client), "FORBIDDEN");
    await expectCode(updateProject(operator.ctx, p.id, { nameEn: "late" }, client), "CONFLICT");

    expect((await transitionProject(admin.ctx, p.id, "approve", null, client)).status).toBe("APPROVED");
    expect((await transitionProject(admin.ctx, p.id, "publish", null, client)).publishedById).toBe(admin.user.id);

    const actions = (await db.auditLog.findMany({ where: { entityId: p.id }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions).toEqual(["project.create", "project.submit", "project.approve", "project.publish"]);
  });

  it("rejection needs a note; editing a rejected project reopens it as a draft", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const p = await createProject(operator.ctx, draft(w.tenantA.id), client);
    await transitionProject(operator.ctx, p.id, "submit", null, client);
    await expectCode(transitionProject(admin.ctx, p.id, "reject", null, client), "BAD_REQUEST");
    await transitionProject(admin.ctx, p.id, "reject", "Add ward number", client);
    expect(await updateProject(operator.ctx, p.id, { wardNo: "3" }, client)).toMatchObject({ status: "DRAFT", wardNo: "3", reviewNote: null });
  });

  it("operators need the projects module with write access", async () => {
    const w = await buildWorld();
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "schemes" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects", canWrite: false }]);
    await expectCode(createProject(noModule.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    await expectCode(createProject(readOnly.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    expect((await listProjects(readOnly.ctx, { limit: 10 })).items).toEqual([]);
  });

  it("cross-tenant access by id is a 404; taluka admins see projects of every GP in their taluka", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const taluka2 = await actor("TALUKA_ADMIN", w.taluka2.id);

    const p = await createProject(adminA.ctx, draft(w.tenantA.id), client);
    await expectCode(getProject(adminB.ctx, p.id), "NOT_FOUND");
    await expectCode(updateProject(adminB.ctx, p.id, { nameEn: "tampered" }, client), "NOT_FOUND");
    await expectCode(transitionProject(adminB.ctx, p.id, "submit", null, client), "NOT_FOUND");
    await expectCode(deleteProject(adminB.ctx, p.id, client), "NOT_FOUND");
    await expectCode(createProject(adminB.ctx, draft(w.tenantA.id), client), "NOT_FOUND");
    expect((await listProjects(adminB.ctx, { limit: 10, tenantId: w.tenantA.id })).items).toHaveLength(0);

    expect((await listProjects(taluka.ctx, { limit: 10 })).items.map((i) => i.id)).toEqual([p.id]);
    expect((await listProjects(taluka2.ctx, { limit: 10 })).items).toHaveLength(0);
    await expectCode(getProject(taluka2.ctx, p.id), "NOT_FOUND");
  });

  it("a cover image must belong to the same website", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const imageB = await db.media.create({
      data: { tenantId: w.tenantB.id, ownerUnitId: w.gpB.id, kind: "IMAGE", storageKey: `${w.tenantB.id}/x.png`, originalName: "x.png", mimeType: "image/png", sizeBytes: 10, uploadedById: adminB.user.id },
    });
    const imageA = await db.media.create({
      data: { tenantId: w.tenantA.id, ownerUnitId: w.gpA.id, kind: "IMAGE", storageKey: `${w.tenantA.id}/y.png`, originalName: "y.png", mimeType: "image/png", sizeBytes: 10, uploadedById: adminA.user.id },
    });
    await expectCode(createProject(adminA.ctx, { ...draft(w.tenantA.id), coverImageId: imageB.id }, client), "BAD_REQUEST");
    expect((await createProject(adminA.ctx, { ...draft(w.tenantA.id), coverImageId: imageA.id }, client)).coverImageId).toBe(imageA.id);
  });
});

describe("public projects", () => {
  it("lists only published projects of a published website, filtered by stage", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const publish = async (id: string) => {
      await transitionProject(admin.ctx, id, "submit", null, client);
      await transitionProject(admin.ctx, id, "approve", null, client);
      await transitionProject(admin.ctx, id, "publish", null, client);
    };
    const done = await createProject(admin.ctx, draft(w.tenantA.id, "Done", "COMPLETED"), client);
    await publish(done.id);
    const ongoing = await createProject(admin.ctx, draft(w.tenantA.id, "Ongoing", "ONGOING"), client);
    await publish(ongoing.id);
    await createProject(admin.ctx, draft(w.tenantA.id, "Draft", "UPCOMING"), client);

    const names = async (stage?: "UPCOMING" | "ONGOING" | "COMPLETED") => (await listPublicProjects("gp-a", { limit: 50, stage })).items.map((i) => i.nameEn).sort();
    expect(await names()).toEqual(["Done", "Ongoing"]);
    expect(await names("COMPLETED")).toEqual(["Done"]);
    expect(await names("UPCOMING")).toEqual([]);
    expect((await listPublicProjects("gp-b", { limit: 50 })).items).toEqual([]);
    expect(Object.keys((await listPublicProjects("gp-a", { limit: 1 })).items[0]!)).not.toContain("createdById");

    await expectCode(deleteProject(admin.ctx, done.id, client), "CONFLICT");
    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "SUSPENDED" } });
    await expectCode(listPublicProjects("gp-a", { limit: 10 }), "NOT_FOUND");
  });
});
