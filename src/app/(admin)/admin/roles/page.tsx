import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@/types/api";
import { CAPABILITIES, ROLES, ROLE_MATRIX, type Capability } from "@/config/role-matrix";
import { PageHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Roles & Permissions" };
type Search = Promise<{ role?: string }>;

const TINT: Record<Role, string> = {
  SUPER_ADMIN: "bg-primary text-white",
  TALUKA_ADMIN: "bg-info-soft text-info",
  BLOCK_ADMIN: "bg-info-soft text-info",
  GP_ADMIN: "bg-success-soft text-success",
  DATA_ENTRY_OPERATOR: "bg-warning-soft text-warning",
};

/**
 * Figma "Roles & Permissions": role list on the left, permission matrix on the right with Allowed / Not allowed /
 * Own activity pills. Read-only: the matrix is fixed in backend code (src/lib/permissions.ts), so there is no save action.
 */
export default async function RolesPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ role }, t] = await Promise.all([searchParams, getTranslations("admin")]);
  const selected: Role = ROLES.includes(role as Role) ? (role as Role) : "SUPER_ADMIN";

  const pill = (r: Role, cap: Capability) => {
    if (ROLE_MATRIX[r].has(cap)) return <span className="inline-flex min-w-[88px] justify-center rounded-pill bg-success-soft px-3 py-1 text-[11px] font-semibold text-success">{t("rolesUi.allowed")}</span>;
    if (cap === "audit:read" && ROLE_MATRIX[r].has("audit:read-own")) return <span className="inline-flex min-w-[88px] justify-center rounded-pill bg-warning-soft px-3 py-1 text-[11px] font-semibold text-warning">{t("rolesUi.ownActivity")}</span>;
    return <span className="inline-flex min-w-[88px] justify-center rounded-pill bg-danger-soft px-3 py-1 text-[11px] font-semibold text-danger">{t("rolesUi.notAllowed")}</span>;
  };
  // "audit:read-own" is shown as the "Own activity" state of "audit:read".
  const rows = CAPABILITIES.filter((c) => c !== "audit:read-own");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("roles")} description={t("rolesUi.subtitleLong")} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.2fr)]">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[17px] font-bold text-ink">{t("rolesUi.platformRoles")}</h2>
          <ul className="grid gap-3">
            {ROLES.map((r) => (
              <li key={r}>
                <Link href={`/admin/roles?role=${r}`} aria-current={r === selected ? "true" : undefined} className={cn("flex items-center gap-3 rounded-[10px] border p-4 transition-colors", r === selected ? "border-primary/40 bg-success-soft" : "border-line bg-surface hover:bg-surface-soft")}>
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", r === selected ? TINT.SUPER_ADMIN : "bg-track text-muted")}>{t(`role.${r}`).charAt(0)}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{t(`role.${r}`)}</span>
                    <span className="block text-xs text-muted">{t(`rolesUi.desc.${r}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-[17px] font-bold text-ink">{t("rolesUi.matrix")}</h2>
          <p className="mt-1 mb-4 text-xs text-muted">{t("rolesUi.fixedNote")}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-surface-table text-left text-[11px] font-semibold text-muted">
                  <th scope="col" className="px-4 py-2.5">
                    {t("rolesUi.permission")}
                  </th>
                  {ROLES.map((r) => (
                    <th key={r} scope="col" className={cn("px-3 py-2.5 text-center", r === selected && "text-primary")}>
                      {t(`role.${r}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((cap) => (
                  <tr key={cap}>
                    <th scope="row" className="px-4 py-3.5 text-left font-medium text-ink">
                      {t(`rolesUi.cap.${cap.replace(":", "_")}`)}
                    </th>
                    {ROLES.map((r) => (
                      <td key={r} className={cn("px-3 py-3.5 text-center", r === selected && "bg-success-soft/40")}>
                        {pill(r, cap)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
