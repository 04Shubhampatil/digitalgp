import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PublicTenantDto } from "@/types/api";
import { Emblem } from "@/components/ui/Emblem";
import { pageHref } from "@/config/public-nav";
import { FIGMA_CHROME } from "@/content/figma-chrome";
import type { UiLocale } from "@/i18n/config";
import { marathiFor } from "@/i18n/mr-fallback";
import { pair, pickText } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import { FacebookIcon, InstagramIcon, XIcon, YouTubeIcon } from "./SocialIcons";

/** Placeholder contact details (shared with the header), shown only while the website's own settings are empty. */
const FIGMA_CONTACT = FIGMA_CHROME;


/** Figma footer (375:12692): white with tricolour wash; identity / contact / quick links, then copyright row. */
export async function PublicFooter({ tenant }: { tenant: PublicTenantDto }) {
  const locale = (await getLocale()) as UiLocale;
  const t = await getTranslations();
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, tenant.slug);
  const contact = tenant.settings.contact ?? {};
  const social = tenant.settings.social ?? {};
  const rawAddress = contact.address || FIGMA_CONTACT.address;
  const addressText = locale === "mr" ? (marathiFor(rawAddress) ?? rawAddress) : rawAddress;
  // The design stacks the address ("Gram Panchayat: Savardari, / Taluka: Khed, / District: Pune – 410501").
  const address = addressText.includes("\n") ? addressText : addressText.replace(/,\s+/g, ",\n");
  const phone = contact.phone || FIGMA_CONTACT.phone;
  const email = contact.email || FIGMA_CONTACT.email;
  const year = new Date().getFullYear();
  const hasSocial = !!(social.facebook || social.instagram || social.youtube || social.twitter);

  // Figma quick links, row by row in two columns (Home | About Us, Citizen Services | Notices & GRs, …).
  const quick = [
    { href: pageHref(tenant.slug, "home"), label: t("public.home") },
    { href: pageHref(tenant.slug, "about"), label: t("public.about") },
    { href: pageHref(tenant.slug, "services"), label: t("public.services") },
    { href: pageHref(tenant.slug, "announcements"), label: t("public.footerNotices") },
    { href: pageHref(tenant.slug, "schemes"), label: t("public.schemes") },
    // No separate officials page: the About page's administration section lists them.
    { href: resolveHref("page:about#about-structure", tenant.slug), label: t("public.officials") },
    { href: resolveHref("page:contact#feedback-form", tenant.slug), label: t("public.footerFeedback") },
    { href: pageHref(tenant.slug, "contact"), label: t("public.contact") },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-black/10 bg-white text-[#1b1b1b]">
      {/* Figma "image 127": tricolour wash with the faded Ashoka chakra top-right (60% opacity). */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[257px] bg-[url('/images/figma/pages/footer-bg.png')] bg-[length:1440px_auto] bg-top bg-no-repeat opacity-60 xl:bg-[length:100%_auto]" />
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[46px]">
        <div className="grid gap-10 py-8 lg:grid-cols-[456px_401px_minmax(0,1fr)] lg:gap-0 lg:divide-x lg:divide-black/15 lg:min-h-[308px] lg:pt-[40px] lg:pb-[58px]">
          <div className="lg:pr-10 lg:pl-0">
            <div className="flex items-center gap-4">
              <Emblem size={58} />
              <div>
                <p className="text-[21px] leading-7 font-bold text-[#135130]">
                  {t("common.gramPanchayat")} {name}
                </p>
                <p className="text-[14.5px] text-[#135130]">{t("common.govt")}</p>
              </div>
            </div>
            <address className="mt-5 text-[15px] leading-[21px] not-italic whitespace-pre-line">{address}</address>
          </div>

          <div className="lg:pr-6 lg:pl-9">
            <h2 className="text-[14px] font-bold tracking-wide text-[#135130] uppercase">{t("public.contactUs")}</h2>
            <ul className="mt-4 space-y-3.5 text-[15px] leading-[21px]">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-[#135130]" aria-hidden />
                <span className="whitespace-pre-line">{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-5 shrink-0 text-[#135130]" aria-hidden />
                <a href={`tel:${phone}`} className="hover:underline">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-5 shrink-0 text-[#135130]" aria-hidden />
                <a href={`mailto:${email}`} className="break-all hover:underline">
                  {email}
                </a>
              </li>
            </ul>
            {hasSocial && <h2 className="mt-5 text-[14px] font-bold tracking-wide text-[#135130] uppercase">{t("public.followUs")}</h2>}
            {/* Only networks with a URL in the website settings are shown; a dead "#" icon is worse than none. */}
            {hasSocial && <div className="mt-2 flex items-center gap-3">
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener" aria-label="Facebook">
                  <FacebookIcon className="size-[34px]" />
                </a>
              )}
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                  <InstagramIcon className="size-[34px]" gradientId="ig-footer" />
                </a>
              )}
              {social.youtube && (
                <a href={social.youtube} target="_blank" rel="noopener" aria-label="YouTube">
                  <YouTubeIcon className="h-[26px] w-[38px]" />
                </a>
              )}
              {social.twitter && (
                <a href={social.twitter} target="_blank" rel="noopener" aria-label="X (Twitter)">
                  <XIcon className="size-[34px]" />
                </a>
              )}
            </div>}
          </div>

          <nav aria-label={t("public.quickLinks")} className="lg:pl-11">
            <h2 className="text-[14px] font-bold tracking-wide text-[#135130] uppercase">{t("public.quickLinks")}</h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-[13px] text-[15px] lg:grid-cols-[250px_1fr]">
              {quick.map((l, i) => (
                <li key={i}>
                  <Link href={l.href} className="inline-flex items-center gap-2 hover:underline">
                    <ChevronRight className="size-3.5" aria-hidden /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-black/10 py-4 text-[15px] sm:flex-row">
          <p>
            © {year} {t("common.gramPanchayat")} {name}. {t("public.allRightsReserved")}
          </p>
          <Emblem size={38} />
          <p>{t("public.designedHosted")}</p>
        </div>
      </div>
    </footer>
  );
}
