import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * First admin screen: proves the session + /auth/me round-trip and shows the user's scope.
 * The role-specific dashboards from Figma (Super Admin / Block Admin / GP CMS) replace this
 * once the hierarchy and tenant screens land.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("admin");

  const active = user.assignments.filter((a) => !a.revokedAt);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[25px] font-bold text-ink">{t("welcome", { name: user.user.name })}</h1>
      <p className="mt-1 text-sm text-muted">{user.user.email}</p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-[17px] font-bold text-ink">{t("yourAssignments")}</h2>
          <ul className="mt-3 divide-y divide-line">
            {active.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-ink">{t(`role.${a.role}`)}</p>
                  <p className="text-xs text-muted">
                    {t(`level.${a.unitLevel}`)} · {a.unitNameEn}
                    {a.unitNameMr ? ` / ${a.unitNameMr}` : ""}
                  </p>
                </div>
                {a.modules.length > 0 && (
                  <p className="text-xs text-muted">
                    {a.modules.map((m) => `${m.moduleKey}${m.canWrite ? "" : " (read)"}`).join(", ")}
                  </p>
                )}
              </li>
            ))}
            {active.length === 0 && <li className="py-2 text-sm text-muted">—</li>}
          </ul>
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-[17px] font-bold text-ink">{t("capabilities")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.capabilities.map((c) => (
              <li key={c} className="rounded-pill bg-success-soft px-3 py-1 text-[11px] font-semibold text-success">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-sm text-muted">{t("comingSoon")}</p>
    </div>
  );
}
