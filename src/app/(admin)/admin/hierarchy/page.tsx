import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminUnitDto } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { AddUnitDialog } from "@/components/admin/hierarchy/AddUnitDialog";
import { EditUnitDialog } from "@/components/admin/hierarchy/EditUnitDialog";
import { Card, CardHeader, MetricCard, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { childLevels, hierarchy } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Districts & Talukas" };

type Search = Promise<{ parentId?: string; q?: string; cursor?: string }>;

/**
 * Hierarchy browser (Figma 07 "District & Taluka Management"): drill down from the user's scope
 * roots through DISTRICT → TALUKA → BLOCK → GRAM_PANCHAYAT using GET /hierarchy/units.
 */
export default async function HierarchyPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ parentId, q, cursor }, t, tc, locale, cookie] = await Promise.all([
    searchParams,
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    cookieHeader(),
  ]);
  const ui = locale as UiLocale;
  const canManage = hasCapability(user, "hierarchy:manage");

  // Current node + breadcrumb, or the scope roots when no parent is chosen.
  let parent: AdminUnitDto | null = null;
  let ancestors: AdminUnitDto[] = [];
  let rows: AdminUnitDto[] = [];
  let nextCursor: string | null = null;

  if (parentId) {
    const res = await hierarchy.get(parentId, { cookie });
    parent = res.unit;
    ancestors = res.ancestors;
    const page = await hierarchy.list({ parentId, q, cursor, limit: 25 }, { cookie });
    rows = page.data;
    nextCursor = page.page.nextCursor;
  } else {
    // Roots = the units of the user's assignments (deduped), fetched for full DTOs.
    const ids = [...new Set(user.assignments.filter((a) => !a.revokedAt).map((a) => a.unitId))];
    rows = (await Promise.all(ids.map((id) => hierarchy.get(id, { cookie })))).map((r) => r.unit);
  }

  const childLevel = parent ? childLevels(parent.level)[0] : null;
  const name = (u: AdminUnitDto) => pickText(pair(u.nameEn, u.nameMr), ui, u.slug);

  const columns: Column<AdminUnitDto>[] = [
    {
      key: "name",
      header: tc("name"),
      cell: (u) => (
        <div>
          <p className="font-semibold text-ink">{name(u)}</p>
          <p className="text-xs text-muted">
            {ui === "mr" ? u.nameEn : u.nameMr} · {u.slug}
          </p>
        </div>
      ),
    },
    { key: "level", header: t("hierarchy.levelField"), cell: (u) => t(`level.${u.level}`) },
    { key: "code", header: t("hierarchy.unitCode"), cell: (u) => u.code ?? "—", className: "text-muted" },
    {
      key: "website",
      header: t("hierarchy.website"),
      cell: (u) =>
        u.level !== "GRAM_PANCHAYAT" ? (
          "—"
        ) : u.tenantId ? (
          <Link href={`/admin/websites/${u.tenantId}`} className="font-semibold text-primary hover:underline">
            {t("websites.manage")}
          </Link>
        ) : (
          <StatusPill status="NOT_CREATED" label={t("tenantStatus.NOT_CREATED")} />
        ),
    },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (u) =>
        u.level === "GRAM_PANCHAYAT" ? null : (
          <Link
            href={`/admin/hierarchy?parentId=${u.id}`}
            className="inline-flex items-center gap-1 rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft"
          >
            {t("hierarchy.open")} <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("hierarchy.title")}
        description={t("hierarchy.subtitle")}
        actions={
          canManage && parent ? (
            <div className="flex items-center gap-2">
              <EditUnitDialog unit={parent} />
              {childLevel ? <AddUnitDialog parent={parent} /> : null}
            </div>
          ) : null
        }
      />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/admin/hierarchy" className="hover:text-primary">
          {t("hierarchy.breadcrumbRoot")}
        </Link>
        {[...ancestors, ...(parent ? [parent] : [])].map((a, i, arr) => (
          <span key={a.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" aria-hidden />
            {i === arr.length - 1 ? (
              <span className="font-semibold text-ink">{name(a)}</span>
            ) : (
              <Link href={`/admin/hierarchy?parentId=${a.id}`} className="hover:text-primary">
                {name(a)}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {parent && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <MetricCard label={t("hierarchy.levelField")} value={t(`level.${parent.level}`)} tone="info" />
          <MetricCard label={t("hierarchy.unitCode")} value={parent.code ?? "—"} tone="success" />
          <MetricCard label={childLevel ? t("hierarchy.children", { level: t(`level.${childLevel}`) }) : "—"} value={rows.length + (nextCursor ? "+" : "")} tone="warning" />
        </div>
      )}

      {parent && (
        <div className="mb-5">
          <FilterBar action="/admin/hierarchy" applyLabel={tc("apply")} searchPlaceholder={tc("search")} searchValue={q}>
            <input type="hidden" name="parentId" value={parent.id} />
          </FilterBar>
        </div>
      )}

      <Card>
        <CardHeader title={childLevel ? t("hierarchy.children", { level: t(`level.${childLevel}`) }) : t("picker.scope")} />
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} emptyMessage={tc("noResults")} />
        {parent && (
          <CursorPager
            basePath="/admin/hierarchy"
            params={{ parentId: parent.id, q, cursor }}
            nextCursor={nextCursor}
            shown={rows.length}
            labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }}
          />
        )}
      </Card>
    </div>
  );
}
