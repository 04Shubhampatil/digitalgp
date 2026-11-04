import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ApiPaginated, DashboardPendingItemDto, DashboardWebsiteDto } from "@/types/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Card, CardHeader, MetricCard, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { audit, dashboard, grievances, tenants, users } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability, primaryRole } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

/** Counts come from first pages of the list endpoints (no stats API yet): "100+" when more exist. */
function countOf(page: ApiPaginated<unknown> | null): string {
  if (!page) return "—";
  return `${page.data.length}${page.page.nextCursor ? "+" : ""}`;
}
const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/**
 * Role-aware dashboard. GP admins and operators with a single website go straight to that
 * website's CMS dashboard (Figma "Savardari Gram Panchayat CMS"); everyone else gets the
 * Super / Block admin overview (Figma 02 / 12).
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = primaryRole(user);
  const active = user.assignments.filter((a) => !a.revokedAt);
  const soleTenant = active.length === 1 ? active[0]?.tenantId : null;
  if ((role === "GP_ADMIN" || role === "DATA_ENTRY_OPERATOR") && soleTenant) redirect(`/admin/websites/${soleTenant}`);

  const [t, tc, locale, cookie] = await Promise.all([getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const canUsers = hasCapability(user, "user:read");
  const canReview = hasCapability(user, "content:review");
  const canGrievances = hasCapability(user, "grievance:manage");

  const [all, published, draft, suspended, staff, open, recentAudit, sites, pendingFeed] = await Promise.all([
    safe(tenants.list({ limit: 100 }, { cookie })),
    safe(tenants.list({ status: "PUBLISHED", limit: 100 }, { cookie })),
    safe(tenants.list({ status: "DRAFT", limit: 100 }, { cookie })),
    safe(tenants.list({ status: "SUSPENDED", limit: 100 }, { cookie })),
    canUsers ? safe(users.list({ limit: 100 }, { cookie })) : Promise.resolve(null),
    canGrievances ? safe(grievances.list({ status: "OPEN", limit: 100 }, { cookie })) : Promise.resolve(null),
    safe(audit.list({ limit: 8 }, { cookie })),
    safe(dashboard.websites({ limit: 100 }, { cookie })),
    safe(dashboard.pendingUpdates({}, { cookie })),
  ]);

  // Block and taluka admins get the compact dashboard from the design.
  const isBlock = role === "BLOCK_ADMIN" || role === "TALUKA_ADMIN";
  const total = all?.data.length ?? 0;
  const bar = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  // Websites with their pending items, last change (and who) and setup progress; most recently changed first.
  const recent = (sites?.data ?? [])
    .slice()
    .sort((a, b) => (b.lastUpdatedAt ?? "").localeCompare(a.lastUpdatedAt ?? "") || b.pendingItems - a.pendingItems)
    .slice(0, 6);
  // Pending Updates: items in SUBMITTED / UNDER_REVIEW summed over the websites (the feed below lists the latest 20).
  const pendingTotal = sites ? `${sites.data.reduce((n, s) => n + s.pendingItems, 0).toLocaleString()}${sites.page.nextCursor ? "+" : ""}` : pendingFeed ? `${pendingFeed.length}${pendingFeed.length >= 20 ? "+" : ""}` : "—";
  const pendingHref = (p: DashboardPendingItemDto) => {
    switch (p.type) {
      case "SECTION":
        return p.tenant && p.pageKey ? `/admin/websites/${p.tenant.id}/pages/${p.pageKey}` : null;
      case "ANNOUNCEMENT":
        return `/admin/announcements/${p.id}`;
      case "SCHEME":
        return `/admin/schemes/${p.id}`;
      case "PROJECT":
        return `/admin/projects/${p.id}`;
      case "SUCCESS_STORY":
        return `/admin/success-stories/${p.id}`;
    }
  };
  const pendingTitle = (p: DashboardPendingItemDto) =>
    p.type === "SECTION" ? `${p.pageKey ? t(`pageNames.${p.pageKey}`) : ""} › ${p.sectionKey ?? ""}` : pickText(pair(p.titleEn, p.titleMr), ui, "—");

  const quick = isBlock
    ? [
        { href: "/admin/websites", label: t("dashboardUi.editGp"), hint: "", show: true },
        { href: "/admin/announcements/new", label: t("nav.publishAnnouncement"), hint: "", show: true },
      ]
    : [
    { href: "/admin/websites", label: t("websites.create"), hint: t("dashboardUi.quickCreate"), show: hasCapability(user, "tenant:create") },
    { href: "/admin/users/new", label: t("users.create"), hint: t("dashboardUi.quickUser"), show: hasCapability(user, "user:manage") },
    { href: "/admin/hierarchy", label: t("hierarchy.title"), hint: t("dashboardUi.quickHierarchy"), show: hasCapability(user, "hierarchy:read") },
    { href: "/admin/announcements/new", label: t("announcements.create"), hint: t("dashboardUi.quickAnnounce"), show: hasCapability(user, "content:share") || hasCapability(user, "content:edit") },
    { href: "/admin/grievances?status=OPEN", label: t("grievances"), hint: t("dashboardUi.quickGrievances"), show: canGrievances },
  ].filter((q) => q.show);

  const columns: Column<DashboardWebsiteDto>[] = [
    {
      key: "gp",
      header: t("websites.gp"),
      cell: (s) => (
        <Link href={`/admin/websites/${s.tenantId}`} className="font-semibold text-ink hover:text-primary hover:underline">
          {pickText(pair(s.nameEn, s.nameMr), ui, s.slug)}
        </Link>
      ),
    },
    { key: "status", header: tc("status"), cell: (s) => <StatusPill status={s.status} label={t(`tenantStatus.${s.status}`)} /> },
    { key: "pending", header: t("websites.pendingItems"), cell: (s) => s.pendingItems.toLocaleString(), className: "text-muted" },
    ...(isBlock
      ? []
      : [
          {
            key: "setup",
            header: t("websites.setupProgress"),
            cell: (s: DashboardWebsiteDto) => (
              <div className="flex min-w-24 items-center gap-2" title={t("websites.pagesWithContent", { done: s.setupProgress.pagesWithContent, total: s.setupProgress.pagesTotal })}>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${s.setupProgress.percent}%` }} />
                </span>
                <span className="text-xs text-muted">{s.setupProgress.percent}%</span>
              </div>
            ),
          },
        ]),
    { key: "updated", header: t("websites.lastUpdated"), cell: (s) => (s.lastUpdatedAt ? formatDateTime(s.lastUpdatedAt, ui) : "—"), className: "text-muted whitespace-nowrap" },
    { key: "by", header: t("dashboardUi.updatedBy"), cell: (s) => s.lastUpdatedBy?.name ?? "—", className: "text-muted" },
    {
      key: "action",
      header: tc("actions"),
      cell: (s: DashboardWebsiteDto) => (
        <Link href={`/admin/websites/${s.tenantId}`} className="text-sm font-medium text-primary hover:underline">
          {s.status === "DRAFT" ? t("websites.continueSetup") : t("dashboardUi.openCms")}
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={role ? t(`dashboardUi.title.${role}`) : t("dashboard")} description={t("welcome", { name: user.user.name })} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isBlock ? (
          <>
            <MetricCard label={t("nav.assignedWebsites")} value={countOf(all)} tone="info" />
            <MetricCard label={t("tenantStatus.PUBLISHED")} value={countOf(published)} tone="success" />
            <MetricCard label={t("tenantStatus.DRAFT")} value={countOf(draft)} tone="warning" />
            <MetricCard label={t("dashboardUi.pendingUpdates")} value={pendingTotal} tone="danger" />
          </>
        ) : (
          <>
        <MetricCard label={t("websites.title")} value={countOf(all)} caption={`${countOf(published)} ${t("tenantStatus.PUBLISHED").toLowerCase()}`} tone="info" />
        {canUsers ? <MetricCard label={t("users.title")} value={countOf(staff)} tone="violet" /> : <MetricCard label={t("tenantStatus.DRAFT")} value={countOf(draft)} tone="warning" />}
        {canReview && <MetricCard label={t("dashboardUi.pendingUpdates")} value={pendingTotal} caption={t("dashboardUi.pendingCaption")} tone="warning" />}
        {canGrievances && <MetricCard label={t("dashboardUi.openGrievances")} value={countOf(open)} tone="danger" />}
          </>
        )}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("dashboardUi.websiteOverview")} description={t("dashboardUi.websiteOverviewHint")} />
          <dl className="grid gap-4 px-5 pb-5">
            {(
              [
                ["PUBLISHED", published?.data.length ?? 0, "bg-primary"],
                ["DRAFT", draft?.data.length ?? 0, "bg-warning"],
                ["SUSPENDED", suspended?.data.length ?? 0, "bg-danger"],
              ] as const
            )
              .filter(([status]) => !isBlock || status !== "SUSPENDED")
              .map(([status, n, color]) => (
              <div key={status} className="grid grid-cols-[110px_1fr_48px] items-center gap-4 text-sm">
                <dt className="font-medium text-ink">{t(`tenantStatus.${status}`)}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-track">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${bar(n)}%` }} />
                </dd>
                <dd className="text-right font-semibold text-ink">{n}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader title={t("dashboardUi.quickActions")} />
          <ul className="grid gap-2 px-5 pb-5">
            {quick.map((q) => (
              <li key={q.href}>
                <Link href={q.href} className="flex items-center justify-between rounded-button bg-surface-soft px-4 py-2.5 hover:bg-success-soft">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{q.label}</span>
                    <span className="block text-[11px] text-muted">{q.hint}</span>
                  </span>
                  <ChevronRight className="size-4 text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={isBlock ? t("dashboardUi.gpOverview") : t("dashboardUi.recentWebsites")}
            actions={
              <Link href="/admin/websites" className="rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft">
                {tc("viewAll")}
              </Link>
            }
          />
          <DataTable columns={columns} rows={recent} rowKey={(s) => s.tenantId} emptyMessage={tc("noResults")} />
        </Card>
        <div className="grid content-start gap-4">
        {pendingFeed && (
          <Card>
            <CardHeader title={t("dashboardUi.pendingUpdates")} description={t("dashboardUi.pendingFeedHint")} />
            <ul className="grid gap-3 px-5 pb-5 text-sm">
              {pendingFeed.slice(0, 8).map((p) => {
                const href = pendingHref(p);
                const title = pendingTitle(p);
                return (
                  <li key={`${p.type}-${p.id}`} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className="block truncate font-semibold text-ink hover:text-primary hover:underline">
                          {title}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold text-ink">{title}</p>
                      )}
                      <p className="text-[11px] text-muted">
                        {t(`dashboardUi.pendingType.${p.type}`)}
                        {p.tenant ? ` · ${p.tenant.nameEn}` : ""}
                        {p.submittedBy.name ? ` · ${p.submittedBy.name}` : ""}
                        {p.submittedAt ? ` · ${formatDate(p.submittedAt, ui)}` : ""}
                      </p>
                    </div>
                    <StatusPill status={p.status} label={t(`contentStatus.${p.status}`)} />
                  </li>
                );
              })}
              {pendingFeed.length === 0 && <li className="text-muted">{t("dashboardUi.noPending")}</li>}
            </ul>
          </Card>
        )}
        <Card>
          <CardHeader title={t("dashboardUi.recentActivity")} />
          <ul className="grid gap-3 px-5 pb-5 text-sm">
            {(recentAudit?.data ?? []).map((l) => (
              <li key={l.id}>
                <p className="font-mono text-xs font-semibold text-ink">{l.action}</p>
                <p className="text-[11px] text-muted">
                  {l.actorRole ? `${t(`role.${l.actorRole}`)} · ` : ""}
                  {formatDateTime(l.createdAt, ui)}
                </p>
              </li>
            ))}
            {(recentAudit?.data.length ?? 0) === 0 && <li className="text-muted">—</li>}
          </ul>
        </Card>
        </div>
      </div>
    </div>
  );
}
