import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { TenantDto, TenantStatus } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { CreateWebsiteDialog } from "@/components/admin/websites/CreateWebsiteDialog";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { tenants } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "GP Websites" };

const STATUSES: TenantStatus[] = ["DRAFT", "PUBLISHED", "SUSPENDED"];
type Search = Promise<{ status?: string; q?: string; cursor?: string }>;

/** Figma 03 "GP Website Management" on GET /tenants (scope-filtered by the backend). */
export default async function WebsitesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ status, q, cursor }, t, tc, locale, cookie] = await Promise.all([
    searchParams,
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    cookieHeader(),
  ]);
  const ui = locale as UiLocale;
  const statusFilter = STATUSES.includes(status as TenantStatus) ? (status as TenantStatus) : undefined;
  const page = await tenants.list({ status: statusFilter, q, cursor, limit: 25 }, { cookie });

  const columns: Column<TenantDto>[] = [
    {
      key: "gp",
      header: t("websites.gp"),
      cell: (tn) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-[6px] bg-success-soft text-xs font-bold text-primary">
            {tn.nameEn.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-ink">{pickText(pair(tn.nameEn, tn.nameMr), ui, tn.slug)}</p>
            <p className="text-xs text-muted">/{tn.slug}{tn.customDomain ? ` · ${tn.customDomain}` : ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: tc("status"),
      cell: (tn) => <StatusPill status={tn.status} label={t(`tenantStatus.${tn.status}`)} />,
    },
    { key: "updated", header: t("websites.lastUpdated"), cell: (tn) => formatDate(tn.updatedAt, ui), className: "text-muted" },
    {
      key: "actions",
      header: tc("actions"),
      align: "right",
      cell: (tn) => (
        <Link
          href={`/admin/websites/${tn.id}`}
          className="inline-flex rounded-button border border-line px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft"
        >
          {t("websites.manage")}
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("websites.title")}
        description={t("websites.subtitle")}
        actions={hasCapability(user, "tenant:create") ? <CreateWebsiteDialog assignments={user.assignments} /> : null}
      />

      <div className="mb-5">
        <FilterBar action="/admin/websites" applyLabel={tc("apply")} searchPlaceholder={t("websites.searchPlaceholder")} searchValue={q}>
          <FilterSelect
            name="status"
            label={t("websites.statusFilter")}
            value={statusFilter}
            allLabel={tc("all")}
            options={STATUSES.map((s) => ({ value: s, label: t(`tenantStatus.${s}`) }))}
          />
        </FilterBar>
      </div>

      <Card>
        <CardHeader title={t("websites.title")} />
        <DataTable columns={columns} rows={page.data} rowKey={(tn) => tn.id} emptyMessage={tc("noResults")} />
        <CursorPager
          basePath="/admin/websites"
          params={{ status: statusFilter, q, cursor }}
          nextCursor={page.page.nextCursor}
          shown={page.data.length}
          labels={{ showing: tc("showing"), first: tc("firstPage"), next: tc("nextPage") }}
        />
      </Card>
    </div>
  );
}
