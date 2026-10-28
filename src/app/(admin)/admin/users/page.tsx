import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role, UserDto, UserStatus } from "@/types/api";
import { CursorPager } from "@/components/admin/CursorPager";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { users } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime, initials } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Users & Roles" };

const ROLES: Role[] = ["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"];
const STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED"];
type Search = Promise<{ role?: string; status?: string; q?: string; cursor?: string }>;

/** Figma 08 "Block Admin Management", generalised to every role the caller may see (GET /users). */
export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ role, status, q, cursor }, t, tc, locale, cookie] = await Promise.all([
    searchParams,
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    cookieHeader(),
  ]);
  const ui = locale as UiLocale;
  const roleFilter = ROLES.includes(role as Role) ? (role as Role) : undefined;
  const statusFilter = STATUSES.includes(status as UserStatus) ? (status as UserStatus) : undefined;
  const page = await users.list({ role: roleFilter, status: statusFilter, q, cursor, limit: 25 }, { cookie });

  const columns: Column<UserDto>[] = [
    {
      key: "name",
      header: tc("name"),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-primary">{initials(u.name)}</span>
          <div>
            <Link href={`/admin/users/${u.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
              {u.name}
            </Link>
            <p className="text-xs text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: t("users.roles"),
      cell: (u) => (
        <ul className="flex flex-wrap gap-1">
          {u.assignments
            .filter((a) => !a.revokedAt)
            .map((a) => (
              <li key={a.id} className="rounded-pill bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info">
                {t(`role.${a.role}`)} · {a.unitNameEn}
              </li>
            ))}
        </ul>
      ),
    },
    {
      key: "status",
      header: tc("status"),
      cell: (u) => (
        <span className={u.status === "ACTIVE" ? "rounded-pill bg-success-soft px-3 py-1 text-[11px] font-semibold text-success" : "rounded-pill bg-danger-soft px-3 py-1 text-[11px] font-semibold text-danger"}>
          {t(`users.userStatus.${u.status}`)}
        </span>
      ),
    },
    { key: "login", header: t("users.lastLogin"), cell: (u) => formatDateTime(u.lastLoginAt, ui), className: "text-muted" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          hasCapability(user, "user:manage") ? (
            <Link href="/admin/users/new" className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden /> {t("users.create")}
            </Link>
          ) : null
        }
      />
      <div className="mb-5">
        <FilterBar action="/admin/users" applyLabel={tc("apply")} searchPlaceholder={t("users.searchPlaceholder")} searchValue={q}>
          <FilterSelect name="role" label={t("users.roleFilter")} value={roleFilter} allLabel={tc("all")} options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
          <FilterSelect name="status" label={t("users.statusFilter")} value={statusFilter} allLabel={tc("all")} options={STATUSES.map((s) => ({ value: s, label: t(`users.userStatus.${s}`) }))} />
        </FilterBar>
      </div>
      <Card>
        <CardHeader title={t("users.title")} />
        <DataTable columns={columns} rows={page.data} rowKey={(u) => u.id} emptyMessage={tc("noResults")} />
        <CursorPager
          basePath="/admin/users"
          params={{ role: roleFilter, status: statusFilter, q, cursor }}
          nextCursor={page.page.nextCursor}
          shown={page.data.length}
          labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }}
        />
      </Card>
    </div>
  );
}
