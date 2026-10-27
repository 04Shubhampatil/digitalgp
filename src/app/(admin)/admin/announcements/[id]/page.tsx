import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkflowBar } from "@/components/admin/announcements/WorkflowBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { EDITABLE_STATUSES, announcements } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Announcement" };

/** Announcement detail with the review workflow (GET /announcements/:id). */
export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;

  let a;
  try {
    a = await announcements.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const editable = EDITABLE_STATUSES.includes(a.status);
  const canEdit = a.tenantId ? hasCapability(user, "content:edit") : hasCapability(user, "content:share");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={a.titleEn || a.titleMr || "—"}
        description={`${a.category} · ${t(`announcements.priorityLabel.${a.priority}`)}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={a.status} label={t(`contentStatus.${a.status}`)} />
            {editable && canEdit && (
              <Link href={`/admin/announcements/${a.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-button border border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-soft">
                <Pencil className="size-4" aria-hidden /> {tc("edit")}
              </Link>
            )}
          </div>
        }
      />

      <Card className="mb-5">
        <CardHeader title={t("announcements.workflow")} description={!editable ? t("announcements.locked", { status: t(`contentStatus.${a.status}`) }) : undefined} />
        <div className="px-5 pb-5">
          <WorkflowBar id={a.id} status={a.status} capabilities={user.capabilities} canDelete={canEdit} />
          {a.reviewNote && (
            <p className="mt-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{t("announcements.reviewNote")}: </span>
              {a.reviewNote}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("announcements.title")} />
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">English</p>
              <p className="mt-1 font-semibold text-ink">{a.titleEn ?? "—"}</p>
              <p className="mt-2 text-sm whitespace-pre-line text-ink">{a.bodyEn ?? "—"}</p>
            </div>
            <div lang="mr">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">मराठी</p>
              <p className="mt-1 font-semibold text-ink">{a.titleMr ?? "—"}</p>
              <p className="mt-2 text-sm whitespace-pre-line text-ink">{a.bodyMr ?? "—"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("announcements.publishedTo")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{t("announcements.scopeKind")}</dt>
            <dd className="text-ink">{a.tenantId ? t("announcements.gpOwned") : t("announcements.isShared")}</dd>
            {!a.tenantId && (
              <>
                <dt className="text-muted">{t("announcements.targets")}</dt>
                <dd className="text-ink">{a.targets.map((x) => `${x.nameEn} (${t(`level.${x.level}`)})`).join(", ") || "—"}</dd>
              </>
            )}
            <dt className="text-muted">{t("announcements.pages")}</dt>
            <dd className="text-ink">{a.displayPages.map((p) => t(`pageNames.${p}`)).join(", ")}</dd>
            <dt className="text-muted">{t("announcements.publishAt")}</dt>
            <dd className="text-ink">{a.publishedAt ? formatDateTime(a.publishedAt, ui) : a.publishAt ? `${formatDateTime(a.publishAt, ui)} (${t("announcements.scheduled")})` : "—"}</dd>
            <dt className="text-muted">{t("announcements.expiresAt")}</dt>
            <dd className="text-ink">{formatDateTime(a.expiresAt, ui)}</dd>
            <dt className="text-muted">{tc("updated")}</dt>
            <dd className="text-ink">{formatDateTime(a.updatedAt, ui)}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
