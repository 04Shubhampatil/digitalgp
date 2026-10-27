import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { GrievanceDto, GrievanceStatus } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { grievances } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Grievances" };
const STATUSES: GrievanceStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];
type Search = Promise<{ status?: string; q?: string; cursor?: string }>;

/** Staff view of citizen grievances (GET /grievances) — Figma 12 "Grievance Redressal" admin side. */
export default async function GrievancesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, q, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as GrievanceStatus) ? (status as GrievanceStatus) : undefined;
  const page = await grievances.list({ status: statusFilter, q, cursor, limit: 25 }, { cookie });

  const columns: Column<GrievanceDto>[] = [
    {
      key: "code",
      header: t("grievancesUi.code"),
      cell: (g) => (
        <Link href={`/admin/grievances/${g.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
          {g.trackingCode}
        </Link>
      ),
    },
    { key: "category", header: t("announcements.category"), cell: (g) => g.category, className: "text-muted" },
    {
      key: "citizen",
      header: t("grievancesUi.citizen"),
      cell: (g) => (
        <div>
          <p className="font-semibold text-ink">{g.citizenName}</p>
          <p className="text-xs text-muted">{g.citizenPhone ?? g.citizenEmail ?? ""}</p>
        </div>
      ),
    },
    { key: "status", header: tc("status"), cell: (g) => <StatusPill status={g.status} label={t(`grievanceStatus.${g.status}`)} /> },
    { key: "assignee", header: t("grievancesUi.assignee"), cell: (g) => g.assignedToName ?? <span className="text-muted">{t("grievancesUi.unassigned")}</span> },
    { key: "created", header: tc("created"), cell: (g) => formatDateTime(g.createdAt, ui), className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("grievances")} description={t("grievancesUi.subtitle")} />
      <div className="mb-5">
        <FilterBar action="/admin/grievances" applyLabel={tc("apply")} searchPlaceholder={t("grievancesUi.searchPlaceholder")} searchValue={q}>
          <FilterSelect name="status" label={tc("status")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`grievanceStatus.${s}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("grievances")} />
        <DataTable columns={columns} rows={page.data} rowKey={(g) => g.id} emptyMessage={tc("noResults")} />
        <CursorPager basePath="/admin/grievances" params={{ status: statusFilter, q, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
