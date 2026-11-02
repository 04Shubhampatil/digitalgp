import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { AdminUnitDto, UserDto } from "@/types/api";
import { Card, MetricCard, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";

const selectCls = "h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-wide text-muted uppercase";

/**
 * Figma "District & Taluka Management" overview: totals, a filter card and one row per district with its
 * talukas, Gram Panchayats, websites created and block admins. "Manage" opens the drill-down browser.
 */
export async function HierarchyOverview({
  locale,
  districts,
  talukas,
  gps,
  users,
  district,
  taluka,
  q,
}: {
  locale: UiLocale;
  districts: AdminUnitDto[];
  talukas: AdminUnitDto[];
  gps: AdminUnitDto[];
  users: UserDto[];
  district?: string;
  taluka?: string;
  q?: string;
}) {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const name = (u: AdminUnitDto) => pickText(pair(u.nameEn, u.nameMr), locale, u.slug);
  const within = (u: { path: string }, id: string) => u.path.includes(`/${id}/`);

  // Block admins are counted under the district that contains the unit they are assigned to.
  const allUnits = [...districts, ...talukas, ...gps];
  const unitById = new Map(allUnits.map((u) => [u.id, u]));
  const blockAdminsIn = (districtId: string) =>
    users.filter((u) => u.assignments.some((a) => !a.revokedAt && a.role === "BLOCK_ADMIN" && (a.unitId === districtId || (unitById.get(a.unitId) && within(unitById.get(a.unitId)!, districtId))))).length;

  const rows = districts.map((d) => {
    const ts = talukas.filter((x) => within(x, d.id));
    const g = gps.filter((x) => within(x, d.id));
    return { d, ts, gps: g.length, sites: g.filter((x) => x.tenantId).length, admins: blockAdminsIn(d.id) };
  });
  const needle = (q ?? "").trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!district || r.d.id === district) &&
      (!taluka || r.ts.some((x) => x.id === taluka)) &&
      (!needle || r.d.nameEn.toLowerCase().includes(needle) || r.d.nameMr.includes(needle) || r.ts.some((x) => x.nameEn.toLowerCase().includes(needle) || x.nameMr.includes(needle))),
  );
  const num = (n: number) => n.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN");
  const firstDistrict = districts[0];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("hierarchy.overviewTitle")}
        description={t("hierarchy.subtitle")}
        actions={
          firstDistrict ? (
            <Link href={`/admin/hierarchy?parentId=${district ?? firstDistrict.id}`} className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
              + {t("hierarchy.addTaluka")}
            </Link>
          ) : null
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("hierarchy.districts")} value={num(districts.length)} tone="info" />
        <MetricCard label={t("hierarchy.talukas")} value={num(talukas.length)} tone="success" />
        <MetricCard label={t("hierarchy.gramPanchayats")} value={num(gps.length)} tone="warning" />
        <MetricCard label={t("hierarchy.activeDistricts")} value={num(rows.filter((r) => r.sites > 0).length)} tone="violet" />
      </div>

      <form method="get" action="/admin/hierarchy" className="mb-5 rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-[17px] font-bold text-ink">{t("hierarchy.filterTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto]">
          <label>
            <span className={labelCls}>{t("topbar.district")}</span>
            <select name="district" defaultValue={district ?? ""} className={selectCls}>
              <option value="">{tc("all")}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {name(d)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{t("topbar.taluka")}</span>
            <select name="taluka" defaultValue={taluka ?? ""} className={selectCls}>
              <option value="">{t("hierarchy.allTalukas")}</option>
              {talukas
                .filter((x) => !district || within(x, district))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {name(x)}
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
        <h2 className="px-5 pt-5 pb-3 text-[19px] font-bold text-ink">{t("hierarchy.districtOverview")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">{t("topbar.district")}</th>
                <th className="px-3 py-2.5">{t("hierarchy.talukas")}</th>
                <th className="px-3 py-2.5">{t("hierarchy.gramPanchayats")}</th>
                <th className="px-3 py-2.5">{t("hierarchy.websitesCreated")}</th>
                <th className="px-3 py-2.5">{t("nav.blockAdmins")}</th>
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
                <tr key={r.d.id} className="hover:bg-surface-soft/60">
                  <td className="px-5 py-3.5 font-semibold text-ink">{name(r.d)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.ts.length)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.gps)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.sites)}</td>
                  <td className="px-3 py-3.5 text-muted">{num(r.admins)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/hierarchy?parentId=${r.d.id}`} className="font-medium text-primary hover:underline">
                      {t("websites.manage")}
                    </Link>
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
