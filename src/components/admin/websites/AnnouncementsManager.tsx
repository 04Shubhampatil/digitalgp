import { Pencil, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { AnnouncementDto, CurrentUserDto } from "@/types/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { announcements } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { hasCapability } from "@/lib/session";

const LIMIT = 100;
const SHOWN = 10;

/**
 * "Latest Announcements" card of the Announcements & Circulars editor (Figma): the announcements this
 * website shows (its own plus shared ones), with add and edit links. Each announcement keeps its own
 * draft, review and publish workflow on /admin/announcements/:id.
 */
export async function AnnouncementsManager({ user, tenantId }: { user: CurrentUserDto; tenantId: string }) {
  const [t, tc, locale, cookie] = await Promise.all([getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const page = await announcements.list({ limit: LIMIT }, { cookie });
  // The API scopes the list to the actor; a super admin sees every GP, so keep this website's and shared ones.
  const rows = page.data.filter((a) => a.tenantId === null || a.tenantId === tenantId);
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
          <p className="text-xs text-muted">{a.tenantId ? a.category : `${a.category} · ${t("announcements.isShared")}`}</p>
        </div>
      ),
    },
    { key: "priority", header: t("announcements.priority"), cell: (a) => <StatusPill status={a.priority} label={t(`announcements.priorityLabel.${a.priority}`)} /> },
    { key: "status", header: tc("status"), cell: (a) => <StatusPill status={a.status} label={t(`contentStatus.${a.status}`)} /> },
    {
      key: "date",
      header: t("announcements.publishAt"),
      cell: (a) => (a.publishedAt ? formatDate(a.publishedAt, ui) : a.publishAt ? `${formatDate(a.publishAt, ui)} (${t("announcements.scheduled")})` : "—"),
      className: "text-muted",
    },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (a) =>
        canCreate ? (
          <Link href={`/admin/announcements/${a.id}/edit`} aria-label={tc("edit")} className="inline-flex rounded p-1 text-muted hover:bg-surface-soft hover:text-primary">
            <Pencil className="size-4" aria-hidden />
          </Link>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={t("announcements.managementTitle")}
        description={t("announcements.managementDesc")}
        actions={
          canCreate ? (
            <Link href="/admin/announcements/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("announcements.create")}
            </Link>
          ) : null
        }
      />
      <DataTable columns={columns} rows={rows.slice(0, SHOWN)} rowKey={(a) => a.id} emptyMessage={tc("noResults")} />
      {(rows.length > SHOWN || page.page.nextCursor) && (
        <p className="px-5 py-3 text-xs text-muted">
          {t("announcements.showingFirst", { n: SHOWN })}{" "}
          <Link href="/admin/announcements" className="font-semibold text-primary hover:underline">
            {t("announcements.viewAll")}
          </Link>
        </p>
      )}
    </Card>
  );
}
