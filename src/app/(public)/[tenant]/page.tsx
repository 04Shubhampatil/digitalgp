import { getLocale, getTranslations } from "next-intl/server";
import { renderSections } from "@/components/public/sections";
import { homeLeadersFromAbout, withFallback } from "@/content/fallback";
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

  let shown = withFallback("home", page);
  if (!shown.sections.some((s) => s.sectionKey === "leaders")) {
    // Final home design: "Our Leaders" sits under the stats strip. When the home page has no leaders section of its own,
    // it shows the leaders of the About page (the same people, edited in one place).
    const about = await getPublicPage(slug, "about").catch(() => null);
    const leaders = homeLeadersFromAbout(about);
    if (leaders) shown = { ...shown, sections: [...shown.sections, leaders].sort((a, b) => a.sortOrder - b.sortOrder) };
  }
  const sections = renderSections(shown, slug, locale as UiLocale, pickText(pair(tenant.nameEn, tenant.nameMr), locale as UiLocale, slug)).filter(Boolean);
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
