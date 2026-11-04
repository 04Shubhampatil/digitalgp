import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentWorkflowBar } from "@/components/admin/ContentWorkflowBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { EDITABLE_STATUSES, adminMediaUrl, projects, schemes, successStories } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Success story" };

function Bi({ label, en, mr }: { label: string; en: string | null; mr: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <p className="text-sm whitespace-pre-line text-ink">{en ?? "—"}</p>
        <p lang="mr" className="text-sm whitespace-pre-line text-ink">
          {mr ?? "—"}
        </p>
      </div>
    </div>
  );
}

export default async function SuccessStoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  let s;
  try {
    s = await successStories.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const [project, scheme] = await Promise.all([
    s.projectId ? projects.get(s.projectId, { cookie }).catch(() => null) : null,
    s.schemeId ? schemes.get(s.schemeId, { cookie }).catch(() => null) : null,
  ]);
  const editable = EDITABLE_STATUSES.includes(s.status);
  const canEdit = hasCapability(user, "content:edit");
  const consentMissing = !s.consentConfirmed && !!(s.personName || s.photoId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={s.titleEn || s.titleMr || "—"}
        description={`${t("storiesUi.titleSingular")} · ${t(`pageNames.${s.pageKey}`)}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={s.status} label={t(`contentStatus.${s.status}`)} />
            {editable && canEdit && (
              <Link href={`/admin/success-stories/${s.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-button border border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-soft">
                <Pencil className="size-4" aria-hidden /> {tc("edit")}
              </Link>
            )}
          </div>
        }
      />
      <Card className="mb-5">
        <CardHeader title={t("announcements.workflow")} description={!editable ? t("announcements.locked", { status: t(`contentStatus.${s.status}`) }) : undefined} />
        <div className="px-5 pb-5">
          {consentMissing && editable && <p className="mb-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">{t("storiesUi.consentNeeded")}</p>}
          <ContentWorkflowBar resource="successStories" id={s.id} status={s.status} capabilities={user.capabilities} canDelete={canEdit} listPath="/admin/success-stories" />
          {s.reviewNote && (
            <p className="mt-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{t("announcements.reviewNote")}: </span>
              {s.reviewNote}
            </p>
          )}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("storiesUi.story")} />
          <div className="grid gap-5 px-5 pb-5">
            <Bi label={t("storiesUi.summary")} en={s.summaryEn} mr={s.summaryMr} />
            <Bi label={t("storiesUi.body")} en={s.bodyEn} mr={s.bodyMr} />
            {(s.quoteEn || s.quoteMr) && <Bi label={t("storiesUi.quote")} en={s.quoteEn} mr={s.quoteMr} />}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("storiesUi.person")} />
          {s.photoId && (
            // eslint-disable-next-line @next/next/no-img-element -- admin-only media served by the backend
            <img src={adminMediaUrl(s.photoId)} alt="" className="mx-5 mb-4 aspect-[4/3] rounded-input object-cover" />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{t("storiesUi.personName")}</dt>
            <dd className="text-ink">{s.personName ?? "—"}</dd>
            <dt className="text-muted">{t("storiesUi.personRole")}</dt>
            <dd className="text-ink">{[s.personRoleEn, s.personRoleMr].filter(Boolean).join(" / ") || "—"}</dd>
            <dt className="text-muted">{t("storiesUi.location")}</dt>
            <dd className="text-ink">{s.location ?? "—"}</dd>
            <dt className="text-muted">{t("storiesUi.consentShort")}</dt>
            <dd className={s.consentConfirmed ? "font-semibold text-success" : consentMissing ? "font-semibold text-warning" : "text-ink"}>{s.consentConfirmed ? tc("yes") : consentMissing ? t("storiesUi.consentMissing") : tc("no")}</dd>
            <dt className="text-muted">{t("storiesUi.project")}</dt>
            <dd>{project ? <Link href={`/admin/projects/${project.id}`} className="text-primary hover:underline">{project.nameEn || project.nameMr}</Link> : "—"}</dd>
            <dt className="text-muted">{t("storiesUi.scheme")}</dt>
            <dd>{scheme ? <Link href={`/admin/schemes/${scheme.id}`} className="text-primary hover:underline">{scheme.nameEn || scheme.nameMr}</Link> : "—"}</dd>
            <dt className="text-muted">{t("storiesUi.sortOrder")}</dt>
            <dd className="text-ink">{s.sortOrder}</dd>
            <dt className="text-muted">{tc("updated")}</dt>
            <dd className="text-ink">{formatDateTime(s.updatedAt, ui)}</dd>
            {s.publishedAt && (
              <>
                <dt className="text-muted">{t("contentStatus.PUBLISHED")}</dt>
                <dd className="text-ink">{formatDateTime(s.publishedAt, ui)}</dd>
              </>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}
