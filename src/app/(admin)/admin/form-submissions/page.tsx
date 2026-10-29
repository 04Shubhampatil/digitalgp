import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { FormSubmissionDto } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { formSubmissions, tenants } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Contact form submissions" };
type Search = Promise<{ tenantId?: string; kind?: string; cursor?: string }>;

/** Feedback and volunteer applications from the public Contact page (GET /form-submissions). */
export default async function FormSubmissionsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:review")) redirect("/admin/dashboard");
  const [{ tenantId: tenantParam, kind: kindParam, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const sites = (await tenants.list({ limit: 100 }, { cookie })).data;
  const tenant = sites.find((s) => s.id === tenantParam) ?? sites[0];
  const kind = kindParam === "VOLUNTEER" ? "VOLUNTEER" : "FEEDBACK";

  const [summary, page] = tenant
    ? await Promise.all([formSubmissions.summary(tenant.id, { cookie }), formSubmissions.list({ tenantId: tenant.id, kind, cursor, limit: 25 }, { cookie })])
    : [null, null];

  const columns: Column<FormSubmissionDto>[] = [
    { key: "name", header: t("formSubmissions.name"), cell: (s) => <span className="font-semibold text-ink">{s.name}</span> },
    {
      key: "contact",
      header: t("formSubmissions.contact"),
      cell: (s) => (
        <div className="text-xs text-muted">
          {s.email && <p>{s.email}</p>}
          {s.phone && <p>{s.phone}</p>}
        </div>
      ),
    },
    ...(kind === "VOLUNTEER" ? [{ key: "category", header: t("formSubmissions.category"), cell: (s: FormSubmissionDto) => s.category ?? "—" }] : []),
    { key: "message", header: t("formSubmissions.message"), cell: (s) => <p className="max-w-md whitespace-pre-line text-sm text-ink">{s.message ?? "—"}</p> },
    { key: "created", header: t("formSubmissions.received"), cell: (s) => formatDateTime(s.createdAt, ui), className: "text-muted" },
  ];

  const tabClass = (active: boolean) => `rounded-button px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-white" : "border border-line-strong bg-surface text-ink hover:bg-surface-select"}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("formSubmissions.title")} description={t("formSubmissions.subtitle")} />
      <form method="get" action="/admin/form-submissions" className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface px-5 py-4">
        <label className="flex min-w-60 flex-col gap-1.5">
          <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("formSubmissions.website")}</span>
          <select name="tenantId" defaultValue={tenant?.id} className="h-11 rounded-card border border-line-strong bg-surface-select px-3 text-sm text-ink outline-none focus:border-primary">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {ui === "mr" ? s.nameMr || s.nameEn : s.nameEn}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="kind" value={kind} />
        <button type="submit" className="h-11 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
          {tc("apply")}
        </button>
      </form>
      {tenant && summary && page && (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            {(["FEEDBACK", "VOLUNTEER"] as const).map((k) => {
              const n = k === "FEEDBACK" ? summary.feedback : summary.volunteer;
              return (
                <a key={k} href={`/admin/form-submissions?tenantId=${tenant.id}&kind=${k}`} className={tabClass(kind === k)}>
                  {t(k === "FEEDBACK" ? "formSubmissions.feedback" : "formSubmissions.volunteer")} · {n.total} {t("formSubmissions.total")} ({n.last30Days} {t("formSubmissions.last30")})
                </a>
              );
            })}
          </div>
          <Card>
            <CardHeader title={t(kind === "FEEDBACK" ? "formSubmissions.feedback" : "formSubmissions.volunteer")} />
            <DataTable columns={columns} rows={page.data} rowKey={(s) => s.id} emptyMessage={t("formSubmissions.empty")} />
            <CursorPager basePath="/admin/form-submissions" params={{ tenantId: tenant.id, kind, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }} />
          </Card>
          <p className="mt-3 text-xs text-muted">{t("formSubmissions.retention")}</p>
        </>
      )}
    </div>
  );
}
