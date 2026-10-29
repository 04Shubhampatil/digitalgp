import { Pencil, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ProjectDto, ProjectStage } from "@/types/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { projects } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { hasCapability } from "@/lib/session";
import type { CurrentUserDto } from "@/types/api";

const STAGES: ProjectStage[] = ["COMPLETED", "ONGOING", "UPCOMING"];
const LIMIT = 100;

/**
 * "Key Project Management" card of the Key Projects page editor (Figma): Completed / Ongoing /
 * Upcoming tabs with counts, this website's projects for the selected stage, add and edit links.
 * Projects keep their own draft → review → publish workflow on /admin/projects/:id.
 */
export async function ProjectsManager({ user, tenantId, basePath, stage }: { user: CurrentUserDto; tenantId: string; basePath: string; stage?: string }) {
  const [t, tp, tc, locale, cookie] = await Promise.all([getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const active: ProjectStage = STAGES.includes(stage as ProjectStage) ? (stage as ProjectStage) : "COMPLETED";

  // One request per stage: the first LIMIT rows give the tab counts and the selected tab's rows.
  const pages = await Promise.all(STAGES.map((s) => projects.list({ tenantId, stage: s, limit: LIMIT }, { cookie })));
  const byStage = new Map(STAGES.map((s, i) => [s, pages[i]!] as const));
  const rows = byStage.get(active)!.data;
  const canEdit = hasCapability(user, "content:edit");

  const columns: Column<ProjectDto>[] = [
    {
      key: "name",
      header: t("projectsUi.projectName"),
      cell: (p) => (
        <Link href={`/admin/projects/${p.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
          {pickText(pair(p.nameEn, p.nameMr), ui, "—")}
        </Link>
      ),
    },
    { key: "ward", header: tp("ward"), cell: (p) => (p.wardNo ? `${tp("ward")} ${p.wardNo}` : "—"), className: "text-muted" },
    { key: "status", header: tc("status"), cell: (p) => <StatusPill status={p.status} label={t(`contentStatus.${p.status}`)} /> },
    { key: "year", header: tp("projectYear"), cell: (p) => p.year ?? "—", className: "text-muted" },
    { key: "budget", header: tp("budget"), cell: (p) => (p.budget ? `₹ ${Number(p.budget).toLocaleString("en-IN")}` : "—"), className: "text-muted" },
    { key: "updated", header: tc("updated"), cell: (p) => formatDate(p.updatedAt, ui), className: "text-muted" },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (p) =>
        canEdit ? (
          <Link href={`/admin/projects/${p.id}/edit`} aria-label={tc("edit")} className="inline-flex rounded p-1 text-muted hover:bg-surface-soft hover:text-primary">
            <Pencil className="size-4" aria-hidden />
          </Link>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={t("projectsUi.managementTitle")}
        description={t("projectsUi.managementDesc")}
        actions={
          canEdit ? (
            <Link href="/admin/projects/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("projectsUi.create")}
            </Link>
          ) : null
        }
      />
      <div role="tablist" className="flex gap-6 border-b border-line px-5">
        {STAGES.map((s) => {
          const page = byStage.get(s)!;
          const count = page.page.nextCursor ? `${page.data.length}+` : String(page.data.length);
          return (
            <Link
              key={s}
              role="tab"
              aria-selected={s === active}
              href={`${basePath}?stage=${s}`}
              scroll={false}
              className={cn("-mb-px border-b-2 px-1 py-3 text-sm font-semibold", s === active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}
            >
              {tp(`projectStage.${s}`)} ({count})
            </Link>
          );
        })}
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} emptyMessage={tc("noResults")} />
      {byStage.get(active)!.page.nextCursor && (
        <p className="px-5 py-3 text-xs text-muted">
          {t("projectsUi.showingFirst", { n: rows.length })}{" "}
          <Link href={`/admin/projects?stage=${active}`} className="font-semibold text-primary hover:underline">
            {t("projectsUi.viewAll")}
          </Link>
        </p>
      )}
    </Card>
  );
}
