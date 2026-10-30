import { db } from "@/lib/db";
import { memoized } from "@/lib/memo-cache";
import { publishedSectionData } from "@/lib/published-section";
import { getPublicTenantBySlug, type ResolvedTenant } from "@/lib/tenant";
import type { PublicGrievanceStatsDto, PublicSchemeStatsDto, PublicServiceStatsDto } from "@/types/api";

/**
 * Public aggregate statistics for a website. Numbers only — no record ever leaves this module.
 * Each figure is memoised for STATS_TTL_MS per tenant; the route adds `Cache-Control: max-age=60`.
 * Figures with no data source yet are `null` (never 0) so the frontend can keep its sample values.
 */
export const STATS_TTL_MS = 60_000;

const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthStart = (d: Date, offset = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));

/** Indian financial year: 1 April – 31 March. */
export function financialYear(now: Date): { label: string; start: Date; end: Date } {
  const y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return { label: `${y}-${String(y + 1).slice(2)}`, start: new Date(Date.UTC(y, 3, 1)), end: new Date(Date.UTC(y + 1, 3, 1)) };
}

// ---------------------------------------------------------------------------
// Grievances
// ---------------------------------------------------------------------------

async function computeGrievanceStats(tenant: ResolvedTenant, now: Date): Promise<PublicGrievanceStatsDto> {
  const since = monthStart(now, -11);
  const [total, resolved, rejected, pending, recent, categories] = await Promise.all([
    db.grievance.count({ where: { tenantId: tenant.id } }),
    db.grievance.count({ where: { tenantId: tenant.id, status: "RESOLVED" } }),
    db.grievance.count({ where: { tenantId: tenant.id, status: "REJECTED" } }),
    db.grievance.count({ where: { tenantId: tenant.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.grievance.findMany({
      where: { tenantId: tenant.id, OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }] },
      select: { createdAt: true, resolvedAt: true, status: true },
    }),
    db.grievance.groupBy({ by: ["category", "status"], where: { tenantId: tenant.id }, _count: { _all: true } }),
  ]);

  const months: PublicGrievanceStatsDto["monthly"] = [];
  for (let i = 11; i >= 0; i--) {
    const start = monthStart(now, -i);
    const end = monthStart(now, -i + 1);
    const inMonth = (d: Date | null) => !!d && d >= start && d < end;
    months.push({
      month: monthKey(start),
      received: recent.filter((g) => inMonth(g.createdAt)).length,
      resolved: recent.filter((g) => g.status === "RESOLVED" && inMonth(g.resolvedAt)).length,
      pending: recent.filter((g) => inMonth(g.createdAt) && (g.status === "OPEN" || g.status === "IN_PROGRESS")).length,
    });
  }
  const lastMonth = months[months.length - 2]!;
  const monthBefore = months[months.length - 3]!;

  // Per-status counts for the escalation summary, from the same grouped query.
  const byStatus = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
  for (const row of categories) byStatus[row.status] += row._count._all;

  const byCat = new Map<string, { total: number; resolved: number }>();
  for (const row of categories) {
    const entry = byCat.get(row.category) ?? { total: 0, resolved: 0 };
    entry.total += row._count._all;
    if (row.status === "RESOLVED") entry.resolved += row._count._all;
    byCat.set(row.category, entry);
  }

  return {
    total,
    resolved,
    rejected,
    pending,
    resolutionRate: pct(resolved, total),
    lastMonth: { received: lastMonth.received, resolved: lastMonth.resolved },
    monthBefore: { received: monthBefore.received, resolved: monthBefore.resolved },
    receivedChangePercent: monthBefore.received > 0 ? Math.round(((lastMonth.received - monthBefore.received) / monthBefore.received) * 1000) / 10 : null,
    monthly: months,
    byCategory: [...byCat]
      .map(([category, c]) => ({ category, total: c.total, resolved: c.resolved, sharePercent: pct(c.total, total) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category)),
    byStatus,
    generatedAt: now.toISOString(),
  };
}

export async function getPublicGrievanceStats(tenantSlug: string, now: Date = new Date()): Promise<PublicGrievanceStatsDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  return memoized(`stats:grievances:${tenant.id}`, STATS_TTL_MS, () => computeGrievanceStats(tenant, now));
}

// ---------------------------------------------------------------------------
// Schemes
// ---------------------------------------------------------------------------

async function computeSchemeStats(tenant: ResolvedTenant, now: Date): Promise<PublicSchemeStatsDto> {
  const ancestorIds = tenant.unitPath.split("/").filter(Boolean);
  const visible = { deletedAt: null, status: "PUBLISHED" as const, OR: [{ tenantId: tenant.id }, { tenantId: null, targets: { some: { unitId: { in: ancestorIds } } } }] };
  const [schemes, coverageRows, geography] = await Promise.all([
    db.scheme.findMany({ where: visible, select: { beneficiaryCount: true, amountDisbursed: true } }),
    db.schemeWardCoverage.findMany({ where: { tenantId: tenant.id, scheme: visible }, select: { wardNo: true, households: true } }),
    publishedSectionData(tenant.id, "about", "geography") as Promise<{ households?: number } | null>,
  ]);

  const withBeneficiaries = schemes.filter((s) => s.beneficiaryCount !== null);
  const withAmount = schemes.filter((s) => s.amountDisbursed !== null);
  const amountTotal = withAmount.reduce((sum, s) => sum + Number(s.amountDisbursed), 0);

  const perWard = new Map<string, number>();
  for (const r of coverageRows) perWard.set(r.wardNo, Math.max(perWard.get(r.wardNo) ?? 0, r.households));
  const householdsCovered = perWard.size ? [...perWard.values()].reduce((a, b) => a + b, 0) : null;
  const totalHouseholds = typeof geography?.households === "number" && geography.households > 0 ? geography.households : null;

  return {
    totalSchemes: schemes.length,
    totalBeneficiaries: withBeneficiaries.length ? withBeneficiaries.reduce((sum, s) => sum + (s.beneficiaryCount ?? 0), 0) : null,
    amountDisbursedTotal: withAmount.length ? amountTotal.toFixed(2) : null,
    amountDisbursedThisFinancialYear: null, // schemes hold a cumulative figure with no disbursement date
    householdsCovered,
    totalHouseholds,
    coveragePercent: householdsCovered !== null && totalHouseholds !== null ? Math.min(100, pct(householdsCovered, totalHouseholds) ?? 0) : null,
    financialYear: financialYear(now).label,
    generatedAt: now.toISOString(),
  };
}

export async function getPublicSchemeStats(tenantSlug: string, now: Date = new Date()): Promise<PublicSchemeStatsDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  return memoized(`stats:schemes:${tenant.id}`, STATS_TTL_MS, () => computeSchemeStats(tenant, now));
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

async function computeServiceStats(tenant: ResolvedTenant, now: Date): Promise<PublicServiceStatsDto> {
  const start = monthStart(now);
  const end = monthStart(now, 1);
  const [received, resolved] = await Promise.all([
    db.grievance.count({ where: { tenantId: tenant.id, createdAt: { gte: start, lt: end } } }),
    db.grievance.count({ where: { tenantId: tenant.id, status: "RESOLVED", resolvedAt: { gte: start, lt: end } } }),
  ]);
  return {
    certificatesIssuedThisMonth: null, // no certificate module yet
    grievancesResolvedThisMonth: resolved,
    grievancesReceivedThisMonth: received,
    taxCollectedThisMonth: null, // no tax-collection data yet
    citizenSatisfactionRate: null, // no rating captured on resolution yet
    month: monthKey(start),
    generatedAt: now.toISOString(),
  };
}

export async function getPublicServiceStats(tenantSlug: string, now: Date = new Date()): Promise<PublicServiceStatsDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  return memoized(`stats:services:${tenant.id}`, STATS_TTL_MS, () => computeServiceStats(tenant, now));
}
