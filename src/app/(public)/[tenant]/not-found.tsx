import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Emblem } from "@/components/ui/Emblem";

export default async function TenantNotFound() {
  const t = await getTranslations();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Emblem size={72} />
      <h1 className="text-2xl font-bold text-ink">{t("public.siteNotFound")}</h1>
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        {t("common.govt")}
      </Link>
    </main>
  );
}
