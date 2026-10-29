import { z } from "zod";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, type ResolvedTenant } from "@/lib/tenant";
import { idSchema } from "@/lib/validation";
import type { PublicSchemeCoverageDto, SchemeWardCoverageDto } from "@/types/api";

/**
 * Beneficiary households per ward for a scheme on one website. Aggregates only — no beneficiary
 * records. `wardNo` values match the Home page "ward-details" section so the Schemes page can draw
 * a coverage map. Staff replace the whole ward list in one call (simplest for a per-ward table UI).
 */

const MODULE = "schemes" as const;

export const wardNoSchema = z.string().trim().min(1).max(20);

export const putCoverageSchema = z
  .object({
    wards: z.array(z.object({ wardNo: wardNoSchema, households: z.number().int().min(0).max(5_000_000) }).strict()).max(200),
  })
  .strict()
  .refine((v) => new Set(v.wards.map((w) => w.wardNo)).size === v.wards.length, { message: "Ward numbers must be unique", path: ["wards"] });
export type PutCoverageInput = z.infer<typeof putCoverageSchema>;

export const publicCoverageQuerySchema = z.object({ schemeId: idSchema.optional() });

/** The scheme must be visible to the website: its own, or shared and targeted at it or an ancestor. */
function visibleSchemeWhere(tenant: ResolvedTenant) {
  const ancestorIds = tenant.unitPath.split("/").filter(Boolean);
  return { deletedAt: null, OR: [{ tenantId: tenant.id }, { tenantId: null, targets: { some: { unitId: { in: ancestorIds } } } }] };
}

async function schemeForTenant(tenant: ResolvedTenant, schemeId: string, publishedOnly: boolean) {
  const scheme = await db.scheme.findFirst({
    where: { id: schemeId, ...visibleSchemeWhere(tenant), ...(publishedOnly ? { status: "PUBLISHED" } : {}) },
    select: { id: true },
  });
  if (!scheme) throw Errors.notFound("Scheme");
  return scheme;
}

async function loadCoverage(tenantId: string, schemeId: string): Promise<SchemeWardCoverageDto> {
  const rows = await db.schemeWardCoverage.findMany({ where: { tenantId, schemeId }, orderBy: { wardNo: "asc" } });
  return {
    schemeId,
    tenantId,
    wards: rows.map((r) => ({ wardNo: r.wardNo, households: r.households })),
    totalHouseholds: rows.reduce((n, r) => n + r.households, 0),
    updatedAt: rows.length ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function getSchemeCoverage(ctx: AuthContext, tenantId: string, schemeId: string): Promise<SchemeWardCoverageDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertInScope(ctx, tenant.unitPath, "Tenant");
  await schemeForTenant(tenant, schemeId, false);
  return loadCoverage(tenant.id, schemeId);
}

/** Replace the ward list for a scheme (`content:edit` + module `schemes`). An empty list clears it. */
export async function putSchemeCoverage(ctx: AuthContext, tenantId: string, schemeId: string, input: PutCoverageInput, client: ClientInfo): Promise<SchemeWardCoverageDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
  await schemeForTenant(tenant, schemeId, false);
  const before = await loadCoverage(tenant.id, schemeId);

  await db.$transaction(async (tx) => {
    await tx.schemeWardCoverage.deleteMany({ where: { tenantId: tenant.id, schemeId } });
    if (input.wards.length) {
      await tx.schemeWardCoverage.createMany({ data: input.wards.map((w) => ({ tenantId: tenant.id, schemeId, wardNo: w.wardNo, households: w.households })) });
    }
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "scheme.coverage_update", entityType: "Scheme", entityId: schemeId, tenantId: tenant.id, unitId: tenant.unitId, before: { wards: before.wards }, after: { wards: input.wards } },
      tx,
    );
  });
  return loadCoverage(tenant.id, schemeId);
}

export async function deleteSchemeCoverage(ctx: AuthContext, tenantId: string, schemeId: string, client: ClientInfo): Promise<void> {
  await putSchemeCoverage(ctx, tenantId, schemeId, { wards: [] }, client);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Per-ward household counts for one published scheme, or — without `schemeId` — the per-ward
 * maximum across all published schemes (households reached by at least one scheme).
 */
export async function getPublicSchemeCoverage(tenantSlug: string, schemeId: string | undefined): Promise<PublicSchemeCoverageDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  if (schemeId) {
    await schemeForTenant(tenant, schemeId, true);
    const c = await loadCoverage(tenant.id, schemeId);
    return { schemeId, wards: c.wards, totalHouseholds: c.totalHouseholds };
  }
  const rows = await db.schemeWardCoverage.findMany({
    where: { tenantId: tenant.id, scheme: { ...visibleSchemeWhere(tenant), status: "PUBLISHED" } },
    select: { wardNo: true, households: true },
  });
  const perWard = new Map<string, number>();
  for (const r of rows) perWard.set(r.wardNo, Math.max(perWard.get(r.wardNo) ?? 0, r.households));
  const wards = [...perWard].map(([wardNo, households]) => ({ wardNo, households })).sort((a, b) => a.wardNo.localeCompare(b.wardNo, undefined, { numeric: true }));
  return { schemeId: null, wards, totalHouseholds: wards.reduce((n, w) => n + w.households, 0) };
}
