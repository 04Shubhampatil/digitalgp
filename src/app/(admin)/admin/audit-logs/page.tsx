import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CursorPager } from "@/components/admin/CursorPager";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { audit, users } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Audit logs" };
type Search = Promise<{ actorId?: string; action?: string; from?: string; to?: string; cursor?: string }>;

const toIso = (d?: string, endOfDay = false) => (d ? new Date(`${d}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);
const selectCls = "h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[11px] font-semibold tracking-wide text-muted uppercase";
/** "announcement.publish" → "Announcement publish" */
const humanise = (a: string) => {
  const s = a.replace(/[._-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Figma "Audit Logs": filter card (user, action type, date range) and an overview table of who did what, to which
 * record and when. Scope-filtered by the backend; operators see only their own actions.
 */
export default async function AuditLogsPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ actorId, action, from, to, cursor }, t, tc, locale, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const canUsers = hasCapability(user, "user:read");
  const [page, staff] = await Promise.all([
    audit.list({ actorId: actorId || undefined, action: action || undefined, from: toIso(from), to: toIso(to, true), cursor, limit: 50 }, { cookie }),
    canUsers ? users.list({ limit: 100 }, { cookie }).catch(() => null) : Promise.resolve(null),
  ]);
  const nameOf = new Map((staff?.data ?? []).map((u) => [u.id, u.name]));
  nameOf.set(user.user.id, user.user.name);
  const when = (iso: string) => {
    const d = new Date(iso);
    const loc = ui === "mr" ? "mr-IN" : "en-IN";
    return `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })}, ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("auditLogs")} description={t("auditUi.subtitleLong")} />

      <form method="get" action="/admin/audit-logs" className="mb-5 rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-[17px] font-bold text-ink">{t("auditUi.filterTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_auto_auto]">
          <label>
            <span className={labelCls}>{t("auditUi.user")}</span>
            <select name="actorId" defaultValue={actorId ?? ""} className={selectCls}>
              <option value="">{t("auditUi.allUsers")}</option>
              {[...nameOf.entries()].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{t("auditUi.actionType")}</span>
            <input name="action" list="audit-actions" defaultValue={action ?? ""} placeholder={t("auditUi.allActions")} className={selectCls} />
            <datalist id="audit-actions">
              {[...new Set(page.data.map((l) => l.action))].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <div>
            <span className={labelCls}>{t("auditUi.dateRange")}</span>
            <div className="flex items-center gap-2">
              <input type="date" name="from" defaultValue={from} aria-label={t("auditUi.from")} className={selectCls} />
              <input type="date" name="to" defaultValue={to} aria-label={t("auditUi.to")} className={selectCls} />
            </div>
          </div>
          <div className="flex items-end">
            <button type="submit" className="h-11 rounded-button bg-primary px-8 text-sm font-semibold text-white hover:bg-primary-hover">
              {tc("apply")}
            </button>
          </div>
          <div className="flex items-end">
            <Link href="/admin/audit-logs" className="inline-flex h-11 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
              {t("auditUi.clear")}
            </Link>
          </div>
        </div>
      </form>

      <Card>
        <h2 className="px-5 pt-5 pb-3 text-[19px] font-bold text-ink">{t("auditUi.overviewTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                <th className="px-5 py-2.5">{t("auditUi.user")}</th>
                <th className="px-3 py-2.5">{t("auditUi.role")}</th>
                <th className="px-3 py-2.5">{t("auditUi.action")}</th>
                <th className="px-3 py-2.5">{t("auditUi.target")}</th>
                <th className="px-3 py-2.5">{t("auditUi.time")}</th>
                <th className="px-5 py-2.5">{t("auditUi.change")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {page.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    {tc("noResults")}
                  </td>
                </tr>
              )}
              {page.data.map((l) => (
                <tr key={l.id} className="align-top hover:bg-surface-soft/60">
                  <td className="px-5 py-3.5 font-semibold text-ink">{(l.actorId && nameOf.get(l.actorId)) || "—"}</td>
                  <td className="px-3 py-3.5 text-muted">{l.actorRole ? t(`role.${l.actorRole}`) : "—"}</td>
                  <td className="px-3 py-3.5 text-muted" title={l.action}>
                    {humanise(l.action)}
                  </td>
                  <td className="px-3 py-3.5 text-muted">
                    {l.entityType}
                    {l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap text-muted">{when(l.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {l.before || l.after ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-semibold text-primary">{t("auditUi.view")}</summary>
                        <pre className="mt-2 max-h-64 max-w-md overflow-auto rounded-input bg-surface-table p-2 text-[11px] whitespace-pre-wrap">{JSON.stringify({ before: l.before, after: l.after }, null, 2)}</pre>
                      </details>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CursorPager basePath="/admin/audit-logs" params={{ actorId, action, from, to, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }} />
      </Card>
    </div>
  );
}
