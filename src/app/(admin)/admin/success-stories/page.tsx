import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ContentStatus, SuccessStoryDto } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { STORY_PAGE_KEYS, successStories, type StoryPageKey } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Success stories" };
const STATUSES: ContentStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"];
type Search = Promise<{ status?: string; pageKey?: string; q?: string; cursor?: string }>;

/** Citizen success stories ("Read Story") shown on the Home, Projects, Schemes and other pages, with the review workflow. */
export default async function SuccessStoriesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, pageKey, q, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as ContentStatus) ? (status as ContentStatus) : undefined;
  const pageFilter = (STORY_PAGE_KEYS as readonly string[]).includes(pageKey ?? "") ? (pageKey as StoryPageKey) : undefined;
  const page = await successStories.list({ status: statusFilter, pageKey: pageFilter, q, cursor, limit: 25 }, { cookie });

  const columns: Column<SuccessStoryDto>[] = [
    {
      key: "title",
      header: t("storiesUi.title"),
      cell: (s) => (
        <div>
          <Link href={`/admin/success-stories/${s.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
            {pickText(pair(s.titleEn, s.titleMr), ui, "—")}
          </Link>
          <p className="text-xs text-muted">{[s.personName, s.location].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "page", header: t("storiesUi.page"), cell: (s) => t(`pageNames.${s.pageKey}`), className: "text-muted" },
    { key: "status", header: tc("status"), cell: (s) => <StatusPill status={s.status} label={t(`contentStatus.${s.status}`)} /> },
    {
      key: "consent",
      header: t("storiesUi.consentShort"),
      cell: (s) =>
        s.consentConfirmed ? (
          <span className="text-xs font-semibold text-success">{tc("yes")}</span>
        ) : s.personName || s.photoId ? (
          <span className="text-xs font-semibold text-warning">{t("storiesUi.consentMissing")}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "updated", header: tc("updated"), cell: (s) => formatDate(s.updatedAt, ui), className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("storiesUi.titlePlural")}
        description={t("storiesUi.subtitle")}
        actions={
          hasCapability(user, "content:edit") ? (
            <Link href="/admin/success-stories/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("storiesUi.create")}
            </Link>
          ) : null
        }
      />
      <div className="mb-5">
        <FilterBar action="/admin/success-stories" applyLabel={tc("apply")} searchPlaceholder={tc("search")} searchValue={q}>
          <FilterSelect name="pageKey" label={t("storiesUi.page")} value={pageFilter} allLabel={tc("all")} options={STORY_PAGE_KEYS.map((k) => ({ value: k, label: t(`pageNames.${k}`) }))} />
          <FilterSelect name="status" label={tc("status")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`contentStatus.${s}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("storiesUi.titlePlural")} />
        <DataTable columns={columns} rows={page.data} rowKey={(s) => s.id} emptyMessage={tc("noResults")} />
        <CursorPager basePath="/admin/success-stories" params={{ status: statusFilter, pageKey: pageFilter, q, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
