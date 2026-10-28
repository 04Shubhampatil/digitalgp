import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { PublicPageDto, PublicTenantDto } from "@/types/api";
import { isPageKey, type PageKey } from "@/config/pages";
import { GrievanceSubmitForm, GrievanceTrackForm } from "@/components/public/GrievanceForms";
import { PublicAnnouncements } from "@/components/public/PublicAnnouncements";
import { PublicProjects } from "@/components/public/PublicProjects";
import { PublicSchemes } from "@/components/public/PublicSchemes";
import { renderSections } from "@/components/public/sections";
import { withFallback } from "@/content/fallback";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { isApiError } from "@/lib/api/client";
import { getPublicPage } from "@/lib/api/public";
import { loadTenant } from "@/lib/public-tenant";

type Params = Promise<{ tenant: string; pageKey: string }>;

/** Pages whose content comes from a dedicated API in addition to (or instead of) published sections. */
const DATA_PAGES: Partial<Record<PageKey, true>> = { announcements: true };

async function loadPage(slug: string, pageKey: PageKey): Promise<PublicPageDto | null> {
  try {
    return await getPublicPage(slug, pageKey);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug, pageKey } = await params;
  if (!isPageKey(pageKey) || pageKey === "home") return {};
  const [page, locale] = await Promise.all([loadPage(slug, pageKey), getLocale()]);
  const ui = locale as UiLocale;
  if (!page) return {};
  return {
    title: pickText(pair(page.seo.titleEn, page.seo.titleMr), ui) || undefined,
    description: pickText(pair(page.seo.descriptionEn, page.seo.descriptionMr), ui) || undefined,
  };
}

/**
 * Generic public page: published sections (from the section registry) plus the page's data block.
 * A page that is disabled or has nothing published shows an honest empty state instead of 404,
 * so navigation stays stable while content is being authored.
 */
export default async function TenantPage({ params }: { params: Params }) {
  const { tenant: slug, pageKey } = await params;
  if (!isPageKey(pageKey) || pageKey === "home") notFound();
  const [tenant, locale, t] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public")]);
  const ui = locale as UiLocale;
  const page = await loadPage(slug, pageKey);
  const sections = renderSections(withFallback(pageKey, page), slug, ui, pickText(pair(tenant.nameEn, tenant.nameMr), ui, slug)).filter(Boolean);

  const dataBlock = DATA_PAGES[pageKey] ? <DataBlock pageKey={pageKey} slug={slug} locale={ui} tenant={tenant} /> : null;

  return (
    <>
      {sections.length === 0 && (
        <header className="bg-primary-deep py-14 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">{pickText(pair(tenant.nameEn, tenant.nameMr), ui, slug)}</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{t(pageKey)}</h1>
          </div>
        </header>
      )}
      {sections}
      {dataBlock && <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">{dataBlock}</div>}
      {sections.length === 0 && !dataBlock && (
        <p className="mx-auto max-w-7xl px-4 py-16 text-center text-muted sm:px-6">{t("noContent")}</p>
      )}
    </>
  );
}

async function DataBlock({ pageKey, slug, locale, tenant }: { pageKey: PageKey; slug: string; locale: UiLocale; tenant: PublicTenantDto }) {
  const t = await getTranslations("public");
  switch (pageKey) {
    case "announcements":
      return <PublicAnnouncements slug={slug} locale={locale} page="announcements" limit={50} />;
    case "schemes":
      return <PublicSchemes slug={slug} locale={locale} />;
    case "projects":
      return <PublicProjects slug={slug} locale={locale} />;
    case "grievance":
      return (
        <div className="grid gap-10 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <h2 className="mb-4 text-2xl font-bold text-ink">{t("grievanceForm.registerTitle")}</h2>
            <GrievanceSubmitForm slug={slug} />
          </section>
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-2xl font-bold text-ink">{t("grievanceForm.trackTitle")}</h2>
            <GrievanceTrackForm slug={slug} />
          </section>
        </div>
      );
    case "contact": {
      const c = tenant.settings.contact ?? {};
      const s = tenant.settings.social ?? {};
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-card border border-line bg-surface p-6">
            <h2 className="text-xl font-bold text-ink">{t("contactUs")}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {c.address && (
                <div>
                  <dt className="text-xs text-muted uppercase">{t("address")}</dt>
                  <dd className="whitespace-pre-line text-ink">{c.address}</dd>
                </div>
              )}
              {c.phone && (
                <div>
                  <dt className="text-xs text-muted uppercase">{t("phone")}</dt>
                  <dd>
                    <a href={`tel:${c.phone}`} className="text-primary hover:underline">
                      {c.phone}
                    </a>
                  </dd>
                </div>
              )}
              {c.email && (
                <div>
                  <dt className="text-xs text-muted uppercase">{t("email")}</dt>
                  <dd>
                    <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                      {c.email}
                    </a>
                  </dd>
                </div>
              )}
              {c.hours && (
                <div>
                  <dt className="text-xs text-muted uppercase">{t("officeHours")}</dt>
                  <dd className="text-ink">{c.hours}</dd>
                </div>
              )}
              {!c.address && !c.phone && !c.email && <dd className="text-muted">{t("noContent")}</dd>}
            </dl>
          </section>
          <section className="rounded-card border border-line bg-surface p-6">
            <h2 className="text-xl font-bold text-ink">{t("followUs")}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {s.facebook && (
                <li>
                  <a href={s.facebook} target="_blank" rel="noopener" className="text-primary hover:underline">
                    Facebook
                  </a>
                </li>
              )}
              {s.instagram && (
                <li>
                  <a href={s.instagram} target="_blank" rel="noopener" className="text-primary hover:underline">
                    Instagram
                  </a>
                </li>
              )}
              {s.youtube && (
                <li>
                  <a href={s.youtube} target="_blank" rel="noopener" className="text-primary hover:underline">
                    YouTube
                  </a>
                </li>
              )}
              {!s.facebook && !s.instagram && !s.youtube && <li className="text-muted">—</li>}
            </ul>
            <p className="mt-6 text-sm text-muted">{t("grievanceHint")}</p>
            <a href={`/${slug}/grievance`} className="mt-2 inline-flex rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
              {t("grievance")}
            </a>
          </section>
        </div>
      );
    }
    default:
      return null;
  }
}
