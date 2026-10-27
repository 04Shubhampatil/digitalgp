import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentWorkflowBar } from "@/components/admin/ContentWorkflowBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { EDITABLE_STATUSES, schemes } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Scheme" };

function Bi({ en, mr }: { en: string | null; mr: string | null }) {
  return (
  <div className="grid gap-3 md:grid-cols-2">
    <p className="text-sm whitespace-pre-line text-ink">{en ?? "—"}</p>
    <p lang="mr" className="text-sm whitespace-pre-line text-ink">
      {mr ?? "—"}
    </p>
  </div>
  );
}


export default async function SchemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, tp, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  let s;
  try {
    s = await schemes.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const editable = EDITABLE_STATUSES.includes(s.status);
  const canEdit = s.tenantId ? hasCapability(user, "content:edit") : hasCapability(user, "content:share");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={s.nameEn || s.nameMr || "—"}
        description={`${tp(`schemeLevel.${s.level}`)}${s.tenantId ? "" : ` · ${t("announcements.isShared")}`}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={s.status} label={t(`contentStatus.${s.status}`)} />
            {editable && canEdit && (
              <Link href={`/admin/schemes/${s.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-button border border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-soft">
                <Pencil className="size-4" aria-hidden /> {tc("edit")}
              </Link>
            )}
          </div>
        }
      />
      <Card className="mb-5">
        <CardHeader title={t("announcements.workflow")} description={!editable ? t("announcements.locked", { status: t(`contentStatus.${s.status}`) }) : undefined} />
        <div className="px-5 pb-5">
          <ContentWorkflowBar resource="schemes" id={s.id} status={s.status} capabilities={user.capabilities} canDelete={canEdit} listPath="/admin/schemes" />
          {s.reviewNote && (
            <p className="mt-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{t("announcements.reviewNote")}: </span>
              {s.reviewNote}
            </p>
          )}
        </div>
      </Card>
      <div className="grid gap-4">
        <Card>
          <CardHeader title={t("schemesUi.descriptionEn").replace(/ \(.*\)$/, "")} />
          <div className="grid gap-5 px-5 pb-5">
            <Bi en={s.descriptionEn} mr={s.descriptionMr} />
            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{tp("eligibility")}</p>
              <Bi en={s.eligibilityEn} mr={s.eligibilityMr} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{tp("howToApply")}</p>
              <Bi en={s.processEn} mr={s.processMr} />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("schemesUi.details")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{tp("beneficiaries")}</dt>
            <dd className="text-ink">{s.beneficiaryCount?.toLocaleString("en-IN") ?? "—"}</dd>
            <dt className="text-muted">{tp("amountDisbursed")}</dt>
            <dd className="text-ink">{s.amountDisbursed ? `₹ ${Number(s.amountDisbursed).toLocaleString("en-IN")}` : "—"}</dd>
            <dt className="text-muted">{t("schemesUi.externalUrl")}</dt>
            <dd>
              {s.externalUrl ? (
                <a href={s.externalUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
                  {s.externalUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
            {!s.tenantId && (
              <>
                <dt className="text-muted">{t("announcements.targets")}</dt>
                <dd className="text-ink">{s.targets.map((x) => `${x.nameEn} (${t(`level.${x.level}`)})`).join(", ") || "—"}</dd>
              </>
            )}
            <dt className="text-muted">{tc("updated")}</dt>
            <dd className="text-ink">{formatDateTime(s.updatedAt, ui)}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
