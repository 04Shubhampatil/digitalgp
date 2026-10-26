import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/ui/Emblem";

/**
 * Root of the base host (no tenant in the URL). Public Gram Panchayat sites live at
 * /<slug> or <slug>.<base-host>; staff sign in at /login.
 */
export default async function RootPage() {
  const t = await getTranslations();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Emblem size={96} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("common.govt")}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{t("common.systemName")}</h1>
        <p className="mt-2 text-muted">{t("common.department")}</p>
      </div>
      <Link
        href="/login"
        className="rounded-button bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        {t("auth.signIn")}
      </Link>
    </main>
  );
}
