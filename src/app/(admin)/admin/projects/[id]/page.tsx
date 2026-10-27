import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentWorkflowBar } from "@/components/admin/ContentWorkflowBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { EDITABLE_STATUSES, adminMediaUrl, projects } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, tp, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  let p;
  try {
    p = await projects.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const editable = EDITABLE_STATUSES.includes(p.status);
  const canEdit = hasCapability(user, "content:edit");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={p.nameEn || p.nameMr || "—"}
        description={[tp(`projectStage.${p.stage}`), p.year, p.wardNo ? `${tp("ward")} ${p.wardNo}` : null].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={p.status} label={t(`contentStatus.${p.status}`)} />
            {editable && canEdit && (
              <Link href={`/admin/projects/${p.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-button border border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-soft">
                <Pencil className="size-4" aria-hidden /> {tc("edit")}
              </Link>
            )}
          </div>
        }
      />
      <Card className="mb-5">
        <CardHeader title={t("announcements.workflow")} description={!editable ? t("announcements.locked", { status: t(`contentStatus.${p.status}`) }) : undefined} />
        <div className="px-5 pb-5">
          <ContentWorkflowBar resource="projects" id={p.id} status={p.status} capabilities={user.capabilities} canDelete={canEdit} listPath="/admin/projects" />
          {p.reviewNote && (
            <p className="mt-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{t("announcements.reviewNote")}: </span>
              {p.reviewNote}
            </p>
          )}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("projects")} />
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">English</p>
              <p className="mt-2 text-sm whitespace-pre-line text-ink">{p.descriptionEn ?? "—"}</p>
              {p.outcomeEn && <p className="mt-3 rounded-input bg-success-soft px-3 py-2 text-xs text-success">{p.outcomeEn}</p>}
            </div>
            <div lang="mr">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">मराठी</p>
              <p className="mt-2 text-sm whitespace-pre-line text-ink">{p.descriptionMr ?? "—"}</p>
              {p.outcomeMr && <p className="mt-3 rounded-input bg-success-soft px-3 py-2 text-xs text-success">{p.outcomeMr}</p>}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("schemesUi.details")} />
          {p.coverImageId && (
            // eslint-disable-next-line @next/next/no-img-element -- admin-only media served by the backend
            <img src={adminMediaUrl(p.coverImageId)} alt="" className="mx-5 mb-4 aspect-[16/9] rounded-input object-cover" />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{tp("budget")}</dt>
            <dd className="text-ink">{p.budget ? `₹ ${Number(p.budget).toLocaleString("en-IN")}` : "—"}</dd>
            <dt className="text-muted">{tp("familiesBenefited")}</dt>
            <dd className="text-ink">{p.familiesBenefited?.toLocaleString("en-IN") ?? "—"}</dd>
            <dt className="text-muted">{tc("updated")}</dt>
            <dd className="text-ink">{formatDateTime(p.updatedAt, ui)}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
