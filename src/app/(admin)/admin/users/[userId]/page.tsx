import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/users/UserManagement";
import { UserStatusButton } from "@/components/admin/users/UserStatusButton";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "User" };

/** User profile: account status, profile and assignment management (GET /users/:id). */
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
  const canManage = hasCapability(me, "user:manage");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={user.name}
        description={user.email}
        actions={canManage ? <UserStatusButton userId={user.id} status={user.status} disabled={isSelf} /> : null}
      />
      <Card className="mb-4">
        <CardHeader title={t("profile")} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
          <dt className="text-muted">{tc("status")}</dt>
          <dd className="font-semibold text-ink">{t(`users.userStatus.${user.status}`)}</dd>
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
      <UserManagement user={user} scope={me.assignments} canManage={canManage} />
    </div>
  );
}
