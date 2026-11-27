import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { AdminUnitDto, UserDto } from "@/types/api";
import { AddUnitDialog } from "@/components/admin/hierarchy/AddUnitDialog";
import { DeleteUnitButton } from "@/components/admin/hierarchy/DeleteUnitButton";
import { EditUnitDialog } from "@/components/admin/hierarchy/EditUnitDialog";
import { Card, MetricCard, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";

const selectCls = "h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-wide text-muted uppercase";

/**
 * Landing view of "Talukas & Gram Panchayats" for the Super Admin. The platform is for Pune district only, so there is no
 * district list: it shows the talukas of that district with their Gram Panchayats, websites and Taluka Admins.
 * Opening a taluka lists its Gram Panchayats (the drill-down browser, ?parentId=<taluka>).
 */
export async function HierarchyOverview({
  locale,
  districts,
  talukas,
  gps,
  users,
  taluka,
  q,
}: {
  locale: UiLocale;
  districts: AdminUnitDto[];
  talukas: AdminUnitDto[];
  gps: AdminUnitDto[];
  users: UserDto[];
  taluka?: string;
  q?: string;
}) {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const name = (u: AdminUnitDto) => pickText(pair(u.nameEn, u.nameMr), locale, u.slug);
  const within = (u: { path: string }, id: string) => u.path.includes(`/${id}/`);
  const district = districts[0];

  // Taluka Admins are counted under the taluka that contains the unit they are assigned to (older Block Admin accounts too).
  const unitById = new Map([...talukas, ...gps].map((u) => [u.id, u]));
  const adminsIn = (talukaId: string) =>
    users.filter((u) =>
      u.assignments.some((a) => {
        if (a.revokedAt || (a.role !== "TALUKA_ADMIN" && a.role !== "BLOCK_ADMIN")) return false;
        const unit = unitById.get(a.unitId);
        return a.unitId === talukaId || (!!unit && within(unit, talukaId));
      }),
    ).length;

  const rows = talukas
    .filter((x) => !district || within(x, district.id))
    .map((x) => {
      const g = gps.filter((y) => within(y, x.id));
      return { x, gps: g.length, sites: g.filter((y) => y.tenantId).length, admins: adminsIn(x.id) };
    });
  const needle = (q ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => (!taluka || r.x.id === taluka) && (!needle || r.x.nameEn.toLowerCase().includes(needle) || r.x.nameMr.includes(needle)));
  const num = (n: number) => n.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN");
  const totals = { gps: rows.reduce((n, r) => n + r.gps, 0), sites: rows.reduce((n, r) => n + r.sites, 0), admins: rows.reduce((n, r) => n + r.admins, 0) };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={district ? t("hierarchy.talukasOf", { district: name(district) }) : t("hierarchy.talukas")}
        description={t("hierarchy.talukasHint")}
        actions={district ? <AddUnitDialog parent={district} only="TALUKA" /> : null}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("hierarchy.talukas")} value={num(rows.length)} tone="info" />
        <MetricCard label={t("hierarchy.gramPanchayats")} value={num(totals.gps)} tone="success" />
        <MetricCard label={t("hierarchy.websitesCreated")} value={num(totals.sites)} tone="warning" />
        <MetricCard label={t("nav.blockAdmins")} value={num(totals.admins)} tone="violet" />
      </div>

      <form method="get" action="/admin/hierarchy" className="mb-5 rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-[17px] font-bold text-ink">{t("hierarchy.filterTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_auto]">
          <label>
            <span className={labelCls}>{t("topbar.taluka")}</span>
            <select name="taluka" defaultValue={taluka ?? ""} className={selectCls}>
              <option value="">{t("hierarchy.allTalukas")}</option>
              {rows.map((r) => (
                <option key={r.x.id} value={r.x.id}>
                  {name(r.x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{t("hierarchy.search")}</span>
            <input type="search" name="q" defaultValue={q ?? ""} placeholder={t("hierarchy.searchPlaceholder")} className={selectCls} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-11 rounded-button bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
              {t("hierarchy.applyFilters")}
            </button>
          </div>
        </div>
      </form>

      <Card>
        <h2 className="px-5 pt-5 pb-3 text-[19px] font-bold text-ink">{t("hierarchy.talukaOverview")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">{t("topbar.taluka")}</th>
                <th className="px-3 py-2.5">{t("hierarchy.gramPanchayats")}</th>
                <th className="px-3 py-2.5">{t("hierarchy.websitesCreated")}</th>
                <th className="px-3 py-2.5">{t("nav.blockAdmins")}</th>
                <th className="px-5 py-2.5">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
              {shown.map((r) => (
                <tr key={r.x.id} className="hover:bg-surface-soft/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/hierarchy?parentId=${r.x.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                      {name(r.x)}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-muted">{num(r.gps)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.sites)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.admins)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/hierarchy?parentId=${r.x.id}`} className="font-medium text-primary hover:underline">
                        {t("hierarchy.viewGps")}
                      </Link>
                      <EditUnitDialog unit={r.x} compact />
                      <DeleteUnitButton unit={r.x} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
