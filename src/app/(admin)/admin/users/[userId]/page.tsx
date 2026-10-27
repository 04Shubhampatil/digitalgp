import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { UserStatusButton } from "@/components/admin/users/UserStatusButton";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "User" };

/** Figma 11 "Block Admin Profile": account details + assignments (GET /users/:id). */
export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const [{ userId }, t, tc, locale, cookie] = await Promise.all([params, getTranslations("admin"), getTranslations("common"), getLocale(), cookieHeader()]);
  const ui = locale as UiLocale;

  let user;
  try {
    user = await users.get(userId, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  const isSelf = user.id === me.user.id;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={user.name}
        description={user.email}
        actions={hasCapability(me, "user:manage") ? <UserStatusButton userId={user.id} status={user.status} disabled={isSelf} /> : null}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={t("profile")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{tc("status")}</dt>
            <dd className="font-semibold text-ink">{t(`users.userStatus.${user.status}`)}</dd>
            <dt className="text-muted">{t("users.phone")}</dt>
            <dd className="text-ink">{user.phone ?? "—"}</dd>
            <dt className="text-muted">{t("users.locale")}</dt>
            <dd className="text-ink">{user.locale}</dd>
            <dt className="text-muted">{t("users.lastLogin")}</dt>
            <dd className="text-ink">{formatDateTime(user.lastLoginAt, ui)}</dd>
            <dt className="text-muted">{tc("created")}</dt>
            <dd className="text-ink">{formatDateTime(user.createdAt, ui)}</dd>
            {user.mustResetPassword && (
              <>
                <dt className="text-muted">{t("users.password")}</dt>
                <dd className="font-semibold text-warning">{t("users.mustReset")}</dd>
              </>
            )}
          </dl>
        </Card>
        <Card>
          <CardHeader title={t("users.assignments")} />
          <ul className="divide-y divide-line px-5 pb-5">
            {user.assignments.map((a) => (
              <li key={a.id} className="py-3 text-sm">
                <p className="font-semibold text-ink">
                  {t(`role.${a.role}`)}
                  {a.revokedAt && <span className="ml-2 text-xs font-normal text-danger">({t("users.revoked")})</span>}
                </p>
                <p className="text-xs text-muted">
                  {t(`level.${a.unitLevel}`)} · {a.unitNameEn}
                  {a.unitNameMr ? ` / ${a.unitNameMr}` : ""}
                </p>
                {a.modules.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {a.modules.map((m) => `${t(`moduleNames.${m.moduleKey}`)}${m.canWrite ? "" : ` (${tc("open")})`}`).join(", ")}
                  </p>
                )}
              </li>
            ))}
            {user.assignments.length === 0 && <li className="py-3 text-sm text-muted">—</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
