import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import type { UiLocale } from "@/i18n/config";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [t, ta, locale] = await Promise.all([getTranslations("auth"), getTranslations("admin"), getLocale()]);
  const ui = locale as UiLocale;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={user.user.name} description={user.user.email} />
      {user.user.mustResetPassword && (
        <p role="alert" className="mb-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
          {t("mustResetNotice")}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={ta("profile")} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-sm">
            <dt className="text-muted">{ta("users.phone")}</dt>
            <dd className="text-ink">{user.user.phone ?? "—"}</dd>
            <dt className="text-muted">{ta("users.locale")}</dt>
            <dd className="text-ink">{user.user.locale}</dd>
            <dt className="text-muted">{ta("users.lastLogin")}</dt>
            <dd className="text-ink">{formatDateTime(user.user.lastLoginAt, ui)}</dd>
            <dt className="text-muted">{ta("users.assignments")}</dt>
            <dd className="text-ink">
              {user.assignments
                .filter((a) => !a.revokedAt)
                .map((a) => `${ta(`role.${a.role}`)} · ${a.unitNameEn}`)
                .join(", ") || "—"}
            </dd>
          </dl>
        </Card>
        <Card>
          <CardHeader title={t("changePassword")} />
          <div className="px-5 pb-5">
            <PasswordForm mode={{ kind: "change" }} />
          </div>
        </Card>
      </div>
    </div>
  );
}
