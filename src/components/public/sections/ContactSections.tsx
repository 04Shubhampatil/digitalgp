import { Clock, Globe, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { loadTenant } from "@/lib/public-tenant";
import { MailtoForm, type MailtoField } from "./MailtoForm";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;

/** Figma values shown only while the Gram Panchayat has not filled in its own contact settings. */
interface ContactData {
  heading?: B;
  phone?: string;
  email?: string;
  address?: B;
  hours?: B;
  labels?: { inquiries?: B; hours?: B; address?: B; follow?: B };
}

function Social({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href || "#"} target="_blank" rel="noopener" aria-label={label} className="flex size-9 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130] hover:bg-[#135130]/20">
      {children}
    </a>
  );
}

/** `contact-cards`: four info cards (inquiries, hours, address, social) fed by the website's contact settings. */
export async function ContactCardsSection({ slug, locale, data }: SectionProps) {
  const tenant = await loadTenant(slug);
  const c = tenant.settings.contact ?? {};
  const s = tenant.settings.social ?? {};
  const d = data as ContactData;
  const phone = c.phone || d.phone;
  const email = c.email || d.email;
  const address = c.address ? pickText({ en: c.address }, locale) : pickText(d.address, locale);
  const hours = c.hours ? pickText({ en: c.hours }, locale) : pickText(d.hours, locale);
  const L = d.labels ?? {};
  const card = "flex min-h-[269px] flex-col items-center rounded-[10px] bg-white px-6 py-8 text-center shadow-[0_0_14px_rgba(0,0,0,0.2)]";
  const ring = "flex size-[86px] items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]";
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <li className={card}>
            <span aria-hidden className={ring}>
              <Phone className="size-9" />
            </span>
            <h3 className="mt-5 text-[20px] font-bold text-black">{pickText(L.inquiries, locale)}</h3>
            {phone && (
              <a href={`tel:${phone}`} className="mt-3 text-[15px] text-black hover:underline">
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="mt-1 text-[15px] break-all text-black hover:underline">
                {email}
              </a>
            )}
          </li>
          <li className={card}>
            <span aria-hidden className={ring}>
              <Clock className="size-9" />
            </span>
            <h3 className="mt-5 text-[20px] font-bold text-black">{pickText(L.hours, locale)}</h3>
            <p className="mt-3 text-[15px] whitespace-pre-line text-black">{hours}</p>
          </li>
          <li className={card}>
            <span aria-hidden className={ring}>
              <MapPin className="size-9" />
            </span>
            <h3 className="mt-5 text-[20px] font-bold text-black">{pickText(L.address, locale)}</h3>
            <p className="mt-3 text-[15px] whitespace-pre-line text-black">{address}</p>
          </li>
          <li className={card}>
            <span aria-hidden className={ring}>
              <Globe className="size-9" />
            </span>
            <h3 className="mt-5 text-[20px] font-bold text-black">{pickText(L.follow, locale)}</h3>
            <div className="mt-5 flex gap-3">
              <Social href={s.facebook} label="Facebook">
                f
              </Social>
              <Social href={s.instagram} label="Instagram">
                ◎
              </Social>
              <Social href={s.youtube} label="YouTube">
                ▶
              </Social>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** `contact-feedback`: office map picture + feedback form (opens the visitor's mail app). */
export async function ContactFeedbackSection({ slug, locale, data }: SectionProps) {
  const tenant = await loadTenant(slug);
  const t = await getTranslations("public");
  const d = data as { mapHeading?: B; formHeading?: B; mapImage?: string; email?: string; submit?: B; fields?: { name: string; label: B; placeholder?: B; type?: MailtoField["type"]; span?: number }[] };
  const to = tenant.settings.contact?.email || d.email || "";
  const fields: MailtoField[] = (d.fields ?? []).map((f) => ({ name: f.name, label: pickText(f.label, locale), placeholder: pickText(f.placeholder, locale), type: f.type, span: f.span, required: f.name === "message" }));
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, slug);
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-8 lg:grid-cols-2 lg:px-[62px]">
        <div>
          <h2 className="mb-5 text-[30px] leading-[45px] font-semibold text-black">{pickText(d.mapHeading, locale)}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
          <img src={d.mapImage} alt="" className="w-full rounded-[10px] border border-black/15" loading="lazy" />
        </div>
        <div>
          <h2 className="mb-5 text-[30px] leading-[45px] font-semibold text-black">{pickText(d.formHeading, locale)}</h2>
          <div className="rounded-[10px] border border-black/20 bg-white p-6">
            <MailtoForm to={to} subject={`${name} — feedback`} fields={fields} submitLabel={pickText(d.submit, locale)} hint={t("mailtoHint")} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** `volunteer-form`: "Become a Volunteer" heading, four audience pictures and the registration form. */
export async function VolunteerFormSection({ slug, locale, data }: SectionProps) {
  const tenant = await loadTenant(slug);
  const t = await getTranslations("public");
  const d = data as { heading?: B; subheading?: B; images?: string[]; formHeading?: B; submit?: B; email?: string; fields?: { name: string; label: B; placeholder?: B; type?: MailtoField["type"]; options?: string[]; span?: number }[] };
  const to = tenant.settings.contact?.email || d.email || "";
  const fields: MailtoField[] = (d.fields ?? []).map((f) => ({ name: f.name, label: pickText(f.label, locale), placeholder: pickText(f.placeholder, locale), type: f.type, options: f.options, span: f.span, required: true }));
  const name = pickText(pair(tenant.nameEn, tenant.nameMr), locale, slug);
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <p className="mt-1 text-center text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(d.images ?? []).map((src, i) => (
            <li key={i} className="overflow-hidden rounded-[10px] shadow-[0_0_14px_rgba(0,0,0,0.2)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src={src} alt="" className="w-full" loading="lazy" />
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-[10px] border border-black/20 bg-white p-6">
          <h3 className="mb-4 text-center text-[24px] font-semibold text-[#135130]">{pickText(d.formHeading, locale)}</h3>
          <MailtoForm to={to} subject={`${name} — volunteer registration`} fields={fields} submitLabel={pickText(d.submit, locale)} hint={t("mailtoHint")} columns={4} />
        </div>
      </div>
    </section>
  );
}
