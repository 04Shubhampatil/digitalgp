import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AdminUnitDto } from "@/types/api";
import { ROLE_MATRIX, type Capability } from "@/config/role-matrix";
import { UserManagement } from "@/components/admin/users/UserManagement";
import { UserStatusButton } from "@/components/admin/users/UserStatusButton";
import { PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { audit, hierarchy, tenants, users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDate, initials } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Admin profile" };

const SUMMARY_CAPS: Capability[] = ["content:edit", "content:publish", "grievance:manage", "user:manage"];

/**
 * Figma "Block Admin Profile": profile card, assigned access, recent activity. The assignment manager stays below
 * (it is the "Assign access" step). GET /users/:id, /hierarchy/units/:id, /audit-logs?actorId=.
 */
export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [{ userId }, t, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;

  let user;
  try {
    user = await users.get(userId, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const isSelf = user.id === me.user.id;
  const canManage = hasCapability(me, "user:manage");

  const active = user.assignments.filter((a) => !a.revokedAt);
  const first = active[0];
  const name = (u: { nameEn: string; nameMr: string; slug?: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.slug ?? "");
  let district: AdminUnitDto | undefined;
  let taluka: AdminUnitDto | undefined;
  let unit: AdminUnitDto | undefined;
  if (first) {
    try {
      const res = await hierarchy.get(first.unitId, { cookie });
      unit = res.unit;
      for (const u of [...res.ancestors, res.unit]) {
        if (u.level === "DISTRICT") district = u;
        if (u.level === "TALUKA") taluka = u;
      }
    } catch {
      /* area stays empty */
    }
  }
  const [recent, sites, gps] = await Promise.all([
    audit.list({ actorId: user.id, limit: 5 }, { cookie }).catch(() => null),
    tenants.list({ limit: 100 }, { cookie }).catch(() => null),
    unit ? hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }).catch(() => null) : Promise.resolve(null),
  ]);
  const underUnit = (gps?.data ?? []).filter((g) => unit && g.path.includes(`/${unit.id}/`));
  const siteById = new Map((sites?.data ?? []).map((s) => [s.id, s]));
  const assigned = underUnit.filter((g) => g.tenantId).length;
  const published = underUnit.filter((g) => g.tenantId && siteById.get(g.tenantId)?.status === "PUBLISHED").length;
  const role = first?.role;
  const perms = role ? SUMMARY_CAPS.filter((c) => ROLE_MATRIX[role].has(c)).map((c) => t(`rolesUi.cap.${c.replace(":", "_")}`)) : [];
  const humanise = (a: string) => {
    const s = a.replace(/[._-]+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const loc = ui === "mr" ? "mr-IN" : "en-IN";
  const when = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })}, ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("users.profileTitle")}
        description={t("users.profileSubtitle")}
        actions={
          <Link href="/admin/users" className="inline-flex h-10 items-center rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
            {t("users.backToList")}
          </Link>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-[19px] font-bold text-ink">{user.name}</h2>
          <p className="text-xs text-muted">{role ? t(`role.${role}`) : "—"}</p>
          <div className="mt-4 flex items-start gap-4">
            <span className="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-[#e8cfae] text-xl font-bold text-primary">{initials(user.name)}</span>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-ink">{user.email}</p>
              {user.phone && <p className="mt-1 text-muted">{user.phone}</p>}
              <span className={user.status === "ACTIVE" ? "mt-2 inline-flex rounded-pill bg-success-soft px-3 py-1 text-[11px] font-semibold text-success" : "mt-2 inline-flex rounded-pill bg-danger-soft px-3 py-1 text-[11px] font-semibold text-danger"}>
                {t(`users.userStatus.${user.status}`).toUpperCase()}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            {tc("created")} {formatDate(user.createdAt, ui)}
            {user.mustResetPassword ? ` · ${t("users.mustReset")}` : ""}
          </p>
          {canManage && (
            <div className="mt-4">
              <UserStatusButton userId={user.id} status={user.status} disabled={isSelf} />
            </div>
          )}
        </section>

        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-3 text-[19px] font-bold text-ink">{t("users.assignedAccess")}</h2>
          <dl className="grid grid-cols-[130px_1fr] gap-y-4 text-sm">
            <dt className="text-muted">{t("topbar.district")}</dt>
            <dd className="font-semibold text-ink">{district ? name(district) : "—"}</dd>
            <dt className="text-muted">{t("users.talukaBlock")}</dt>
            <dd className="font-semibold text-ink">{taluka ? name(taluka) : unit && unit.level !== "DISTRICT" ? name(unit) : "—"}</dd>
            <dt className="text-muted">{t("users.gpWebsites")}</dt>
            <dd className="font-semibold text-ink">{t("users.assignedPublished", { assigned, published })}</dd>
            <dt className="text-muted">{t("users.permissions")}</dt>
            <dd className="text-ink">{perms.length ? perms.join(", ") : "—"}</dd>
          </dl>
          {canManage && (
            <p className="mt-4 text-right">
              <Link href={role === "BLOCK_ADMIN" || role === "TALUKA_ADMIN" ? `/admin/users/${user.id}/access` : "#access"} className="inline-flex h-10 items-center rounded-button border border-line-strong px-5 text-sm font-semibold text-primary hover:bg-surface-soft">
                {t("users.editAccess")}
              </Link>
            </p>
          )}
        </section>
      </div>

      <section className="mb-5 rounded-card border border-line bg-surface">
        <h2 className="px-5 pt-5 pb-3 text-[19px] font-bold text-ink">{t("users.recentActivity")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">{t("users.recentActivity")}</th>
                <th className="px-3 py-2.5">{t("auditUi.target")}</th>
                <th className="px-5 py-2.5">{t("auditUi.time")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(recent?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
              {(recent?.data ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3.5 font-semibold text-ink">{humanise(l.action)}</td>
                  <td className="px-3 py-3.5 text-muted">{l.entityType}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-muted">{when(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div id="access">
        <UserManagement user={user} scope={me.assignments} canManage={canManage} />
      </div>
    </div>
  );
}
