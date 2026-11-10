import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PublicTenantDto } from "@/types/api";
import { Emblem } from "@/components/ui/Emblem";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PUBLIC_NAV, pageHref } from "@/config/public-nav";
import { FIGMA_CHROME } from "@/content/figma-chrome";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { PublicNavMenu } from "./PublicNavMenu";

/**
 * Figma public chrome (375:13463 + 375:13479): 70px green strip (emblem, GOVERNMENT OF MAHARASHTRA, English | Marathi
 * pills, phone, email and a search pill separated by thin lines) and a white navbar (105px emblem, "Gram Panchayat",
 * 32px name, tagline, 14px semibold menu in 135px slots).
 */
export async function PublicHeader({ tenant }: { tenant: PublicTenantDto }) {
  const locale = (await getLocale()) as UiLocale;
  const t = await getTranslations();
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, tenant.slug);
  // Settings first; the design's values fill in whatever the website has not set yet.
  const contact = { phone: FIGMA_CHROME.phone, email: FIGMA_CHROME.email, ...tenant.settings.contact };
  const tagline = tenant.settings.branding?.tagline;
  const taglineText = tagline?.en || tagline?.mr ? pickText(pair(tagline.en ?? "", tagline.mr ?? ""), locale, "") : pickText(FIGMA_CHROME.tagline, locale, "");

  const groups = PUBLIC_NAV.map((g) => ({
    label: g.labelKey ? t(`public.nav.${g.labelKey}`) : null,
    links: g.pages.map((p) => ({ href: pageHref(tenant.slug, p), label: t(`public.${p}`) })),
  }));

  const divider = <span aria-hidden className="hidden h-[39px] w-px bg-white/60 md:block" />;

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-primary-alt text-white">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-[81px]">
          <div className="flex items-center gap-4">
            <Emblem size={32} framed />
            <span className="text-[12px] font-semibold uppercase">{t("common.govt")}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="pill" />
            {contact.phone && (
              <>
                {divider}
                <a href={`tel:${contact.phone}`} className="hidden text-[12px] font-medium whitespace-nowrap hover:underline md:block">
                  {contact.phone}
                </a>
              </>
            )}
            {contact.email && (
              <>
                {divider}
                <a href={`mailto:${contact.email}`} className="hidden text-[12px] font-medium hover:underline lg:block">
                  {contact.email}
                </a>
              </>
            )}
            {divider}
            <form action={`/${tenant.slug}/search`} method="get" role="search" className="hidden h-[38px] w-[197px] items-center rounded-full border border-white pr-1 pl-4 md:flex">
              <input
                type="search"
                name="q"
                placeholder={t("common.search")}
                aria-label={t("common.search")}
                className="min-w-0 flex-1 bg-transparent text-[12px] font-medium tracking-[0.4px] text-white outline-none placeholder:text-white/70"
              />
              <button type="submit" aria-label={t("common.search")} className="flex size-[31px] items-center justify-center rounded-full hover:bg-white/10">
                <Search className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-1 sm:px-8 lg:px-[52px]">
          <Link href={`/${tenant.slug}`} className="flex items-center">
            <Emblem size={105} framed className="hidden lg:block" />
            <Emblem size={64} framed className="lg:hidden" />
            <span className="flex flex-col gap-1 p-2">
              <span className="text-[16px] leading-normal text-black">{t("common.gramPanchayat")}</span>
              <span className="text-[28px] leading-normal font-medium text-primary-alt lg:text-[32px]">{name}</span>
              {taglineText && <span className="text-[12px] leading-normal text-black">{taglineText}</span>}
            </span>
          </Link>
          <PublicNavMenu groups={groups} menuLabel={t("public.menu")} search={{ action: `/${tenant.slug}/search`, label: t("common.search"), placeholder: t("public.searchPlaceholder") }} />
        </div>
      </div>
    </header>
  );
}
