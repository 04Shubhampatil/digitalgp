import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthSplitLayout>
      <h1 className="font-inter text-3xl font-bold text-ink-strong">{t("forgotTitle")}</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">{t("forgotHint")}</p>
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
