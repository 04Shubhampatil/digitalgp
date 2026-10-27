import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ContentStatus, SchemeDto, SchemeLevel } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { schemes } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Schemes" };
const STATUSES: ContentStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"];
const LEVELS: SchemeLevel[] = ["CENTRAL", "STATE", "DISTRICT", "GRAM_PANCHAYAT"];
type Search = Promise<{ status?: string; level?: string; q?: string; cursor?: string }>;

export default async function SchemesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, level, q, cursor }, t, tp, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as ContentStatus) ? (status as ContentStatus) : undefined;
  const levelFilter = LEVELS.includes(level as SchemeLevel) ? (level as SchemeLevel) : undefined;
  const page = await schemes.list({ status: statusFilter, level: levelFilter, q, cursor, limit: 25 }, { cookie });
  const canCreate = hasCapability(user, "content:edit") || hasCapability(user, "content:share");

  const columns: Column<SchemeDto>[] = [
    {
      key: "name",
      header: tc("name"),
      cell: (s) => (
        <div>
          <Link href={`/admin/schemes/${s.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
            {pickText(pair(s.nameEn, s.nameMr), ui, "—")}
          </Link>
          <p className="text-xs text-muted">{s.tenantId ? t("schemesUi.gpOwned") : `${t("announcements.isShared")} · ${s.targets.map((x) => x.nameEn).join(", ")}`}</p>
        </div>
      ),
    },
    { key: "level", header: t("schemesUi.level"), cell: (s) => tp(`schemeLevel.${s.level}`), className: "text-muted" },
    { key: "status", header: tc("status"), cell: (s) => <StatusPill status={s.status} label={t(`contentStatus.${s.status}`)} /> },
    { key: "beneficiaries", header: tp("beneficiaries"), cell: (s) => s.beneficiaryCount?.toLocaleString("en-IN") ?? "—", className: "text-muted" },
    { key: "updated", header: tc("updated"), cell: (s) => formatDate(s.updatedAt, ui), className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("schemes")}
        description={t("schemesUi.subtitle")}
        actions={
          canCreate ? (
            <Link href="/admin/schemes/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("schemesUi.create")}
            </Link>
          ) : null
        }
      />
      <div className="mb-5">
        <FilterBar action="/admin/schemes" applyLabel={tc("apply")} searchPlaceholder={tc("search")} searchValue={q}>
          <FilterSelect name="status" label={tc("status")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`contentStatus.${s}`) }))} />
          <FilterSelect name="level" label={t("schemesUi.level")} value={levelFilter} allLabel={tc("all")} options={LEVELS.map((l) => ({ value: l, label: tp(`schemeLevel.${l}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("schemes")} />
        <DataTable columns={columns} rows={page.data} rowKey={(s) => s.id} emptyMessage={tc("noResults")} />
        <CursorPager basePath="/admin/schemes" params={{ status: statusFilter, level: levelFilter, q, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
