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

  // Snapshots at the end of last month (= start of this month) and at the end of the month before.
  const snapshotAt = async (end: Date) => {
    const [receivedBy, resolvedBy, closedBy] = await Promise.all([
      db.grievance.count({ where: { tenantId: tenant.id, createdAt: { lt: end } } }),
      db.grievance.count({ where: { tenantId: tenant.id, createdAt: { lt: end }, status: "RESOLVED", resolvedAt: { lt: end } } }),
      db.grievance.count({ where: { tenantId: tenant.id, createdAt: { lt: end }, resolvedAt: { lt: end } } }),
    ]);
    return { pendingAtEnd: receivedBy - closedBy, resolutionRate: pct(resolvedBy, receivedBy) };
  };
  const [endLast, endBefore] = await Promise.all([snapshotAt(monthStart(now)), snapshotAt(monthStart(now, -1))]);
  const change = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null);

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
    lastMonth: { received: lastMonth.received, resolved: lastMonth.resolved, ...endLast },
    monthBefore: { received: monthBefore.received, resolved: monthBefore.resolved, ...endBefore },
    receivedChangePercent: change(lastMonth.received, monthBefore.received),
    resolvedChangePercent: change(lastMonth.resolved, monthBefore.resolved),
    pendingChangePercent: change(endLast.pendingAtEnd, endBefore.pendingAtEnd),
    resolutionRateChangePoints:
      endLast.resolutionRate !== null && endBefore.resolutionRate !== null ? Math.round((endLast.resolutionRate - endBefore.resolutionRate) * 10) / 10 : null,
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
    db.scheme.findMany({ where: visible, select: { beneficiaryCount: true, amountDisbursed: true, disbursedFinancialYear: true } }),
    db.schemeWardCoverage.findMany({ where: { tenantId: tenant.id, scheme: visible }, select: { wardNo: true, households: true } }),
    publishedSectionData(tenant.id, "about", "geography") as Promise<{ households?: number } | null>,
  ]);

  const withBeneficiaries = schemes.filter((s) => s.beneficiaryCount !== null);
  const withAmount = schemes.filter((s) => s.amountDisbursed !== null);
  const amountTotal = withAmount.reduce((sum, s) => sum + Number(s.amountDisbursed), 0);
  const fy = financialYear(now).label;
  const thisYear = withAmount.filter((s) => s.disbursedFinancialYear === fy);

  const perWard = new Map<string, number>();
  for (const r of coverageRows) perWard.set(r.wardNo, Math.max(perWard.get(r.wardNo) ?? 0, r.households));
  const householdsCovered = perWard.size ? [...perWard.values()].reduce((a, b) => a + b, 0) : null;
  const totalHouseholds = typeof geography?.households === "number" && geography.households > 0 ? geography.households : null;

  return {
    totalSchemes: schemes.length,
    totalBeneficiaries: withBeneficiaries.length ? withBeneficiaries.reduce((sum, s) => sum + (s.beneficiaryCount ?? 0), 0) : null,
    amountDisbursedTotal: withAmount.length ? amountTotal.toFixed(2) : null,
    amountDisbursedThisFinancialYear: thisYear.length ? thisYear.reduce((sum, s) => sum + Number(s.amountDisbursed), 0).toFixed(2) : null,
    householdsCovered,
    totalHouseholds,
    coveragePercent: householdsCovered !== null && totalHouseholds !== null ? Math.min(100, pct(householdsCovered, totalHouseholds) ?? 0) : null,
    financialYear: fy,
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

/** Ratings needed before the satisfaction rate is computed from feedback instead of the typed-in figure. */
export const MIN_RATINGS_FOR_SATISFACTION = 5;
const SATISFACTION_WINDOW_DAYS = 90;

type ServiceStatsSettings = { month?: string; certificatesIssued?: number; taxCollected?: number; satisfactionRate?: number };

async function computeServiceStats(tenant: ResolvedTenant, now: Date): Promise<PublicServiceStatsDto> {
  const start = monthStart(now);
  const end = monthStart(now, 1);
  const ratingSince = new Date(now.getTime() - SATISFACTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [received, resolved, ratings, tenantRow] = await Promise.all([
    db.grievance.count({ where: { tenantId: tenant.id, createdAt: { gte: start, lt: end } } }),
    db.grievance.count({ where: { tenantId: tenant.id, status: "RESOLVED", resolvedAt: { gte: start, lt: end } } }),
    db.formSubmission.findMany({ where: { tenantId: tenant.id, kind: "FEEDBACK", rating: { not: null }, createdAt: { gte: ratingSince } }, select: { rating: true } }),
    db.tenant.findUniqueOrThrow({ where: { id: tenant.id }, select: { settings: true } }),
  ]);
  const manual = ((tenantRow.settings ?? {}) as { serviceStats?: ServiceStatsSettings }).serviceStats;
  const current = manual?.month === monthKey(start) ? manual : undefined;

  // Satisfied = rating 4 or 5 out of 5.
  const fromRatings = ratings.length >= MIN_RATINGS_FOR_SATISFACTION ? pct(ratings.filter((r) => (r.rating ?? 0) >= 4).length, ratings.length) : null;
  const satisfaction = fromRatings ?? (typeof manual?.satisfactionRate === "number" ? manual.satisfactionRate : null);

  return {
    certificatesIssuedThisMonth: current?.certificatesIssued ?? null,
    grievancesResolvedThisMonth: resolved,
    grievancesReceivedThisMonth: received,
    taxCollectedThisMonth: typeof current?.taxCollected === "number" ? current.taxCollected.toFixed(2) : null,
    citizenSatisfactionRate: satisfaction,
    satisfactionSource: fromRatings !== null ? "FEEDBACK_RATINGS" : satisfaction !== null ? "MANUAL" : null,
    ratingsCount: ratings.length,
    month: monthKey(start),
    generatedAt: now.toISOString(),
  };
}

export async function getPublicServiceStats(tenantSlug: string, now: Date = new Date()): Promise<PublicServiceStatsDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  return memoized(`stats:services:${tenant.id}`, STATS_TTL_MS, () => computeServiceStats(tenant, now));
}
