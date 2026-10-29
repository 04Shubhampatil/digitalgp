import { beforeEach, describe, expect, it } from "vitest";
import { changeGrievanceStatus, submitGrievance } from "@/features/grievances/service";
import { putSchemeCoverage } from "@/features/schemes/coverage";
import { createScheme, transitionScheme } from "@/features/schemes/service";
import { financialYear, getPublicGrievanceStats, getPublicSchemeStats, getPublicServiceStats } from "@/features/stats/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer } from "@/lib/mailer";
import { invalidateMemo } from "@/lib/memo-cache";
import { actor, buildWorld, client, createUser } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

beforeEach(() => {
  invalidateMemo();
  setMailer({ send: async () => undefined });
});

const complaint = (category: string) => ({ category, citizenName: "Asha Patil", description: "Something is broken in our ward, please help." });

async function publishGeography(tenantId: string, data: object) {
  const author = await createUser();
  const page = await db.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey: "about" } } });
  const section = await db.section.create({ data: { tenantId, pageId: page.id, sectionKey: "geography", sortOrder: 20 } });
  const rev = await db.sectionRevision.create({
    data: { tenantId, sectionId: section.id, version: 1, status: "PUBLISHED", data: data as never, createdById: author.id, publishedById: author.id, publishedAt: new Date() },
  });
  await db.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
}

describe("public statistics", () => {
  it("grievance stats are computed from real records, with monthly trend and category split, and contain no personal data", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const now = new Date();
    const ids: string[] = [];
    for (const cat of ["Water", "Water", "Roads", "Light"]) {
      const r = await submitGrievance("gp-a", complaint(cat), client);
      ids.push((await db.grievance.findUniqueOrThrow({ where: { trackingCode: r.trackingCode } })).id);
    }
    await changeGrievanceStatus(admin.ctx, ids[0]!, { status: "RESOLVED", note: "Fixed" }, client);
    await changeGrievanceStatus(admin.ctx, ids[2]!, { status: "REJECTED", note: "Not ours" }, client);
    // One complaint from last month, one from the month before (resolved last month).
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10));
    const monthBefore = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 10));
    await db.grievance.update({ where: { id: ids[1]! }, data: { createdAt: lastMonth } });
    await db.grievance.update({ where: { id: ids[3]! }, data: { createdAt: monthBefore, status: "RESOLVED", resolvedAt: lastMonth, resolutionNote: "ok" } });
    // Another website's complaints never count.
    const otherIp = { ipAddress: "198.51.100.9", userAgent: "vitest" };
    await submitGrievance("gp-b", complaint("Water"), otherIp);

    const s = await getPublicGrievanceStats("gp-a", now);
    expect(s).toMatchObject({ total: 4, resolved: 2, rejected: 1, pending: 1, resolutionRate: 50 });
    expect(s.monthly).toHaveLength(12);
    expect(s.monthly[11]).toMatchObject({ received: 2, resolved: 1, pending: 0 });
    expect(s.lastMonth).toEqual({ received: 1, resolved: 1 });
    expect(s.monthBefore).toEqual({ received: 1, resolved: 0 });
    expect(s.receivedChangePercent).toBe(0);
    expect(s.byCategory).toEqual([
      { category: "Water", total: 2, resolved: 1, sharePercent: 50 },
      { category: "Light", total: 1, resolved: 1, sharePercent: 25 },
      { category: "Roads", total: 1, resolved: 0, sharePercent: 25 },
    ]);
    expect(JSON.stringify(s)).not.toContain("Asha");
    expect(JSON.stringify(s)).not.toContain("GRV-");

    // Memoised: a new complaint is not visible until the TTL passes.
    await submitGrievance("gp-a", complaint("Water"), otherIp);
    expect((await getPublicGrievanceStats("gp-a", now)).total).toBe(4);
    invalidateMemo();
    expect((await getPublicGrievanceStats("gp-a", now)).total).toBe(5);

    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    invalidateMemo();
    await expectCode(getPublicGrievanceStats("gp-a", now), "NOT_FOUND");
  });

  it("empty websites return zeros and null rates", async () => {
    await buildWorld();
    const s = await getPublicGrievanceStats("gp-a");
    expect(s).toMatchObject({ total: 0, resolved: 0, pending: 0, resolutionRate: null, receivedChangePercent: null, byCategory: [] });
    expect(s.monthly.every((m) => m.received === 0 && m.resolved === 0 && m.pending === 0)).toBe(true);
  });

  it("scheme stats aggregate published schemes, ward coverage and the About geography households", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const publish = async (id: string) => {
      await transitionScheme(admin.ctx, id, "submit", null, client);
      await transitionScheme(admin.ctx, id, "approve", null, client);
      await transitionScheme(admin.ctx, id, "publish", null, client);
    };
    const a = await createScheme(admin.ctx, { tenantId: w.tenantA.id, level: "CENTRAL", nameEn: "A", beneficiaryCount: 120, amountDisbursed: 150000.5 }, client);
    await publish(a.id);
    const b = await createScheme(admin.ctx, { tenantId: w.tenantA.id, level: "STATE", nameEn: "B", beneficiaryCount: 30 }, client);
    await publish(b.id);
    await createScheme(admin.ctx, { tenantId: w.tenantA.id, level: "STATE", nameEn: "Draft", beneficiaryCount: 999, amountDisbursed: 1 }, client);

    let s = await getPublicSchemeStats("gp-a");
    expect(s).toMatchObject({ totalSchemes: 2, totalBeneficiaries: 150, amountDisbursedTotal: "150000.50", amountDisbursedThisFinancialYear: null, householdsCovered: null, totalHouseholds: null, coveragePercent: null });

    await putSchemeCoverage(admin.ctx, w.tenantA.id, a.id, { wards: [{ wardNo: "1", households: 40 }, { wardNo: "2", households: 10 }] }, client);
    await putSchemeCoverage(admin.ctx, w.tenantA.id, b.id, { wards: [{ wardNo: "1", households: 25 }] }, client);
    await publishGeography(w.tenantA.id, { households: 200 });
    invalidateMemo();
    s = await getPublicSchemeStats("gp-a");
    // Ward 1: max(40, 25) = 40; ward 2: 10 → 50 of 200 households.
    expect(s).toMatchObject({ householdsCovered: 50, totalHouseholds: 200, coveragePercent: 25 });
    expect(s.financialYear).toBe(financialYear(new Date()).label);
    expect((await getPublicSchemeStats("gp-b")).totalSchemes).toBe(0);
  });

  it("service stats return this month's grievance figures and null for sources that do not exist yet", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const r = await submitGrievance("gp-a", complaint("Water"), client);
    const id = (await db.grievance.findUniqueOrThrow({ where: { trackingCode: r.trackingCode } })).id;
    await changeGrievanceStatus(admin.ctx, id, { status: "RESOLVED", note: "Done" }, client);
    await submitGrievance("gp-a", complaint("Roads"), client);
    const s = await getPublicServiceStats("gp-a");
    expect(s).toMatchObject({ grievancesReceivedThisMonth: 2, grievancesResolvedThisMonth: 1, certificatesIssuedThisMonth: null, taxCollectedThisMonth: null, citizenSatisfactionRate: null });
    expect(s.month).toMatch(/^\d{4}-\d{2}$/);
    void w;
  });

  it("financial year runs April to March", () => {
    expect(financialYear(new Date(Date.UTC(2026, 9, 29))).label).toBe("2026-27");
    expect(financialYear(new Date(Date.UTC(2026, 1, 10))).label).toBe("2025-26");
  });
});
