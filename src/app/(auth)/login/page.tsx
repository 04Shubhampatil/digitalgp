import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/admin") ? next : "/admin/dashboard";

  // Already signed in → straight to the dashboard.
  if (await getCurrentUser()) redirect(redirectTo);

  const t = await getTranslations("auth");
  return (
    <AuthSplitLayout>
      <h1 className="font-inter text-3xl font-bold text-ink-strong">{t("welcomeBack")}</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">{t("signInHint")}</p>
      <LoginForm redirectTo={redirectTo} />
      <div className="mt-8 flex items-center justify-between border-t border-line pt-6 text-sm">
        <span className="text-muted">{t("troubleSigningIn")}</span>
        <a href="mailto:support@digitalgp.in" className="font-semibold text-primary hover:underline">
          {t("contactSupport")}
        </a>
      </div>
    </AuthSplitLayout>
  );
}
