import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthSplitLayout variant="plain">
      <h1 className="text-[28px] leading-9 font-bold text-ink-strong">{t("forgotTitle")}</h1>
      <p className="mt-2 mb-7 text-[14px] leading-5 text-muted">{t("forgotHint")}</p>
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
