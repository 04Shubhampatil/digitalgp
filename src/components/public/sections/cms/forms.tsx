import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { GrievanceSubmitForm, GrievanceTrackForm } from "@/components/public/GrievanceForms";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { MailtoForm } from "../MailtoForm";
import { Band, Icon, QrCode, cardClass, externalProps, list, mediaUrl, tx, type B } from "./kit";

// ------------------------------------------------------------------------------------ services

interface ServiceLink {
  icon?: string;
  title?: B;
  description?: B;
  href?: string;
  visible?: boolean;
}

/** `service-links`: certificate / service tiles that link to the application page. */
export async function ServiceLinksSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<ServiceLink>((data as { items?: unknown }).items).filter((s) => s.visible !== false && s.href);
  if (items.length === 0) return null;
  return (
    <Band heading={t("serviceLinks")} subheading={t("serviceLinksSub")} center>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((s, i) => {
          const external = /^https?:\/\//.test(s.href!);
          const inner = (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                <Icon name={s.icon ?? "file"} className="size-5" />
              </span>
              <span className="mt-2 text-[13px] font-semibold text-black">{tx(s.title, locale)}</span>
              {tx(s.description, locale) && <span className="mt-0.5 text-[11px] text-[#414141]">{tx(s.description, locale)}</span>}
            </>
          );
          return (
            <li key={i}>
              {external ? (
                <a href={s.href} {...externalProps} className={`${cardClass} flex h-full flex-col items-center text-center hover:shadow-md`}>
                  {inner}
                </a>
              ) : (
                <Link href={resolveHref(s.href!, slug)} className={`${cardClass} flex h-full flex-col items-center text-center hover:shadow-md`}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

interface ServiceCategory {
  icon?: string;
  title?: B;
  description?: B;
  features?: B[];
  buttonText?: B;
  buttonLink?: string;
  accentColour?: string;
}

/** `service-categories`: four action cards with accent colour, feature list and button. */
export function ServiceCategoriesSection({ slug, locale, data }: SectionProps) {
  const items = list<ServiceCategory>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => {
          const accent = c.accentColour ?? "#135130";
          return (
            <li key={i} className="flex flex-col rounded-[10px] border bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.06)]" style={{ borderColor: `${accent}55`, borderTop: `4px solid ${accent}` }}>
              <span className="flex size-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                <Icon name={c.icon} />
              </span>
              <p className="mt-3 text-[17px] font-semibold text-black">{tx(c.title, locale)}</p>
              {tx(c.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(c.description, locale)}</p>}
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-black">
                {list<B>(c.features)
                  .filter((f) => tx(f, locale))
                  .map((f, j) => (
                    <li key={j} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                      {tx(f, locale)}
                    </li>
                  ))}
              </ul>
              {c.buttonLink && (
                <div className="mt-auto pt-4">
                  <Link href={resolveHref(c.buttonLink, slug)} className="inline-flex w-full items-center justify-center rounded-[8px] border px-4 py-2 text-[13px] font-semibold hover:opacity-80" style={{ borderColor: accent, color: accent }}>
                    {tx(c.buttonText, locale) || "→"}
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `qr-codes`: a QR code (generated from the link) with the service icon, title and description. */
export async function QrCodesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const raw = list<{ title?: B; description?: B; serviceIcon?: string; buttonText?: B; linkUrl?: string }>((data as { items?: unknown }).items).filter((i) => i.linkUrl);
  if (raw.length === 0) return null;
  // Published links are absolute https addresses. Placeholder links may point at the site's own pages
  // ("page:grievance"); those are turned into full addresses here, because a QR code needs one to scan.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const items = raw.map((i) => {
    const href = resolveHref(i.linkUrl!, slug);
    return { ...i, linkUrl: /^https?:\/\//.test(href) || !host ? href : `${proto}://${host}${href}` };
  });
  return (
    <Band heading={t("quickAccess")} subheading={t("quickAccessSub")} center>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {items.map((q, i) => (
          <li key={i}>
            <a href={q.linkUrl} {...externalProps} aria-label={`${tx(q.title, locale)}: ${tx(q.buttonText, locale) || t("open")}`} className={`${cardClass} flex h-full flex-col items-center text-center hover:shadow-md`}>
              <QrCode text={q.linkUrl!} label={tx(q.title, locale)} className="w-full max-w-[140px]" />
              <span className="relative -mt-5 flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#135130] text-white shadow">
                <Icon name={q.serviceIcon} className="size-4" />
              </span>
              <span className="mt-2 text-[14px] font-semibold text-black">{tx(q.title, locale)}</span>
              {tx(q.description, locale) && <span className="text-[12px] text-[#414141]">{tx(q.description, locale)}</span>}
            </a>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** `help` ("Need help?"): contact details and expandable common queries. */
export async function HelpSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subtitle?: B; imageId?: string; contact?: unknown; faqs?: unknown };
  const contacts = list<{ phone?: string; email?: string; hours?: string }>(d.contact);
  const faqs = list<{ question?: B; answer?: B }>(d.faqs);
  const image = mediaUrl(slug, d.imageId);
  return (
    <Band tone="cream">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="text-[22px] font-semibold text-black">{tx(d.heading, locale)}</h2>
          {tx(d.subtitle, locale) && <p className="mt-1 text-[13px] text-[#414141]">{tx(d.subtitle, locale)}</p>}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
            <img src={image} alt="" loading="lazy" className="mt-4 max-h-56 w-auto object-contain" />
          )}
          <ul className="mt-4 space-y-3 text-[13px]">
            {contacts.map((c, i) => (
              <li key={i} className="space-y-1">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-black hover:underline">
                    <Icon name="phone" className="size-4 text-[#135130]" /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-black hover:underline">
                    <Icon name="mail" className="size-4 text-[#135130]" /> {c.email}
                  </a>
                )}
                {c.hours && <p className="pl-6 text-[#414141]">{c.hours}</p>}
              </li>
            ))}
          </ul>
        </div>
        {faqs.length > 0 && (
          <div className={cardClass}>
            <h3 className="text-[18px] font-semibold text-black">{t("commonQueries")}</h3>
            <div className="mt-3 divide-y divide-black/10">
              {faqs.map((f, i) => (
                <details key={i} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-black">
                    {tx(f.question, locale)}
                    <span aria-hidden className="text-[#135130] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[13px] leading-6 text-[#414141]">{tx(f.answer, locale)}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ grievance

/** `complaint-form`: heading + the real complaint form (POST /public/:slug/grievances). */
export function ComplaintFormSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; description?: B };
  return (
    <section id="register" className="bg-cream py-8">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.description, locale) && <p className="mx-auto mt-1 mb-6 max-w-2xl text-center text-[14px] text-[#414141]">{tx(d.description, locale)}</p>}
        <div className="mt-4 rounded-[10px] border border-black/20 bg-white p-6 sm:p-8">
          <GrievanceSubmitForm slug={slug} />
        </div>
      </div>
    </section>
  );
}

/** `track-complaint`: heading + the real status lookup (POST /public/:slug/grievances/track). */
export function TrackComplaintSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; description?: B };
  return (
    <section id="track" className="bg-cream py-8">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.description, locale) && <p className="mx-auto mt-1 mb-6 max-w-2xl text-center text-[14px] text-[#414141]">{tx(d.description, locale)}</p>}
        <div className="mt-4 rounded-[10px] border border-black/20 bg-white p-6 sm:p-8">
          <GrievanceTrackForm slug={slug} />
        </div>
      </div>
    </section>
  );
}

/** `escalation-matrix`: numbered steps and the status legend. */
export async function EscalationMatrixSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { steps?: unknown; statusSummary?: unknown };
  const steps = list<{ title?: B; description?: B }>(d.steps);
  const statuses = list<{ label?: B; colour?: string }>(d.statusSummary);
  if (steps.length === 0 && statuses.length === 0) return null;
  return (
    <Band heading={t("escalation")} subheading={t("escalationSub")}>
      {steps.length > 0 && (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          {steps.map((s, i) => (
            <li key={i} className={`${cardClass} relative text-center`}>
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute top-1/2 -right-3.5 z-10 hidden -translate-y-1/2 text-[#135130] lg:block">
                  →
                </span>
              )}
              <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#135130] text-[15px] font-semibold text-white">{i + 1}</span>
              <p className="mt-3 text-[14px] font-semibold text-black">{tx(s.title, locale)}</p>
              {tx(s.description, locale) && <p className="mt-1 text-[12px] leading-5 text-[#414141]">{tx(s.description, locale)}</p>}
            </li>
          ))}
        </ol>
      )}
      {statuses.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {statuses.map((s, i) => (
            <li key={i} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-black">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: s.colour }} />
              {tx(s.label, locale)}
            </li>
          ))}
        </ul>
      )}
    </Band>
  );
}

// ------------------------------------------------------------------------------------ contact

/** `contact-cards`: icon, title, details and social links. */
export async function CmsContactCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ iconId?: string; title?: B; details?: B; socialLinks?: { label?: string; url?: string }[] }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band heading={t("contactInfo")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => {
          const icon = mediaUrl(slug, c.iconId);
          return (
            <li key={i} className={cardClass}>
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={icon} alt="" className="size-12 object-contain" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name="info" />
                </span>
              )}
              <p className="mt-3 text-[15px] font-semibold text-black">{tx(c.title, locale)}</p>
              {tx(c.details, locale) && <p className="mt-1 text-[13px] leading-5 whitespace-pre-line text-[#414141]">{tx(c.details, locale)}</p>}
              {list<{ label?: string; url?: string }>(c.socialLinks).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {list<{ label?: string; url?: string }>(c.socialLinks)
                    .filter((s) => s.url)
                    .map((s, j) => (
                      <li key={j}>
                        <a href={s.url} {...externalProps} className="inline-flex rounded-full border border-[#135130] px-3 py-1 text-[12px] font-medium text-[#135130] hover:bg-[#135130] hover:text-white">
                          {s.label}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

const MAP_PREFIXES = ["https://www.google.com/maps/embed", "https://maps.google.com/maps", "https://www.openstreetmap.org/export/embed"];

/** `office-location` (card in a two-column row with `feedback-form`): address and a sandboxed Google Maps / OpenStreetMap embed. */
export async function OfficeLocationSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { title?: B; address?: B; mapEmbedUrl?: string };
  // Re-checked here as well as in the backend schema: only these providers may be framed.
  const map = d.mapEmbedUrl && MAP_PREFIXES.some((p) => d.mapEmbedUrl!.startsWith(p)) ? d.mapEmbedUrl : undefined;
  return (
    <div className={cardClass}>
      <h2 className="text-[22px] font-semibold text-black">{tx(d.title, locale)}</h2>
      {tx(d.address, locale) && (
        <p className="mt-2 flex gap-2 text-[14px] leading-6 whitespace-pre-line text-[#414141]">
          <Icon name="map" className="mt-1 size-4 shrink-0 text-[#135130]" />
          {tx(d.address, locale)}
        </p>
      )}
      {map && (
        <iframe
          src={map}
          title={tx(d.title, locale) || t("officeMap")}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin"
          className="mt-4 h-72 w-full rounded-[10px] border border-black/10"
        />
      )}
    </div>
  );
}

/** `feedback-form` (card in a two-column row with `office-location`): opens the visitor's mail app (no feedback endpoint yet). */
export async function FeedbackFormSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; showOnWebsite?: boolean; heading?: B; description?: B; recipientEmail?: string; submitButtonText?: B };
  if (d.enabled === false || d.showOnWebsite === false || !d.recipientEmail) return null;
  return (
    <div className={cardClass}>
      <h2 className="text-[22px] font-semibold text-black">{tx(d.heading, locale)}</h2>
      {tx(d.description, locale) && <p className="mt-1 mb-4 text-[13px] text-[#414141]">{tx(d.description, locale)}</p>}
      <MailtoForm
        to={d.recipientEmail}
        subject={tx(d.heading, locale) || t("feedback")}
        submitLabel={tx(d.submitButtonText, locale) || t("send")}
        hint={t("mailHint")}
        api={{ slug, kind: "feedback" }}
        fields={[
          { name: "name", label: t("yourName"), required: true },
          { name: "email", label: t("yourEmail"), type: "email" },
          { name: "message", label: t("yourMessage"), type: "textarea", span: 4, required: true },
        ]}
      />
    </div>
  );
}

/** `partners`: partner logos with their own logo rows. */
export async function PartnersSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ logoId?: string; title?: B; description?: B; partnerLogoIds?: string[] }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band tone="white" heading={t("partnersHeading")}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => {
          const logo = mediaUrl(slug, p.logoId);
          return (
            <li key={i} className={cardClass}>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={logo} alt="" loading="lazy" className="h-14 w-auto object-contain" />
              )}
              <p className="mt-3 text-[15px] font-semibold text-black">{tx(p.title, locale)}</p>
              {tx(p.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(p.description, locale)}</p>}
              {list<string>(p.partnerLogoIds).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {list<string>(p.partnerLogoIds).map((id) => (
                    <li key={id}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                      <img src={mediaUrl(slug, id)} alt="" loading="lazy" className="h-9 w-auto object-contain" />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `volunteer-categories`: the areas volunteers can join (also offered in the registration form); cards when they have descriptions. */
export async function VolunteerCategoriesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ title?: B; description?: B; iconId?: string; order?: number }>((data as { items?: unknown }).items).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (items.length === 0) return null;
  const cards = items.some((c) => tx(c.description, locale) || c.iconId);
  return (
    <Band heading={t("volunteerAreas")} tone="cream">
      {cards ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c, i) => {
            const icon = mediaUrl(slug, c.iconId);
            return (
              <li key={i} className={`${cardClass} flex flex-col items-center text-center`}>
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                  <img src={icon} alt="" loading="lazy" className="size-16 rounded-full object-cover" />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                    <Icon name="users" className="size-8" />
                  </span>
                )}
                <p className="mt-3 text-[16px] font-semibold text-black">{tx(c.title, locale)}</p>
                {tx(c.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(c.description, locale)}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((c, i) => (
            <li key={i} className="rounded-full border border-[#135130] bg-white px-4 py-2 text-[13px] font-medium text-[#135130]">
              {tx(c.title, locale)}
            </li>
          ))}
        </ul>
      )}
    </Band>
  );
}

/** `volunteer-registration`: opens the visitor's mail app; the category list comes from `volunteer-categories`. */
export async function VolunteerRegistrationSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; showOnWebsite?: boolean; heading?: B; description?: B; deadline?: string; recipientEmail?: string; submitButtonText?: B };
  if (d.enabled === false || d.showOnWebsite === false || !d.recipientEmail) return null;
  const categories = list<{ title?: B }>((siblings?.["volunteer-categories"] as { items?: unknown } | undefined)?.items)
    .map((c) => tx(c.title, locale))
    .filter(Boolean);
  const deadline = d.deadline ? new Date(`${d.deadline}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <Band heading={tx(d.heading, locale)} subheading={[tx(d.description, locale), deadline && t("deadline", { date: deadline })].filter(Boolean).join(" · ")}>
      <div className={`${cardClass} sm:p-8`}>
        <MailtoForm
          to={d.recipientEmail}
          subject={tx(d.heading, locale) || t("volunteer")}
          submitLabel={tx(d.submitButtonText, locale) || t("send")}
          hint={t("mailHint")}
          api={{ slug, kind: "volunteers", map: { area: "category" } }}
          fields={[
            { name: "name", label: t("yourName"), required: true },
            { name: "phone", label: t("yourPhone"), type: "tel", required: true },
            { name: "email", label: t("yourEmail"), type: "email", required: true },
            ...(categories.length ? [{ name: "area", label: t("volunteerArea"), type: "select" as const, options: categories, placeholder: t("choose"), required: true }] : []),
            { name: "message", label: t("yourMessage"), type: "textarea", span: 4 },
          ]}
        />
      </div>
    </Band>
  );
}
