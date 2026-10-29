import { Pencil, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CurrentUserDto, SchemeDto, SchemeLevel } from "@/types/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { schemes } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { hasCapability } from "@/lib/session";

const LEVELS: SchemeLevel[] = ["CENTRAL", "STATE", "DISTRICT"];
const LIMIT = 100;

/**
 * "Featured Schemes" card of the Schemes editor (Figma): Central / State / District tabs with counts,
 * the schemes this website can show (its own plus shared ones), add and edit links. Schemes keep
 * their own draft, review and publish workflow on /admin/schemes/:id.
 */
export async function SchemesManager({ user, tenantId, basePath, level }: { user: CurrentUserDto; tenantId: string; basePath: string; level?: string }) {
  const [t, tp, tc, locale, cookie] = await Promise.all([getTranslations("admin"), getTranslations("public"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;
  const active: SchemeLevel = LEVELS.includes(level as SchemeLevel) ? (level as SchemeLevel) : "CENTRAL";

  const pages = await Promise.all(LEVELS.map((l) => schemes.list({ level: l, limit: LIMIT }, { cookie })));
  // The API scopes the list to the actor; a super admin sees every GP, so keep this website's and shared schemes.
  const forSite = (rows: SchemeDto[]) => rows.filter((s) => s.tenantId === null || s.tenantId === tenantId);
  const byLevel = new Map(LEVELS.map((l, i) => [l, { rows: forSite(pages[i]!.data), more: !!pages[i]!.page.nextCursor }] as const));
  const current = byLevel.get(active)!;
  const canCreate = hasCapability(user, "content:edit") || hasCapability(user, "content:share");

  const columns: Column<SchemeDto>[] = [
    {
      key: "name",
      header: t("schemesUi.schemeName"),
      cell: (s) => (
        <div>
          <Link href={`/admin/schemes/${s.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
            {pickText(pair(s.nameEn, s.nameMr), ui, "—")}
          </Link>
          <p className="text-xs text-muted">{s.tenantId ? t("schemesUi.gpOwned") : t("announcements.isShared")}</p>
        </div>
      ),
    },
    { key: "status", header: tc("status"), cell: (s) => <StatusPill status={s.status} label={t(`contentStatus.${s.status}`)} /> },
    { key: "beneficiaries", header: tp("beneficiaries"), cell: (s) => s.beneficiaryCount?.toLocaleString("en-IN") ?? "—", className: "text-muted" },
    { key: "amount", header: t("schemesUi.amountDisbursed"), cell: (s) => (s.amountDisbursed ? `₹ ${Number(s.amountDisbursed).toLocaleString("en-IN")}` : "—"), className: "text-muted" },
    { key: "updated", header: tc("updated"), cell: (s) => formatDate(s.updatedAt, ui), className: "text-muted" },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (s) =>
        canCreate ? (
          <Link href={`/admin/schemes/${s.id}/edit`} aria-label={tc("edit")} className="inline-flex rounded p-1 text-muted hover:bg-surface-soft hover:text-primary">
            <Pencil className="size-4" aria-hidden />
          </Link>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={t("schemesUi.managementTitle")}
        description={t("schemesUi.managementDesc")}
        actions={
          canCreate ? (
            <Link href="/admin/schemes/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("schemesUi.create")}
            </Link>
          ) : null
        }
      />
      <div role="tablist" className="flex gap-6 border-b border-line px-5">
        {LEVELS.map((l) => {
          const entry = byLevel.get(l)!;
          return (
            <Link
              key={l}
              role="tab"
              aria-selected={l === active}
              href={`${basePath}?level=${l}`}
              scroll={false}
              className={cn("-mb-px border-b-2 px-1 py-3 text-sm font-semibold", l === active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}
            >
              {tp(`schemeLevel.${l}`)} ({entry.rows.length}
              {entry.more ? "+" : ""})
            </Link>
          );
        })}
      </div>
      <DataTable columns={columns} rows={current.rows} rowKey={(s) => s.id} emptyMessage={tc("noResults")} />
      {current.more && (
        <p className="px-5 py-3 text-xs text-muted">
          {t("schemesUi.showingFirst", { n: current.rows.length })}{" "}
          <Link href={`/admin/schemes?level=${active}`} className="font-semibold text-primary hover:underline">
            {t("schemesUi.viewAll")}
          </Link>
        </p>
      )}
    </Card>
  );
}
