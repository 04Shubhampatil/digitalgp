import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { GrievanceActions } from "@/components/admin/grievances/GrievanceActions";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { grievances } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Grievance" };

export default async function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  let g;
  try {
    g = await grievances.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={g.trackingCode} description={`${g.category} · ${formatDateTime(g.createdAt, ui)}`} actions={<StatusPill status={g.status} label={t(`grievanceStatus.${g.status}`)} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("grievancesUi.complaint")} />
          <div className="px-5 pb-5">
            <p className="text-sm whitespace-pre-line text-ink">{g.description}</p>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-4 text-sm">
              <dt className="text-muted">{t("grievancesUi.citizen")}</dt>
              <dd className="text-ink">{g.citizenName}</dd>
              <dt className="text-muted">{t("users.phone")}</dt>
              <dd className="text-ink">{g.citizenPhone ?? "—"}</dd>
              <dt className="text-muted">{t("users.email")}</dt>
              <dd className="text-ink">{g.citizenEmail ?? "—"}</dd>
            </dl>
            {g.resolutionNote && (
              <p className="mt-4 rounded-input bg-success-soft px-4 py-3 text-sm text-ink">
                <span className="font-semibold">{t("grievancesUi.resolutionNote")}: </span>
                {g.resolutionNote}
              </p>
            )}
          </div>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader title={tc("actions")} />
            <div className="px-5 pb-5">
              <GrievanceActions grievance={g} canManage={hasCapability(user, "grievance:manage")} />
            </div>
          </Card>
          <Card>
            <CardHeader title={t("grievancesUi.timeline")} />
            <ol className="grid gap-3 px-5 pb-5 text-sm">
              {g.events.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p className="font-semibold text-ink">
                    {e.fromStatus ? `${t(`grievanceStatus.${e.fromStatus}`)} → ` : ""}
                    {t(`grievanceStatus.${e.toStatus}`)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(e.createdAt, ui)}
                    {e.actorName ? ` · ${e.actorName}` : ""}
                  </p>
                  {e.note && <p className="mt-1 text-xs text-ink">{e.note}</p>}
                </li>
              ))}
              {g.events.length === 0 && <li className="text-muted">—</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
