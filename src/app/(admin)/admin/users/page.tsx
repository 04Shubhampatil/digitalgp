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
import { USER_TYPES, canCreateRole } from "@/lib/roles";
import { getCurrentUser, hasCapability } from "@/lib/session";

/** The list shows block admins by default; with another role tab (or "All") the title says so. */
export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { role } = await searchParams;
  return { title: role === "TALUKA_ADMIN" ? "Taluka Admins" : "Users" };
}

// Block Admin was merged into Taluka Admin, so there is no separate tab for it.
const ROLES: Role[] = ["SUPER_ADMIN", "TALUKA_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"];
type Search = Promise<{ role?: string; district?: string; taluka?: string; q?: string; status?: string }>;

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
  const roleFilter: Role | "ALL" = sp.role === "all" ? "ALL" : ROLES.includes(sp.role as Role) ? (sp.role as Role) : "ALL";

  const [list, legacyBlock, districts, talukas, gps] = await Promise.all([
    users.list({ role: roleFilter === "ALL" ? undefined : roleFilter, limit: 100 }, { cookie }),
    // Accounts created before the merge still hold the Block Admin role; they are listed as Taluka Admins.
    roleFilter === "TALUKA_ADMIN" ? users.list({ role: "BLOCK_ADMIN", limit: 100 }, { cookie }).catch(() => ({ data: [] as UserDto[] })) : Promise.resolve({ data: [] as UserDto[] }),
    hierarchy.list({ level: "DISTRICT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: "TALUKA", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
    hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }).catch(() => ({ data: [] as AdminUnitDto[] })),
  ]);
  const unitById = new Map<string, AdminUnitDto>([...districts.data, ...talukas.data, ...gps.data].map((u) => [u.id, u]));
  const name = (u: { nameEn: string; nameMr: string; slug?: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.slug ?? "");

  const seen = new Set(list.data.map((u) => u.id));
  const everyone = [...list.data, ...legacyBlock.data.filter((u) => !seen.has(u.id))];
  const rows = everyone.map((u: UserDto) => {
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

  const callerRoles = user.assignments.filter((a) => !a.revokedAt).map((a) => a.role);
  const canManage = hasCapability(user, "user:manage");
  const createTypes = canManage ? (Object.entries(USER_TYPES) as [keyof typeof USER_TYPES, Role][]).filter(([, r]) => canCreateRole(callerRoles, r)) : [];
  // A role tab keeps the district / taluka / search filters that are set.
  const roleTab = (r: Role | "ALL") => {
    const p = new URLSearchParams({ role: r === "ALL" ? "all" : r });
    for (const k of ["district", "taluka", "q", "status"] as const) if (sp[k]) p.set(k, sp[k]!);
    return p.toString();
  };
  // The status chips keep the role tab and the other filters.
  const statusTab = (s: string) => {
    const p = new URLSearchParams({ role: roleFilter === "ALL" ? "all" : roleFilter });
    for (const k of ["district", "taluka", "q"] as const) if (sp[k]) p.set(k, sp[k]!);
    if (s) p.set("status", s);
    return p.toString();
  };
  const statusFilter = ["ACTIVE", "PENDING", "SUSPENDED"].includes(sp.status ?? "") ? sp.status : "";
  const blockView = roleFilter === "TALUKA_ADMIN";

  const needle = (sp.q ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => (!statusFilter || r.state === statusFilter) && (!sp.district || r.district?.id === sp.district) && (!sp.taluka || r.taluka?.id === sp.taluka) && (!needle || r.u.name.toLowerCase().includes(needle) || r.u.email.toLowerCase().includes(needle)));
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
        title={blockView ? t("users.pageTitle") : t("usersUi.listTitle")}
        description={t("users.pageSubtitle")}
        actions={
          createTypes.length > 0 ? (
            <Link href="/admin/users/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
              + {t("usersUi.createUser")}
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
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
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

      <nav aria-label={t("users.roleFilter")} className="mb-4 flex flex-wrap gap-2">
        {(["ALL", ...ROLES] as const).map((r) => (
          <Link
            key={r}
            href={`/admin/users?${roleTab(r)}`}
            aria-current={roleFilter === r ? "page" : undefined}
            className={
              roleFilter === r
                ? "inline-flex h-9 items-center rounded-pill bg-primary px-4 text-xs font-semibold text-white"
                : "inline-flex h-9 items-center rounded-pill border border-line-strong bg-surface px-4 text-xs font-semibold text-ink hover:bg-surface-soft"
            }
          >
            {r === "ALL" ? tc("all") : t(`role.${r}`)}
          </Link>
        ))}
      </nav>

      <nav aria-label={t("usersUi.statusFilter")} className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["", tc("all")],
            ["ACTIVE", t("users.userStatus.ACTIVE")],
            ["PENDING", t("users.pendingInvite")],
            ["SUSPENDED", t("users.userStatus.SUSPENDED")],
          ] as const
        ).map(([s, label]) => (
          <Link
            key={s || "all"}
            href={`/admin/users?${statusTab(s)}`}
            aria-current={statusFilter === s ? "page" : undefined}
            className={
              statusFilter === s
                ? "inline-flex h-9 items-center rounded-pill bg-primary px-4 text-xs font-semibold text-white"
                : "inline-flex h-9 items-center rounded-pill border border-line-strong bg-surface px-4 text-xs font-semibold text-ink hover:bg-surface-soft"
            }
          >
            {label}
            {s ? ` (${count(s)})` : ` (${rows.length})`}
          </Link>
        ))}
      </nav>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-[19px] font-bold text-ink">{blockView ? t("users.overviewTitle") : roleFilter === "ALL" ? t("usersUi.listOverview") : t(`role.${roleFilter}`)}</h2>
          <p className="text-xs text-muted">
            {roleFilter === "ALL" ? null : (
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
                <th className="px-5 py-2.5">{roleFilter === "TALUKA_ADMIN" ? t("nav.blockAdmins") : t("users.admin")}</th>
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
