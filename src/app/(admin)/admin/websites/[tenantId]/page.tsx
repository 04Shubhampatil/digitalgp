import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
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
  const withDraft = pages.filter((p) => p.sections.some((s) => s.draft)).length;
  const pending = pages.reduce((n, p) => n + p.sections.filter((s) => s.draft && ["SUBMITTED", "UNDER_REVIEW"].includes(s.draft.status)).length, 0);
  const progress = pages.length ? Math.round((withPublished / pages.length) * 100) : 0;
  const base = process.env.APP_BASE_HOST && process.env.APP_BASE_HOST !== "localhost" ? `https://${tenant.slug}.${process.env.APP_BASE_HOST}` : `/${tenant.slug}`;

  const columns: Column<PageDto>[] = [
    {
      key: "page",
      header: t("websites.page"),
      cell: (p) => (
        <div>
          <p className="font-semibold text-ink">{t(`pageNames.${p.pageKey}`)}</p>
          <p className="text-xs text-muted">{p.pageKey}</p>
        </div>
      ),
    },
    {
      key: "enabled",
      header: tc("status"),
      cell: (p) => (p.isEnabled ? t("websites.enabled") : t("websites.disabled")),
      className: "text-muted",
    },
    {
      key: "sections",
      header: t("websites.sections"),
      cell: (p) => {
        const published = p.sections.filter((s) => s.published).length;
        const drafts = p.sections.filter((s) => s.draft).length;
        if (p.sections.length === 0) return <span className="text-muted">—</span>;
        return (
          <span className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-pill bg-success-soft px-2 py-0.5 font-semibold text-success">
              {t("websites.published")} {published}/{p.sections.length}
            </span>
            {drafts > 0 && (
              <span className="rounded-pill bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                {t("websites.drafts")} {drafts}
              </span>
            )}
          </span>
        );
      },
    },
    { key: "updated", header: t("websites.lastUpdated"), cell: (p) => formatDate(p.updatedAt, ui), className: "text-muted" },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (p) =>
        p.sections.length === 0 ? (
          <span className="text-xs text-muted">{t("websites.noSections")}</span>
        ) : (
          <Link href={`/admin/websites/${tenant.id}/pages/${p.pageKey}`} className="inline-flex rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft">
            {t("websites.edit")}
          </Link>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={name}
        description={`/${tenant.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={tenant.status} label={t(`tenantStatus.${tenant.status}`)} />
            <TenantStatusActions tenantId={tenant.id} status={tenant.status} canPublish={hasCapability(user, "tenant:publish")} />
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("websites.setupProgress")} value={`${progress}%`} caption={t("websites.pagesWithContent", { done: withPublished, total: pages.length })} tone="warning" />
        <MetricCard label={t("websites.pages")} value={pages.length} tone="success" />
        <MetricCard label={t("websites.drafts")} value={withDraft} tone="info" />
        <MetricCard label={t("contentStatus.SUBMITTED")} value={pending} tone="danger" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("websites.setupProgress")} />
          <div className="px-5 pb-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-warning" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{t("websites.pagesWithContent", { done: withPublished, total: pages.length })}</p>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("websites.websiteDetails")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
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
        <CardHeader title={t("websites.pages")} />
        <DataTable columns={columns} rows={pages} rowKey={(p) => p.id} emptyMessage={tc("noResults")} />
      </Card>
    </div>
  );
}
