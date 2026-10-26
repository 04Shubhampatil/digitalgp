import { Mail, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PublicTenantDto } from "@/types/api";
import { Emblem } from "@/components/ui/Emblem";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PUBLIC_NAV, pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { PublicNavMenu } from "./PublicNavMenu";

/** Figma public chrome: 70px government strip + white navbar with emblem and grouped menu. */
export async function PublicHeader({ tenant }: { tenant: PublicTenantDto }) {
  const locale = (await getLocale()) as UiLocale;
  const t = await getTranslations();
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, tenant.slug);
  const contact = tenant.settings.contact ?? {};

  const groups = PUBLIC_NAV.map((g) => ({
    label: g.labelKey ? t(`public.nav.${g.labelKey}`) : null,
    links: g.pages.map((p) => ({ href: pageHref(tenant.slug, p), label: t(`public.${p}`) })),
  }));

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-primary text-white">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
          <div className="flex items-center gap-3">
            <Emblem size={32} />
            <span className="font-semibold tracking-wide uppercase">{t("common.govt")}</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone className="size-3.5" aria-hidden /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Mail className="size-3.5" aria-hidden /> {contact.email}
              </a>
            )}
            <LanguageSwitcher />
          </div>
          <div className="md:hidden">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={`/${tenant.slug}`} className="flex items-center gap-3">
            <Emblem size={48} />
            <span>
              <span className="block text-xs text-muted">{t("common.gramPanchayat")}</span>
              <span className="block text-2xl leading-tight font-bold text-primary">{name}</span>
            </span>
          </Link>
          <PublicNavMenu groups={groups} menuLabel={t("public.menu")} />
        </div>
      </div>
    </header>
  );
}
