import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { AuditLogDto } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { audit } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Audit logs" };
type Search = Promise<{ action?: string; entityType?: string; from?: string; to?: string; cursor?: string }>;

const toIso = (d?: string, endOfDay = false) => (d ? new Date(`${d}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);

/** Figma 17 "Audit Logs" on GET /audit-logs (scope-filtered; operators see their own actions). */
export default async function AuditLogsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ action, entityType, from, to, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const page = await audit.list({ action: action || undefined, entityType: entityType || undefined, from: toIso(from), to: toIso(to, true), cursor, limit: 50 }, { cookie });

  const columns: Column<AuditLogDto>[] = [
    { key: "time", header: t("auditUi.time"), cell: (l) => formatDateTime(l.createdAt, ui), className: "whitespace-nowrap text-muted" },
    {
      key: "action",
      header: t("auditUi.action"),
      cell: (l) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink">{l.action}</p>
          <p className="text-xs text-muted">
            {l.entityType}
            {l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
          </p>
        </div>
      ),
    },
    { key: "actor", header: t("auditUi.actor"), cell: (l) => (l.actorRole ? t(`role.${l.actorRole}`) : "—"), className: "text-muted" },
    {
      key: "diff",
      header: t("auditUi.change"),
      cell: (l) =>
        l.before || l.after ? (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-primary">{t("auditUi.view")}</summary>
            <pre className="mt-2 max-h-64 max-w-md overflow-auto rounded-input bg-surface-table p-2 text-[11px] whitespace-pre-wrap">{JSON.stringify({ before: l.before, after: l.after }, null, 2)}</pre>
          </details>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("auditLogs")} description={t("auditUi.subtitle")} />
      <div className="mb-5">
        <FilterBar action="/admin/audit-logs" applyLabel={tc("apply")}>
          <label className="flex min-w-40 flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("auditUi.action")}</span>
            <input name="action" defaultValue={action} placeholder="announcement.publish" className="h-11 rounded-card border border-line-strong bg-surface px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="flex min-w-40 flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("auditUi.entity")}</span>
            <input name="entityType" defaultValue={entityType} placeholder="Announcement" className="h-11 rounded-card border border-line-strong bg-surface px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("auditUi.from")}</span>
            <input type="date" name="from" defaultValue={from} className="h-11 rounded-card border border-line-strong bg-surface px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("auditUi.to")}</span>
            <input type="date" name="to" defaultValue={to} className="h-11 rounded-card border border-line-strong bg-surface px-3 text-sm outline-none focus:border-primary" />
          </label>
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("auditLogs")} />
        <DataTable columns={columns} rows={page.data} rowKey={(l) => l.id} emptyMessage={tc("noResults")} />
        <CursorPager basePath="/admin/audit-logs" params={{ action, entityType, from, to, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
