import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { PublicTenantDto } from "@/types/api";
import { Emblem } from "@/components/ui/Emblem";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";

/**
 * Placeholder contact details from the Figma footer, shown only while the Gram Panchayat has not
 * filled in its own contact settings. Remove once real data exists.
 */
const FIGMA_CONTACT = {
  address: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501",
  phone: "+919767694340",
  email: "savardarigrampanchayat@gmail.com",
};

function Facebook() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877f2" />
      <path d="M13.3 19v-6.2h2.1l.3-2.5h-2.4V8.8c0-.7.2-1.2 1.2-1.2h1.3V5.4c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.6v2.5h2.1V19z" fill="#fff" />
    </svg>
  );
}
function Instagram() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <defs>
        <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#feda75" />
          <stop offset=".4" stopColor="#d62976" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig)" />
      <rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16" cy="8" r="0.9" fill="#fff" />
    </svg>
  );
}
function YouTube() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-8" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="5" fill="#f00" />
      <path d="M10 9l5 3-5 3z" fill="#fff" />
    </svg>
  );
}

/** Figma footer (375:12692): white with tricolour wash; identity / contact / quick links, then copyright row. */
export async function PublicFooter({ tenant }: { tenant: PublicTenantDto }) {
  const locale = (await getLocale()) as UiLocale;
  const t = await getTranslations();
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, tenant.slug);
  const contact = tenant.settings.contact ?? {};
  const social = tenant.settings.social ?? {};
  const address = contact.address || FIGMA_CONTACT.address;
  const phone = contact.phone || FIGMA_CONTACT.phone;
  const email = contact.email || FIGMA_CONTACT.email;
  const year = new Date().getFullYear();

  const quick = (["home", "about", "services", "announcements", "schemes", "about", "grievance", "contact"] as const).map((p, i) => ({
    href: pageHref(tenant.slug, p),
    label: [t("public.home"), t("public.about"), t("public.services"), t("public.announcements"), t("public.schemes"), t("public.officials"), t("public.grievance"), t("public.contact")][i] ?? "",
  }));

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-black/10 bg-white text-[#1b1b1b]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,153,51,0.14),transparent_45%),radial-gradient(ellipse_at_top_right,rgba(19,136,8,0.12),transparent_40%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[46px]">
        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0 lg:divide-x lg:divide-black/15">
          <div className="lg:pr-10">
            <div className="flex items-center gap-4">
              <Emblem size={44} />
              <div>
                <p className="text-[18px] leading-7 font-bold text-[#135130]">
                  {t("common.gramPanchayat")} {name}
                </p>
                <p className="text-[12px] text-[#135130]">{t("common.govt")}</p>
              </div>
            </div>
            <address className="mt-6 text-[13px] leading-[21px] not-italic whitespace-pre-line">{address}</address>
          </div>

          <div className="lg:px-10">
            <h2 className="text-[12px] font-bold tracking-wide text-[#135130] uppercase">{t("public.contactUs")}</h2>
            <ul className="mt-4 space-y-4 text-[13px] leading-[21px]">
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
              {contact.hours && (
                <li className="pl-8 text-[#414141]">
                  {t("public.officeHours")}: {contact.hours}
                </li>
              )}
            </ul>
            <h2 className="mt-5 text-[12px] font-bold tracking-wide text-[#135130] uppercase">{t("public.followUs")}</h2>
            <div className="mt-2 flex items-center gap-3">
              <a href={social.facebook || "#"} target="_blank" rel="noopener" aria-label="Facebook">
                <Facebook />
              </a>
              <a href={social.instagram || "#"} target="_blank" rel="noopener" aria-label="Instagram">
                <Instagram />
              </a>
              <a href={social.youtube || "#"} target="_blank" rel="noopener" aria-label="YouTube">
                <YouTube />
              </a>
            </div>
          </div>

          <nav aria-label={t("public.quickLinks")} className="lg:pl-10">
            <h2 className="text-[12px] font-bold tracking-wide text-[#135130] uppercase">{t("public.quickLinks")}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              {quick.map((l, i) => (
                <li key={i}>
                  <Link href={l.href} className="inline-flex items-center gap-2 hover:underline">
                    <ChevronRight className="size-3" aria-hidden /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-black/10 py-5 text-[13px] sm:flex-row">
          <p>
            © {year} {t("common.gramPanchayat")} {name}. {t("public.allRightsReserved")}
          </p>
          <Emblem size={28} />
          <p>{t("public.designedHosted")}</p>
        </div>
      </div>
    </footer>
  );
}
