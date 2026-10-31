import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminUnitDto, TenantDto, TenantStatus } from "@/types/api";
import { CreateWebsiteDialog } from "@/components/admin/websites/CreateWebsiteDialog";
import { Card, MetricCard, PageHeader } from "@/components/ui/Card";
import { StatusPill, type PillStatus } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { hierarchy, tenants } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "GP Websites" };

type Search = Promise<{ district?: string; taluka?: string; status?: string; q?: string; page?: string }>;
type RowStatus = TenantStatus | "NOT_CREATED";
const PAGE_SIZE = 8;

const selectCls = "h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-wide text-muted uppercase";

/**
 * Figma "GP Website Management": totals, filter card and a table of every Gram Panchayat with its website status.
 * Gram Panchayats without a website are listed too, with a "Create Website" action. Loads up to 100 per level.
 */
export default async function WebsitesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [sp, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const name = (u: { nameEn: string; nameMr: string; slug?: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.slug ?? "");

  const [gps, districts, talukas, sites] = await Promise.all([
    hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }, { cookie }),
    hierarchy.list({ level: "DISTRICT", limit: 100 }, { cookie }),
    hierarchy.list({ level: "TALUKA", limit: 100 }, { cookie }),
    tenants.list({ limit: 100 }, { cookie }),
  ]);
  const byId = new Map<string, AdminUnitDto>([...districts.data, ...talukas.data].map((u) => [u.id, u]));
  const siteById = new Map<string, TenantDto>(sites.data.map((s) => [s.id, s]));

  const rows = gps.data.map((unit) => {
    const ids = unit.path.split("/").filter(Boolean);
    const district = ids.map((i) => byId.get(i)).find((u) => u?.level === "DISTRICT");
    const taluka = ids.map((i) => byId.get(i)).find((u) => u?.level === "TALUKA");
    const site = unit.tenantId ? siteById.get(unit.tenantId) : undefined;
    const status: RowStatus = site ? site.status : "NOT_CREATED";
    return { unit, site, status, district, taluka };
  });

  const count = (s: RowStatus) => rows.filter((r) => r.status === s).length;
  const needle = (sp.q ?? "").trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!sp.district || r.district?.id === sp.district) &&
      (!sp.taluka || r.taluka?.id === sp.taluka) &&
      (!sp.status || r.status === sp.status) &&
      (!needle || r.unit.nameEn.toLowerCase().includes(needle) || r.unit.nameMr.includes(needle)),
  );
  const pageNo = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const view = shown.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ district: sp.district, taluka: sp.taluka, status: sp.status, q: sp.q, ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/websites?${s}` : "/admin/websites";
  };
  const canCreate = hasCapability(user, "tenant:create");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("websites.title")} description={t("websites.subtitleLong")} actions={canCreate ? <CreateWebsiteDialog assignments={user.assignments} /> : null} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("websites.allGps")} value={rows.length.toLocaleString()} tone="info" />
        <MetricCard label={t("tenantStatus.PUBLISHED")} value={count("PUBLISHED").toLocaleString()} tone="success" />
        <MetricCard label={t("tenantStatus.DRAFT")} value={count("DRAFT").toLocaleString()} tone="warning" />
        <MetricCard label={t("tenantStatus.NOT_CREATED")} value={count("NOT_CREATED").toLocaleString()} tone="danger" />
      </div>

      <form method="get" action="/admin/websites" className="mb-5 grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
        <label>
          <span className={labelCls}>{t("topbar.district")}</span>
          <select name="district" defaultValue={sp.district ?? ""} className={selectCls}>
            <option value="">{tc("all")}</option>
            {districts.data.map((u) => (
              <option key={u.id} value={u.id}>
                {name(u)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{t("websites.talukaBlock")}</span>
          <select name="taluka" defaultValue={sp.taluka ?? ""} className={selectCls}>
            <option value="">{tc("all")}</option>
            {talukas.data
              .filter((u) => !sp.district || u.path.includes(`/${sp.district}/`))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {name(u)}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{t("websites.statusFilter")}</span>
          <select name="status" defaultValue={sp.status ?? ""} className={selectCls}>
            <option value="">{t("websites.allStatuses")}</option>
            {(["PUBLISHED", "DRAFT", "SUSPENDED", "NOT_CREATED"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`tenantStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>{t("websites.searchGp")}</span>
          <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder={t("websites.searchPlaceholder")} className={selectCls} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="h-11 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
            {tc("apply")}
          </button>
        </div>
      </form>

      <Card>
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[19px] font-bold text-ink">{t("websites.listTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted">{t("websites.showing", { shown: view.length, total: shown.length.toLocaleString() })}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">#</th>
                <th className="px-3 py-2.5">{t("websites.gp")}</th>
                <th className="px-3 py-2.5">{t("websites.districtTaluka")}</th>
                <th className="px-3 py-2.5">{t("websites.website")}</th>
                <th className="px-3 py-2.5">{t("websites.lastUpdated")}</th>
                <th className="px-5 py-2.5 text-right">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
              {view.map((r, i) => (
                <tr key={r.unit.id} className="hover:bg-surface-soft/60">
                  <td className="px-5 py-3.5 text-muted">{String((pageNo - 1) * PAGE_SIZE + i + 1).padStart(2, "0")}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-[6px] bg-success-soft text-xs font-bold text-primary">{r.unit.nameEn.charAt(0).toUpperCase()}</span>
                      <span className="font-semibold text-ink">{name(r.unit)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-muted">{[r.district, r.taluka].filter(Boolean).map((u) => name(u!)).join(" / ") || "—"}</td>
                  <td className="px-3 py-3.5">
                    <StatusPill status={r.status as PillStatus} label={t(`tenantStatus.${r.status}`)} />
                  </td>
                  <td className="px-3 py-3.5 text-muted">{r.site ? formatDate(r.site.updatedAt, ui) : "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    {r.site ? (
                      <Link href={`/admin/websites/${r.site.id}`} className="inline-flex rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft">
                        {r.status === "DRAFT" ? t("websites.continueSetup") : t("websites.manage")}
                      </Link>
                    ) : canCreate ? (
                      <CreateWebsiteDialog assignments={user.assignments} unit={r.unit} compact />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs text-muted">
            {shown.length === 0 ? "0" : `${(pageNo - 1) * PAGE_SIZE + 1}–${(pageNo - 1) * PAGE_SIZE + view.length}`} {t("websites.of")} {shown.length.toLocaleString()}
          </p>
          <nav aria-label="Pagination" className="flex items-center gap-1.5">
            {pageNo > 1 && (
              <Link href={qs({ page: String(pageNo - 1) })} aria-label={tc("firstPage")} className="flex size-8 items-center justify-center rounded-[6px] border border-line text-sm text-muted hover:bg-surface-soft">
                ‹
              </Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - pageNo) <= 1)
              .map((n) => (
                <Link key={n} href={qs({ page: String(n) })} aria-current={n === pageNo ? "page" : undefined} className={`flex size-8 items-center justify-center rounded-[6px] border text-xs font-semibold ${n === pageNo ? "border-primary bg-primary text-white" : "border-line text-ink hover:bg-surface-soft"}`}>
                  {n}
                </Link>
              ))}
            {pageNo < pages && (
              <Link href={qs({ page: String(pageNo + 1) })} aria-label={tc("nextPage")} className="flex size-8 items-center justify-center rounded-[6px] border border-line text-sm text-muted hover:bg-surface-soft">
                ›
              </Link>
            )}
          </nav>
        </div>
      </Card>
    </div>
  );
}
