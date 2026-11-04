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
const KINDS = ["FEEDBACK", "VOLUNTEER", "TREE_ADOPTION"] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, string> = { FEEDBACK: "formSubmissions.feedback", VOLUNTEER: "formSubmissions.volunteer", TREE_ADOPTION: "formSubmissions.treeAdoption" };

/** Tree adoption `details` → readable pairs (treeCount, species, preferredLocation; anything else as-is). */
function detailPairs(details: Record<string, unknown> | null): [string, string][] {
  if (!details) return [];
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

/** Feedback, volunteer applications and tree adoption requests from the public site (GET /form-submissions). */
export default async function FormSubmissionsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:review")) redirect("/admin/dashboard");
  const [{ tenantId: tenantParam, kind: kindParam, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const sites = (await tenants.list({ limit: 100 }, { cookie })).data;
  const tenant = sites.find((s) => s.id === tenantParam) ?? sites[0];
  const kind: Kind = (KINDS as readonly string[]).includes(kindParam ?? "") ? (kindParam as Kind) : "FEEDBACK";
  const detailLabel = (k: string) => ((["treeCount", "species", "preferredLocation"] as const).includes(k as "treeCount") ? t(`formSubmissions.detail.${k as "treeCount"}`) : k);

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
    ...(kind === "FEEDBACK"
      ? [
          { key: "subject", header: t("formSubmissions.subject"), cell: (s: FormSubmissionDto) => <span className="text-ink">{s.subject ?? "—"}</span> },
          {
            key: "rating",
            header: t("formSubmissions.rating"),
            cell: (s: FormSubmissionDto) =>
              s.rating ? (
                <span className="whitespace-nowrap text-warning" aria-label={`${s.rating} / 5`} title={`${s.rating} / 5`}>
                  {"★".repeat(s.rating)}
                  <span className="text-track">{"★".repeat(5 - s.rating)}</span>
                </span>
              ) : (
                "—"
              ),
          },
        ]
      : []),
    ...(kind === "VOLUNTEER"
      ? [
          { key: "category", header: t("formSubmissions.category"), cell: (s: FormSubmissionDto) => s.category ?? "—" },
          { key: "area", header: t("formSubmissions.areaOfInterest"), cell: (s: FormSubmissionDto) => s.areaOfInterest ?? "—" },
        ]
      : []),
    ...(kind === "TREE_ADOPTION"
      ? [
          {
            key: "trees",
            header: t("formSubmissions.trees"),
            cell: (s: FormSubmissionDto) => (
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
                {detailPairs(s.details).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{detailLabel(k)}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ]
      : []),
    ...(kind !== "FEEDBACK" ? [{ key: "address", header: t("formSubmissions.address"), cell: (s: FormSubmissionDto) => <p className="max-w-48 text-xs whitespace-pre-line text-muted">{s.address ?? "—"}</p> }] : []),
    {
      key: "message",
      header: t("formSubmissions.message"),
      cell: (s) =>
        s.message && s.message.length > 140 ? (
          <details className="max-w-md text-sm">
            <summary className="cursor-pointer text-ink">{s.message.slice(0, 140)}…</summary>
            <p className="mt-1 whitespace-pre-line text-ink">{s.message}</p>
          </details>
        ) : (
          <p className="max-w-md whitespace-pre-line text-sm text-ink">{s.message ?? "—"}</p>
        ),
    },
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
            {KINDS.map((k) => {
              const n = k === "FEEDBACK" ? summary.feedback : k === "VOLUNTEER" ? summary.volunteer : summary.treeAdoption;
              if (!n) return null;
              return (
                <a key={k} href={`/admin/form-submissions?tenantId=${tenant.id}&kind=${k}`} className={tabClass(kind === k)}>
                  {t(KIND_LABEL[k])} · {n.total} {t("formSubmissions.total")} ({n.last30Days} {t("formSubmissions.last30")})
                </a>
              );
            })}
          </div>
          <Card>
            <CardHeader title={t(KIND_LABEL[kind])} />
            <DataTable columns={columns} rows={page.data} rowKey={(s) => s.id} emptyMessage={t("formSubmissions.empty")} />
            <CursorPager basePath="/admin/form-submissions" params={{ tenantId: tenant.id, kind, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }} />
          </Card>
          <p className="mt-3 text-xs text-muted">{t("formSubmissions.retention")}</p>
        </>
      )}
    </div>
  );
}
