import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ContentStatus, ProjectDto, ProjectStage } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { projects } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Projects" };
const STATUSES: ContentStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"];
const STAGES: ProjectStage[] = ["UPCOMING", "ONGOING", "COMPLETED"];
type Search = Promise<{ status?: string; stage?: string; q?: string; cursor?: string }>;

export default async function ProjectsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, stage, q, cursor }, t, tp, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as ContentStatus) ? (status as ContentStatus) : undefined;
  const stageFilter = STAGES.includes(stage as ProjectStage) ? (stage as ProjectStage) : undefined;
  const page = await projects.list({ status: statusFilter, stage: stageFilter, q, cursor, limit: 25 }, { cookie });

  const columns: Column<ProjectDto>[] = [
    {
      key: "name",
      header: tc("name"),
      cell: (p) => (
        <div>
          <Link href={`/admin/projects/${p.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
            {pickText(pair(p.nameEn, p.nameMr), ui, "—")}
          </Link>
          <p className="text-xs text-muted">{[p.year, p.wardNo ? `${tp("ward")} ${p.wardNo}` : null].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "stage", header: t("projectsUi.stage"), cell: (p) => tp(`projectStage.${p.stage}`), className: "text-muted" },
    { key: "status", header: tc("status"), cell: (p) => <StatusPill status={p.status} label={t(`contentStatus.${p.status}`)} /> },
    { key: "budget", header: tp("budget"), cell: (p) => (p.budget ? `₹ ${Number(p.budget).toLocaleString("en-IN")}` : "—"), className: "text-muted" },
    { key: "updated", header: tc("updated"), cell: (p) => formatDate(p.updatedAt, ui), className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("projects")}
        description={t("projectsUi.subtitle")}
        actions={
          hasCapability(user, "content:edit") ? (
            <Link href="/admin/projects/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("projectsUi.create")}
            </Link>
          ) : null
        }
      />
      <div className="mb-5">
        <FilterBar action="/admin/projects" applyLabel={tc("apply")} searchPlaceholder={tc("search")} searchValue={q}>
          <FilterSelect name="status" label={tc("status")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`contentStatus.${s}`) }))} />
          <FilterSelect name="stage" label={t("projectsUi.stage")} value={stageFilter} allLabel={tc("all")} options={STAGES.map((s) => ({ value: s, label: tp(`projectStage.${s}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("projects")} />
        <DataTable columns={columns} rows={page.data} rowKey={(p) => p.id} emptyMessage={tc("noResults")} />
        <CursorPager basePath="/admin/projects" params={{ status: statusFilter, stage: stageFilter, q, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
