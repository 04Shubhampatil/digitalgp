import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PublicTenantDto } from "@/types/api";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";

/** Figma Footer (380px, dark green): Contact Us / Quick Links / Follow Us + ownership line. */
export async function PublicFooter({ tenant }: { tenant: PublicTenantDto }) {
  const locale = (await getLocale()) as UiLocale;
  const t = await getTranslations();
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, tenant.slug);
  const contact = tenant.settings.contact ?? {};
  const social = tenant.settings.social ?? {};
  const year = new Date().getFullYear();

  const quick = (["home", "about", "services", "schemes", "announcements", "grievance", "contact"] as const).map((p) => ({
    href: pageHref(tenant.slug, p),
    label: t(`public.${p}`),
  }));

  return (
    <footer className="mt-16 bg-primary-deep text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-xs text-cream/70">{t("common.gramPanchayat")}</p>
          <p className="text-xl font-bold">{name}</p>
          <h2 className="mt-5 text-sm font-semibold text-accent uppercase">{t("public.contactUs")}</h2>
          <address className="mt-2 space-y-1 text-sm not-italic text-cream/90">
            {contact.address && <p className="whitespace-pre-line">{contact.address}</p>}
            {contact.phone && (
              <p>
                <a href={`tel:${contact.phone}`} className="hover:underline">
                  {contact.phone}
                </a>
              </p>
            )}
            {contact.email && (
              <p>
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </p>
            )}
            {contact.hours && (
              <p>
                <span className="text-cream/70">{t("public.officeHours")}: </span>
                {contact.hours}
              </p>
            )}
          </address>
        </div>

        <nav aria-label={t("public.quickLinks")}>
          <h2 className="text-sm font-semibold text-accent uppercase">{t("public.quickLinks")}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {quick.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${tenant.slug}/sitemap`} className="hover:underline">
                {t("public.sitemap")}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-accent uppercase">{t("public.followUs")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {social.facebook && (
              <li>
                <a href={social.facebook} rel="noopener" target="_blank" className="hover:underline">
                  Facebook
                </a>
              </li>
            )}
            {social.instagram && (
              <li>
                <a href={social.instagram} rel="noopener" target="_blank" className="hover:underline">
                  Instagram
                </a>
              </li>
            )}
            {social.youtube && (
              <li>
                <a href={social.youtube} rel="noopener" target="_blank" className="hover:underline">
                  YouTube
                </a>
              </li>
            )}
            {!social.facebook && !social.instagram && !social.youtube && <li className="text-cream/60">—</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-edge">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-cream/70 sm:px-6">
          © {year} {t("common.gramPanchayat")} {name} · {t("common.govt")} · {t("public.designedBy")}
        </p>
      </div>
    </footer>
  );
}
