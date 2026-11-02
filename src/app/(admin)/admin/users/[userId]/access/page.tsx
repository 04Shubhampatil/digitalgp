import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AdminUnitDto } from "@/types/api";
import { AssignAccess, type AccessUnit } from "@/components/admin/users/AssignAccess";
import { PageHeader } from "@/components/ui/Card";
import { hierarchy, tenants, users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Assign access" };

const toUnit = (u: AdminUnitDto): AccessUnit => ({ id: u.id, nameEn: u.nameEn, nameMr: u.nameMr, path: u.path });

/**
 * Figma "Assign Access": area (district, taluka / block) and the Gram Panchayat websites it covers for a block or
 * taluka admin. GET /users/:id, /hierarchy/units, /tenants; POST/DELETE /users/:id/assignments on save.
 */
export default async function AssignAccessPage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [{ userId }, t, cookie] = await Promise.all([params, getTranslations("admin"), cookieHeader()]);
  if (!hasCapability(me, "user:manage")) redirect(`/admin/users/${userId}`);

  let user;
  try {
    user = await users.get(userId, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const active = user.assignments.filter((a) => !a.revokedAt);
  const own = active.find((a) => a.role === "BLOCK_ADMIN") ?? active.find((a) => a.role === "TALUKA_ADMIN");
  // Only block and taluka admins get this screen; other roles use the assignment manager on the profile.
  if (!own && active.length > 0) redirect(`/admin/users/${userId}#access`);
  const role = own?.role === "TALUKA_ADMIN" ? "TALUKA_ADMIN" : "BLOCK_ADMIN";
  const areaLevel = role === "TALUKA_ADMIN" ? "TALUKA" : "BLOCK";

  const [districts, areas, gps, sites] = await Promise.all([
    hierarchy.list({ level: "DISTRICT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: areaLevel, limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    tenants.list({ limit: 100 }, { cookie }).catch(() => null),
  ]);
  // A taluka or block admin cannot list the districts above their own area; read them from the area's ancestors.
  const anchor = own?.unitId ?? me.assignments.find((a) => !a.revokedAt)?.unitId;
  const ancestors = anchor ? await hierarchy.get(anchor, { cookie }).then((r) => r.ancestors).catch(() => [] as AdminUnitDto[]) : [];
  const districtList = [...districts.data, ...ancestors.filter((u) => u.level === "DISTRICT")].filter((u, i, all) => all.findIndex((x) => x.id === u.id) === i);
  const statusById = new Map((sites?.data ?? []).map((s) => [s.id, s.status]));
  const websites = gps.data.flatMap((g) => {
    const status = g.tenantId ? statusById.get(g.tenantId) : undefined;
    return status ? [{ ...toUnit(g), status }] : [];
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("users.assignAccessTitle", { name: user.name })}
        description={t("users.assignAccessSubtitle")}
        actions={
          <Link href={`/admin/users/${userId}`} className="inline-flex h-11 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
            {t("users.editProfile")}
          </Link>
        }
      />
      <AssignAccess
        userId={userId}
        role={role}
        districts={districtList.map(toUnit)}
        areas={areas.data.map(toUnit)}
        websites={websites}
        current={own ? { assignmentId: own.id, unitId: own.unitId } : null}
      />
    </div>
  );
}
