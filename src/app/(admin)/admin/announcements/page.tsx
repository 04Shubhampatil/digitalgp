import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AnnouncementDto, AnnouncementPriority, ContentStatus } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { announcements } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Announcements" };

const STATUSES: ContentStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"];
const PRIORITIES: AnnouncementPriority[] = ["NORMAL", "IMPORTANT", "URGENT", "EMERGENCY"];
type Search = Promise<{ status?: string; priority?: string; q?: string; cursor?: string }>;

/** Figma 22 "Public Announcements Management" on GET /announcements. */
export default async function AnnouncementsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, priority, q, cursor }, t, tc, locale, cookie] = await Promise.all([
    searchParams,
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    cookieHeader(),
  ]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as ContentStatus) ? (status as ContentStatus) : undefined;
  const priorityFilter = PRIORITIES.includes(priority as AnnouncementPriority) ? (priority as AnnouncementPriority) : undefined;
  const page = await announcements.list({ status: statusFilter, priority: priorityFilter, q, cursor, limit: 25 }, { cookie });
  const canCreate = hasCapability(user, "content:edit") || hasCapability(user, "content:share");

  const columns: Column<AnnouncementDto>[] = [
    {
      key: "title",
      header: t("announcements.title"),
      cell: (a) => (
        <div>
          <Link href={`/admin/announcements/${a.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
            {pickText(pair(a.titleEn, a.titleMr), ui, "—")}
          </Link>
          <p className="text-xs text-muted">{pickText({ en: a.category }, ui)}</p>
        </div>
      ),
    },
    { key: "priority", header: t("announcements.priority"), cell: (a) => <StatusPill status={a.priority} label={t(`announcements.priorityLabel.${a.priority}`)} /> },
    { key: "status", header: tc("status"), cell: (a) => <StatusPill status={a.status} label={t(`contentStatus.${a.status}`)} /> },
    {
      key: "to",
      header: t("announcements.publishedTo"),
      cell: (a) =>
        a.tenantId ? (
          <span className="text-muted">{t("announcements.gpOwned")}</span>
        ) : (
          <span className="text-muted">
            {t("announcements.isShared")} · {a.targets.map((x) => x.nameEn).join(", ") || "—"}
          </span>
        ),
    },
    {
      key: "date",
      header: t("announcements.publishAt"),
      cell: (a) => (a.publishedAt ? formatDate(a.publishedAt, ui) : a.publishAt ? `${formatDate(a.publishAt, ui)} (${t("announcements.scheduled")})` : "—"),
      className: "text-muted",
    },
    { key: "pages", header: t("announcements.pages"), cell: (a) => a.displayPages.length, className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("announcements.title")}
        description={t("announcements.subtitle")}
        actions={
          canCreate ? (
            <Link href="/admin/announcements/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("announcements.create")}
            </Link>
          ) : null
        }
      />
      <div className="mb-5">
        <FilterBar action="/admin/announcements" applyLabel={tc("apply")} searchPlaceholder={t("announcements.searchPlaceholder")} searchValue={q}>
          <FilterSelect name="status" label={t("announcements.statusFilter")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`contentStatus.${s}`) }))} />
          <FilterSelect name="priority" label={t("announcements.priorityFilter")} value={priorityFilter} allLabel={tc("all")} options={PRIORITIES.map((p) => ({ value: p, label: t(`announcements.priorityLabel.${p}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("announcements.title")} />
        <DataTable columns={columns} rows={page.data} rowKey={(a) => a.id} emptyMessage={tc("noResults")} />
        <CursorPager
          basePath="/admin/announcements"
          params={{ status: statusFilter, priority: priorityFilter, q, cursor }}
          nextCursor={page.page.nextCursor}
          shown={page.data.length}
          labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }}
        />
      </Card>
    </div>
  );
}
