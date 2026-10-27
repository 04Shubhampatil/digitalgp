import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CAPABILITIES, ROLES, ROLE_MATRIX } from "@/config/role-matrix";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Roles & Permissions" };

/**
 * Figma 18 "Roles & Permissions" — read-only. The matrix is fixed in backend code
 * (src/lib/permissions.ts, open decision #9); when it becomes editable this page gets a save action.
 */
export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("roles")} description={t("rolesUi.subtitle")} />
      <Card>
        <CardHeader title={t("rolesUi.matrix")} description={t("rolesUi.fixedNote")} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-surface-table text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="px-4 py-2.5">
                  {t("rolesUi.capability")}
                </th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-center">
                    {t(`role.${r}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {CAPABILITIES.map((cap) => (
                <tr key={cap}>
                  <th scope="row" className="px-4 py-2.5 text-left font-mono text-xs font-medium text-ink">
                    {cap}
                  </th>
                  {ROLES.map((r) => {
                    const allowed = ROLE_MATRIX[r].has(cap);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <span
                          aria-label={allowed ? t("rolesUi.allowed") : t("rolesUi.notAllowed")}
                          className={allowed ? "inline-flex rounded-pill bg-success-soft px-3 py-1 text-success" : "inline-flex rounded-pill bg-track px-3 py-1 text-muted"}
                        >
                          {allowed ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
