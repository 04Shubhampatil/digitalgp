import type { Metadata } from "next";
import { CircleCheck, ExternalLink } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { PageDto } from "@/types/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { TenantSettingsForm } from "@/components/admin/websites/TenantSettingsForm";
import { TenantStatusActions } from "@/components/admin/websites/TenantStatusActions";
import { Card, CardHeader, MetricCard, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { content, tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Website" };

/**
 * GP CMS dashboard (Figma "Savardari Gram Panchayat CMS"): website details, status actions and the
 * CMS Page Overview built from GET /content/:tenantId/pages. Section editors land next.
 */
export default async function WebsitePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ tenantId }, t, tc, locale, cookie] = await Promise.all([
    params,
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    cookieHeader(),
  ]);
  const ui = locale as UiLocale;

  let tenant;
  let pages: PageDto[] = [];
  try {
    [tenant, pages] = await Promise.all([tenants.get(tenantId, { cookie }), content.listPages(tenantId, { cookie })]);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }

  const name = pickText(pair(tenant.nameEn, tenant.nameMr), ui, tenant.slug);
  const withPublished = pages.filter((p) => p.sections.some((s) => s.published)).length;
  const progress = pages.length ? Math.round((withPublished / pages.length) * 100) : 0;
  const pendingItems = pages.reduce((n, p) => n + p.sections.filter((sec) => !sec.published).length, 0);
  const isGpOnly = user.assignments.filter((a) => !a.revokedAt).length === 1 && !hasCapability(user, "tenant:create");
  const pageState = (p: PageDto): "completed" | "inProgress" | "notStarted" => {
    const published = p.sections.filter((sec) => sec.published).length;
    if (p.sections.length > 0 && published === p.sections.length) return "completed";
    return published > 0 || p.sections.some((sec) => sec.draft) ? "inProgress" : "notStarted";
  };
  const completedPages = pages.filter((p) => pageState(p) === "completed").length;
  const base = process.env.APP_BASE_HOST && process.env.APP_BASE_HOST !== "localhost" ? `https://${tenant.slug}.${process.env.APP_BASE_HOST}` : `/${tenant.slug}`;

  const stateTone = { completed: "text-success", inProgress: "text-warning", notStarted: "text-muted" } as const;
  const columns: Column<PageDto>[] = [
    {
      key: "page",
      header: t("websites.cmsPage"),
      cell: (p) => <span className="font-semibold text-ink">{t(`pageNames.${p.pageKey}`)}</span>,
    },
    {
      key: "status",
      header: tc("status"),
      cell: (p) => <span className={stateTone[pageState(p)]}>{t(`websites.state.${pageState(p)}`)}</span>,
    },
    {
      key: "required",
      header: t("websites.requiredActions"),
      cell: (p) => {
        if (!p.isEnabled) return <span className="text-muted">{t("websites.disabled")}</span>;
        if (p.sections.length === 0) return <span className="text-muted">{t("websites.noSections")}</span>;
        const left = p.sections.filter((sec) => !sec.published).length;
        const drafts = p.sections.filter((sec) => sec.draft).length;
        return (
          <span className="text-muted">
            {left > 0 ? t("websites.sectionsPending", { n: left }) : "—"}
            {drafts > 0 && <span className="ml-2 rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{t("websites.drafts")} {drafts}</span>}
          </span>
        );
      },
    },
    { key: "updated", header: t("websites.lastUpdated"), cell: (p) => (p.sections.some((sec) => sec.published || sec.draft) ? formatDate(p.updatedAt, ui) : "—"), className: "text-muted" },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (p) =>
        p.sections.length === 0 ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <Link href={`/admin/websites/${tenant.id}/pages/${p.pageKey}`} className="inline-flex rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft">
            {pageState(p) === "notStarted" ? t("websites.start") : t("websites.edit")}
          </Link>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("websites.cmsTitle", { name })}
        description={tenant.status === "PUBLISHED" ? `/${tenant.slug}` : t("websites.setupHint")}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={tenant.status} label={t(`tenantStatus.${tenant.status}`)} />
            <TenantStatusActions tenantId={tenant.id} status={tenant.status} canPublish={hasCapability(user, "tenant:publish")} />
            {!isGpOnly && (
              <Link href="/admin/dashboard" className="inline-flex rounded-button border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-soft">
                {t("websites.goBack")}
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("websites.setupProgress")} value={`${progress}%`} tone="warning" />
        <MetricCard label={t("websites.cmsPages")} value={pages.length} tone="success" />
        <MetricCard label={t("websites.completedPages")} value={completedPages} tone="info" />
        <MetricCard label={t("websites.pendingItems")} value={pendingItems} tone="danger" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("websites.setupTitle")} description={t("websites.setupDescription")} />
          <div className="px-5 pb-5">
            <p className="text-sm font-semibold text-ink">{t("websites.percentCompleted", { n: progress })}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-warning" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-input border border-line bg-success-soft px-4 py-3 text-xs font-medium text-success">
                <CircleCheck className="size-4" aria-hidden /> {t("websites.websiteGenerated")}
              </span>
              <a href={base} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-button bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
                {t("websites.previewWebsite")} <ExternalLink className="size-4" aria-hidden />
              </a>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("websites.websiteDetails")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 px-5 pb-5 text-sm">
            <dt className="text-muted">{t("websites.gp")}</dt>
            <dd className="font-semibold text-ink">{tenant.nameEn}</dd>
            <dt className="text-muted">{t("websites.defaultLocale")}</dt>
            <dd className="font-semibold text-ink">{tenant.defaultLocale}</dd>
            <dt className="text-muted">{t("websites.publicUrl")}</dt>
            <dd>
              {tenant.status === "PUBLISHED" ? (
                <a href={base} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  {t("websites.viewSite")} <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : (
                <span className="font-semibold text-warning">{t("websites.notPublished")}</span>
              )}
            </dd>
            <dt className="text-muted">{tc("created")}</dt>
            <dd className="text-ink">{formatDate(tenant.createdAt, ui)}</dd>
          </dl>
        </Card>
      </div>

      <div className="mb-5">
        <TenantSettingsForm tenant={tenant} canUpdate={hasCapability(user, "tenant:update")} />
      </div>

      <Card>
        <CardHeader title={t("websites.cmsOverview")} />
        <DataTable columns={columns} rows={pages} rowKey={(p) => p.id} emptyMessage={tc("noResults")} />
      </Card>
    </div>
  );
}
