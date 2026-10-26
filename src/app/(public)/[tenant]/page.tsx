import { getLocale, getTranslations } from "next-intl/server";
import { renderSections } from "@/components/public/sections";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { isApiError } from "@/lib/api/client";
import { getPublicPage } from "@/lib/api/public";
import { loadTenant } from "@/lib/public-tenant";

/** Public home: renders the published `home` sections in registry order. */
export default async function TenantHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const [tenant, locale, t] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public")]);

  let page = null;
  try {
    page = await getPublicPage(slug, "home");
  } catch (err) {
    if (!isApiError(err, "NOT_FOUND")) throw err;
  }

  const sections = page ? renderSections(page, slug, locale as UiLocale).filter(Boolean) : [];
  if (sections.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-ink">
          {t("welcomeTo", { name: pickText(pair(tenant.nameEn, tenant.nameMr), locale as UiLocale, slug) })}
        </h1>
        <p className="mt-3 text-muted">{t("noContent")}</p>
      </section>
    );
  }
  return <>{sections}</>;
}
