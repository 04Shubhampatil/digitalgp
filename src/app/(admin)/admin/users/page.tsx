import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminUnitDto, Role, UserDto } from "@/types/api";
import { Card, MetricCard, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { hierarchy, users } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Block Admins" };

const ROLES: Role[] = ["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"];
type Search = Promise<{ role?: string; district?: string; taluka?: string; q?: string }>;

const selectCls = "h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-wide text-muted uppercase";

/**
 * Figma "Block Admin Management": totals, search and filter card, and an overview table with assigned area,
 * Gram Panchayat access, status and last login (GET /users). Shows block admins; `?role=all` or another role shows the rest.
 */
export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [sp, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const roleFilter: Role | "ALL" = sp.role === "all" ? "ALL" : ROLES.includes(sp.role as Role) ? (sp.role as Role) : "BLOCK_ADMIN";

  const [list, districts, talukas, gps] = await Promise.all([
    users.list({ role: roleFilter === "ALL" ? undefined : roleFilter, limit: 100 }, { cookie }),
    hierarchy.list({ level: "DISTRICT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: "TALUKA", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
  ]);
  const unitById = new Map<string, AdminUnitDto>([...districts.data, ...talukas.data, ...gps.data].map((u) => [u.id, u]));
  const name = (u: { nameEn: string; nameMr: string; slug?: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.slug ?? "");

  const rows = list.data.map((u: UserDto) => {
    const active = u.assignments.filter((a) => !a.revokedAt);
    const unit = active.map((a) => unitById.get(a.unitId)).find(Boolean);
    const ids = unit ? unit.path.split("/").filter(Boolean) : [];
    const district = ids.map((i) => unitById.get(i)).find((x) => x?.level === "DISTRICT") ?? (unit?.level === "DISTRICT" ? unit : undefined);
    const taluka = ids.map((i) => unitById.get(i)).find((x) => x?.level === "TALUKA");
    const area = [district, taluka].filter(Boolean).map((x) => name(x!)).join(" / ") || (active[0] ? pickText(pair(active[0].unitNameEn, active[0].unitNameMr), ui, "—") : "—");
    const websites = unit ? gps.data.filter((g) => g.path.includes(`/${unit.id}/`) && g.tenantId).length : 0;
    const never = !u.lastLoginAt;
    return { u, area, district, taluka, websites, state: u.status === "SUSPENDED" ? "SUSPENDED" : never ? "PENDING" : "ACTIVE" };
  });

  const needle = (sp.q ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => (!sp.district || r.district?.id === sp.district) && (!sp.taluka || r.taluka?.id === sp.taluka) && (!needle || r.u.name.toLowerCase().includes(needle) || r.u.email.toLowerCase().includes(needle)));
  const count = (s: string) => rows.filter((r) => r.state === s).length;

  const fmtLogin = (iso: string | null) => {
    if (!iso) return t("users.never");
    const d = new Date(iso);
    const now = new Date();
    const day = (x: Date) => x.toDateString();
    const time = d.toLocaleTimeString(ui === "mr" ? "mr-IN" : "en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (day(d) === day(now)) return `${t("users.today")}, ${time}`;
    if (day(d) === day(new Date(now.getTime() - 86400000))) return t("users.yesterday");
    return d.toLocaleDateString(ui === "mr" ? "mr-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("users.pageTitle")}
        description={t("users.pageSubtitle")}
        actions={
          hasCapability(user, "user:manage") ? (
            <Link href="/admin/users/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
              + {t("users.createBlockAdmin")}
            </Link>
          ) : null
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("users.totalAdmins")} value={rows.length.toLocaleString()} tone="info" />
        <MetricCard label={t("users.userStatus.ACTIVE")} value={count("ACTIVE").toLocaleString()} tone="success" />
        <MetricCard label={t("users.pendingInvite")} value={count("PENDING").toLocaleString()} tone="warning" />
        <MetricCard label={t("users.userStatus.SUSPENDED")} value={count("SUSPENDED").toLocaleString()} tone="danger" />
      </div>

      <form method="get" action="/admin/users" className="mb-5 rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-[17px] font-bold text-ink">{t("users.searchFilter")}</h2>
        {sp.role && <input type="hidden" name="role" value={sp.role} />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto]">
          <label>
            <span className={labelCls}>{t("topbar.district")}</span>
            <select name="district" defaultValue={sp.district ?? ""} className={selectCls}>
              <option value="">{tc("all")}</option>
              {districts.data.map((d) => (
                <option key={d.id} value={d.id}>
                  {name(d)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{t("topbar.taluka")}</span>
            <select name="taluka" defaultValue={sp.taluka ?? ""} className={selectCls}>
              <option value="">{t("hierarchy.allTalukas")}</option>
              {talukas.data
                .filter((x) => !sp.district || x.path.includes(`/${sp.district}/`))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {name(x)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{t("users.searchAdmin")}</span>
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder={t("users.searchPlaceholder")} className={selectCls} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-11 rounded-button bg-primary px-8 text-sm font-semibold text-white hover:bg-primary-hover">
              {t("users.search")}
            </button>
          </div>
        </div>
      </form>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-[19px] font-bold text-ink">{t("users.overviewTitle")}</h2>
          <p className="text-xs text-muted">
            {roleFilter === "ALL" ? (
              <Link href="/admin/users" className="font-semibold text-primary hover:underline">
                {t("users.showBlockAdmins")}
              </Link>
            ) : (
              <Link href="/admin/users?role=all" className="font-semibold text-primary hover:underline">
                {t("users.showAllRoles")}
              </Link>
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">{roleFilter === "BLOCK_ADMIN" ? t("nav.blockAdmins") : t("users.admin")}</th>
                <th className="px-3 py-2.5">{t("users.assignedArea")}</th>
                <th className="px-3 py-2.5">{t("users.gpAccess")}</th>
                <th className="px-3 py-2.5">{tc("status")}</th>
                <th className="px-3 py-2.5">{t("users.lastLogin")}</th>
                <th className="px-5 py-2.5">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
              {shown.map((r) => (
                <tr key={r.u.id} className="hover:bg-surface-soft/60">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink">{r.u.name}</p>
                    {roleFilter === "ALL" && <p className="text-xs text-muted">{r.u.assignments.filter((a) => !a.revokedAt).map((a) => t(`role.${a.role}`)).join(", ")}</p>}
                  </td>
                  <td className="px-3 py-3.5 text-muted">{r.area}</td>
                  <td className="px-3 py-3.5 text-muted">{t("users.websitesCount", { n: r.websites })}</td>
                  <td className="px-3 py-3.5 text-muted">{r.state === "ACTIVE" ? t("users.userStatus.ACTIVE") : r.state === "PENDING" ? t("users.pendingInvite") : t("users.userStatus.SUSPENDED")}</td>
                  <td className="px-3 py-3.5 text-muted">{fmtLogin(r.u.lastLoginAt)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/users/${r.u.id}`} className="font-medium text-primary hover:underline">
                      {t("users.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.page.nextCursor && <p className="px-5 py-3 text-xs text-muted">{t("users.firstHundred")}</p>}
      </Card>
    </div>
  );
}
