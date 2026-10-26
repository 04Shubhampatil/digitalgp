import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { Errors } from "@/lib/errors";
import { assignmentsForUnit } from "@/lib/permissions";

/**
 * Tenant resolution and isolation helpers.
 *
 * Public requests: the tenant comes from the host (custom domain or `<slug>.<APP_BASE_HOST>`)
 * or, as a fallback, from the first path segment. The client never supplies a tenant id.
 *
 * Admin requests: the tenant id in the URL is only accepted after verifying that the
 * authenticated user holds an assignment whose scope contains the tenant's unit.
 * Out-of-scope tenants are reported as 404 so their existence is not revealed.
 */

export interface ResolvedTenant {
  id: string;
  slug: string;
  unitId: string;
  unitPath: string;
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED";
  nameEn: string;
  nameMr: string;
  defaultLocale: "EN" | "MR" | "HI";
}

const tenantSelect = {
  id: true,
  slug: true,
  unitId: true,
  status: true,
  nameEn: true,
  nameMr: true,
  defaultLocale: true,
  unit: { select: { path: true } },
} as const;

function toResolved(t: {
  id: string;
  slug: string;
  unitId: string;
  status: ResolvedTenant["status"];
  nameEn: string;
  nameMr: string;
  defaultLocale: ResolvedTenant["defaultLocale"];
  unit: { path: string };
}): ResolvedTenant {
  return {
    id: t.id,
    slug: t.slug,
    unitId: t.unitId,
    unitPath: t.unit.path,
    status: t.status,
    nameEn: t.nameEn,
    nameMr: t.nameMr,
    defaultLocale: t.defaultLocale,
  };
}

/** Extract a tenant slug or custom domain from a request host + path. */
export function extractTenantKey(hostHeader: string | null, pathname: string): { slug?: string; domain?: string } {
  const base = getEnv().APP_BASE_HOST.toLowerCase();
  const host = (hostHeader ?? "").toLowerCase().split(":")[0] ?? "";

  if (host && host !== base && host !== "localhost" && host !== "127.0.0.1") {
    if (host.endsWith(`.${base}`)) {
      const label = host.slice(0, -(base.length + 1));
      if (label && !label.includes(".") && label !== "www") return { slug: label };
    } else {
      return { domain: host };
    }
  }
  const first = pathname.split("/").filter(Boolean)[0];
  return first ? { slug: first.toLowerCase() } : {};
}

/** Resolve the tenant addressed by a public request. Only PUBLISHED tenants resolve. */
export async function resolvePublicTenant(hostHeader: string | null, pathname: string): Promise<ResolvedTenant | null> {
  const key = extractTenantKey(hostHeader, pathname);
  const where = key.domain ? { customDomain: key.domain } : key.slug ? { slug: key.slug } : null;
  if (!where) return null;
  const tenant = await db.tenant.findFirst({ where: { ...where, status: "PUBLISHED" }, select: tenantSelect });
  return tenant ? toResolved(tenant) : null;
}

/** Resolve a PUBLISHED tenant by slug (public API). */
export async function getPublicTenantBySlug(slug: string): Promise<ResolvedTenant> {
  const tenant = await db.tenant.findFirst({ where: { slug, status: "PUBLISHED" }, select: tenantSelect });
  if (!tenant) throw Errors.notFound("Website");
  return toResolved(tenant);
}

/**
 * Load a tenant for an admin operation and verify the caller's scope contains it.
 * Throws 404 when the tenant does not exist OR is outside the caller's scope.
 */
export async function getTenantForActor(ctx: AuthContext, tenantId: string): Promise<ResolvedTenant> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect });
  if (!tenant) throw Errors.notFound("Tenant");
  const resolved = toResolved(tenant);
  if (assignmentsForUnit(ctx, resolved.unitPath).length === 0) throw Errors.notFound("Tenant");
  return resolved;
}

/** Load a hierarchy unit and verify it is within the caller's scope (404 otherwise). */
export async function getUnitForActor(ctx: AuthContext, unitId: string) {
  const unit = await db.adminUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw Errors.notFound("Unit");
  if (assignmentsForUnit(ctx, unit.path).length === 0) throw Errors.notFound("Unit");
  return unit;
}
