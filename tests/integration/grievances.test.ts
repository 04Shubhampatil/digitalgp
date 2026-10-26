import { describe, expect, it } from "vitest";
import {
  assignGrievance,
  changeGrievanceStatus,
  generateTrackingCode,
  getGrievance,
  getPublicGrievanceStatus,
  listGrievances,
  submitGrievance,
} from "@/features/grievances/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const form = (n = 1) => ({ category: "water", citizenName: `Citizen ${n}`, citizenPhone: "9876543210", description: "No water supply in ward 3 for a week." });

describe("public grievance submission and tracking", () => {
  it("creates an OPEN grievance with a tracking code and an initial event; status lookup hides PII", async () => {
    const w = await buildWorld();
    const receipt = await submitGrievance("gp-a", form(), client);
    expect(receipt.trackingCode).toMatch(/^GRV-[A-HJ-NP-Z2-9]{8}$/);
    expect(receipt.status).toBe("OPEN");

    const status = await getPublicGrievanceStatus("gp-a", receipt.trackingCode);
    expect(status).toMatchObject({ status: "OPEN", category: "water", resolutionNote: null });
    expect(status.timeline).toEqual([{ status: "OPEN", at: expect.any(String) }]);
    expect(JSON.stringify(status)).not.toContain("Citizen 1");
    expect(JSON.stringify(status)).not.toContain("9876543210");

    // The code only resolves on the website it was filed with.
    await expectCode(getPublicGrievanceStatus("gp-b", receipt.trackingCode), "NOT_FOUND");
    await expectCode(getPublicGrievanceStatus("gp-a", "GRV-ZZZZZZZZ"), "NOT_FOUND");

    const audit = await db.auditLog.findMany({ where: { entityType: "Grievance" } });
    expect(audit.map((a) => a.action)).toEqual(["grievance.submit"]);
    expect(audit[0]!.actorId).toBeNull();
    expect(JSON.stringify(audit[0]!.after)).not.toContain("9876543210");
    void w;
  });

  it("refuses submissions on unpublished websites and rate-limits per IP", async () => {
    const w = await buildWorld();
    await db.tenant.update({ where: { id: w.tenantB.id }, data: { status: "DRAFT" } });
    await expectCode(submitGrievance("gp-b", form(), client), "NOT_FOUND");
    const ip = { ipAddress: "10.0.0.9", userAgent: "vitest" };
    for (let i = 0; i < 5; i++) await submitGrievance("gp-a", form(i), ip);
    await expectCode(submitGrievance("gp-a", form(9), ip), "RATE_LIMITED");
    expect(generateTrackingCode()).not.toBe(generateTrackingCode());
  });
});

describe("grievance handling", () => {
  it("admin assigns to staff of the website, moves through statuses with events and audit; closing needs a note", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "grievances" }]);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const receipt = await submitGrievance("gp-a", form(), client);
    const id = (await db.grievance.findUniqueOrThrow({ where: { trackingCode: receipt.trackingCode } })).id;

    // Staff of another website cannot be assigned.
    await expectCode(assignGrievance(admin.ctx, id, { assignedToId: adminB.user.id }, client), "BAD_REQUEST");
    const assigned = await assignGrievance(admin.ctx, id, { assignedToId: operator.user.id }, client);
    expect(assigned).toMatchObject({ assignedToId: operator.user.id, assignedToName: "Test User" });

    await expectCode(changeGrievanceStatus(admin.ctx, id, { status: "RESOLVED", note: null }, client), "BAD_REQUEST");
    const inProgress = await changeGrievanceStatus(admin.ctx, id, { status: "IN_PROGRESS", note: "Site visit scheduled" }, client);
    expect(inProgress.status).toBe("IN_PROGRESS");
    await expectCode(changeGrievanceStatus(admin.ctx, id, { status: "IN_PROGRESS" }, client), "INVALID_TRANSITION");
    const resolved = await changeGrievanceStatus(admin.ctx, id, { status: "RESOLVED", note: "Pipeline repaired" }, client);
    expect(resolved).toMatchObject({ status: "RESOLVED", resolutionNote: "Pipeline repaired" });
    expect(resolved.resolvedAt).not.toBeNull();
    expect(resolved.events.map((e) => e.toStatus)).toEqual(["OPEN", "IN_PROGRESS", "RESOLVED"]);
    expect(resolved.events[2]).toMatchObject({ actorId: admin.user.id, fromStatus: "IN_PROGRESS", note: "Pipeline repaired" });

    const pub = await getPublicGrievanceStatus("gp-a", receipt.trackingCode);
    expect(pub).toMatchObject({ status: "RESOLVED", resolutionNote: "Pipeline repaired" });
    expect(pub.timeline.map((t) => t.status)).toEqual(["OPEN", "IN_PROGRESS", "RESOLVED"]);
    expect(JSON.stringify(pub)).not.toContain("Site visit scheduled");

    // Reopen.
    expect((await changeGrievanceStatus(admin.ctx, id, { status: "IN_PROGRESS" }, client)).resolutionNote).toBeNull();

    const actions = (await db.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
    expect(actions).toEqual(["grievance.submit", "grievance.assign", "grievance.status.in_progress", "grievance.status.resolved", "grievance.status.in_progress"]);
  });

  it("operators with the grievances module can read but not act; without it they see nothing", async () => {
    const w = await buildWorld();
    const withModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "grievances", canWrite: false }]);
    const withoutModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const receipt = await submitGrievance("gp-a", form(), client);
    const id = (await db.grievance.findUniqueOrThrow({ where: { trackingCode: receipt.trackingCode } })).id;

    expect((await listGrievances(withModule.ctx, { limit: 10 })).items.map((g) => g.id)).toEqual([id]);
    expect((await getGrievance(withModule.ctx, id)).citizenName).toBe("Citizen 1");
    await expectCode(assignGrievance(withModule.ctx, id, { assignedToId: null }, client), "FORBIDDEN");
    await expectCode(changeGrievanceStatus(withModule.ctx, id, { status: "IN_PROGRESS" }, client), "FORBIDDEN");

    expect((await listGrievances(withoutModule.ctx, { limit: 10 })).items).toEqual([]);
    await expectCode(getGrievance(withoutModule.ctx, id), "NOT_FOUND");
  });

  it("grievances are invisible across tenants; taluka admins see their whole taluka", async () => {
    const w = await buildWorld();
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const taluka2 = await actor("TALUKA_ADMIN", w.taluka2.id);
    const receipt = await submitGrievance("gp-a", form(), client);
    const id = (await db.grievance.findUniqueOrThrow({ where: { trackingCode: receipt.trackingCode } })).id;

    await expectCode(getGrievance(adminB.ctx, id), "NOT_FOUND");
    await expectCode(assignGrievance(adminB.ctx, id, { assignedToId: adminB.user.id }, client), "NOT_FOUND");
    await expectCode(changeGrievanceStatus(adminB.ctx, id, { status: "REJECTED", note: "x" }, client), "NOT_FOUND");
    expect((await listGrievances(adminB.ctx, { limit: 10 })).items).toEqual([]);
    expect((await listGrievances(adminB.ctx, { limit: 10, tenantId: w.tenantA.id })).items).toEqual([]);
    expect((await listGrievances(taluka.ctx, { limit: 10, status: "OPEN" })).items.map((g) => g.id)).toEqual([id]);
    expect((await listGrievances(taluka2.ctx, { limit: 10 })).items).toEqual([]);
  });
});
