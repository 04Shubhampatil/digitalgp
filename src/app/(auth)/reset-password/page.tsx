import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";

export const metadata: Metadata = { title: "Reset password" };

/** Landing page of the emailed link: APP_ORIGIN/reset-password?token=… */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, t] = await Promise.all([searchParams, getTranslations("auth")]);
  return (
    <AuthSplitLayout>
      <h1 className="font-inter text-3xl font-bold text-ink-strong">{t("resetTitle")}</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">{t("resetHint")}</p>
      {token ? (
        <PasswordForm mode={{ kind: "reset", token }} />
      ) : (
        <div className="flex flex-col gap-4">
          <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
            {t("resetInvalid")}
          </p>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
      )}
    </AuthSplitLayout>
  );
}
