import { ArrowRight, ArrowUpCircle, BadgeCheck, ChartLine, CircleCheck, ClipboardList, Clock, FileBarChart, ShieldCheck, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { GrievanceSubmitForm, GrievanceTrackForm } from "@/components/public/GrievanceForms";
import { getGrievanceStats } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { MailtoForm } from "../MailtoForm";
import { VolunteerCardsClient } from "./VolunteerCards";
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

/** Badge colours of the QR cards, in the Figma order. */
const QR_COLOURS = ["#1b7a3a", "#7b3fc4", "#f5871f", "#1a6fe0", "#1b9a3a", "#8a3fc4"];

/** `qr-codes`: a QR code (generated from the link) with the service icon, title and description. */
export async function QrCodesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const raw = list<{ title?: B; description?: B; serviceIcon?: string; buttonText?: B; linkUrl?: string; colour?: string }>((data as { items?: unknown }).items).filter((i) => i.linkUrl);
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
              {/* Figma Services: each badge has its own colour (green, purple, orange, blue, green, purple). */}
              <span className="relative -mt-7 flex size-[54px] items-center justify-center rounded-full border-2 border-white text-white shadow" style={{ backgroundColor: q.colour ?? QR_COLOURS[i % QR_COLOURS.length] }}>
                <Icon name={q.serviceIcon} className="size-6" />
              </span>
              <span className="mt-2 text-[16px] font-semibold text-black">{tx(q.title, locale)}</span>
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
        {/* The form draws its own bordered card. */}
        <div className="mt-4">
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
        {/* The lookup draws its own card. */}
        <div className="mt-4">
          <GrievanceTrackForm slug={slug} />
        </div>
      </div>
    </section>
  );
}

/** Step badges of the Figma escalation matrix, in step order (registered → resolved). */
const STEP_ICONS = [ClipboardList, Users, BadgeCheck, ArrowUpCircle, ShieldCheck];

/**
 * `escalation-matrix` (Figma 375:11358, top half): left-aligned heading, the steps as round icon badges
 * with a numbered dot and arrows between them, and on the right the live "Complaint Status" card
 * (GET /public/:slug/stats/grievances). The status legend is kept below the steps.
 */
export async function EscalationMatrixSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { steps?: unknown; statusSummary?: unknown };
  const steps = list<{ title?: B; description?: B }>(d.steps);
  const statuses = list<{ label?: B; colour?: string }>(d.statusSummary);
  if (steps.length === 0 && statuses.length === 0) return null;
  const stats = await getGrievanceStats(slug);
  const num = (n: number) => n.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN");
  // Month-on-month change (last month vs the month before, from the backend); no line while it is null.
  const change = (n: number | null | undefined) => (n === null || n === undefined ? "" : `${n > 0 ? "+" : ""}${n}% ${t("fromLastMonthShort")}`);
  const rows = stats
    ? [
        { icon: FileBarChart, label: t("statusTotal"), value: num(stats.total), change: change(stats.receivedChangePercent), fg: "#1a62e0", bg: "#eaf2fd", border: "#b9d0f5", text: "text-black" },
        { icon: CircleCheck, label: t("statusResolved"), value: num(stats.resolved), change: change(stats.resolvedChangePercent), fg: "#2f8a3c", bg: "#eef7ee", border: "#cfe6cf", text: "text-black" },
        { icon: Clock, label: t("statusPending"), value: num(stats.pending), change: change(stats.pendingChangePercent), fg: "#f5871f", bg: "#fef4e8", border: "#f8d9b5", text: "text-black" },
        { icon: ChartLine, label: t("statusRate"), value: stats.resolutionRate === null ? "—" : `${stats.resolutionRate}%`, change: change(stats.resolutionRateChangePoints), fg: "#7b2cbf", bg: "#f4ecfc", border: "#dcc8f2", text: "text-[#7b2cbf]" },
      ]
    : [];
  return (
    <section className="bg-cream py-8">
      <div className={`mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-8 lg:px-[60px] ${rows.length ? "lg:grid-cols-[minmax(0,1fr)_436px]" : ""}`}>
        <div>
          <h2 className="text-[22px] leading-8 font-semibold text-black">{t("escalationTitle")}</h2>
          {steps.length > 0 && (
            <ol className="mt-6 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:flex lg:justify-between">
              {steps.map((s, i) => {
                const StepIcon = STEP_ICONS[i % STEP_ICONS.length]!;
                return (
                  <li key={i} className="relative flex flex-1 flex-col items-center text-center">
                    {i < steps.length - 1 && (
                      <ArrowRight aria-hidden className="absolute top-[30px] -right-3 hidden size-5 -translate-y-1/2 text-[#6b6b6b] lg:block" />
                    )}
                    <span className="flex size-[60px] items-center justify-center rounded-full border border-black/10 bg-white text-[#135130] shadow-[0_0_8px_rgba(0,0,0,0.08)]">
                      <StepIcon aria-hidden className="size-7" />
                    </span>
                    <span className="relative mt-4 flex w-full justify-center">
                      <span aria-hidden className="absolute inset-x-4 top-1/2 h-px bg-black/15" />
                      <span className="relative flex size-6 items-center justify-center rounded-full bg-[#135130] text-[12px] font-semibold text-white">{i + 1}</span>
                    </span>
                    <p className="mt-3 text-[14px] font-semibold text-[#135130]">{tx(s.title, locale)}</p>
                    {tx(s.description, locale) && <p className="mt-1 max-w-[170px] text-[13px] leading-[22px] text-[#414141]">{tx(s.description, locale)}</p>}
                  </li>
                );
              })}
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
        </div>
        {rows.length > 0 && (
          <div>
            <h2 className="text-[20px] leading-8 font-semibold text-black">{t("complaintStatus")}</h2>
            <ul className="mt-4 space-y-2.5">
              {rows.map((r) => (
                <li key={r.label} className="flex min-h-[45px] items-center gap-4 rounded-[6px] border px-4 py-1" style={{ backgroundColor: r.bg, borderColor: r.border }}>
                  <r.icon aria-hidden className="size-6 shrink-0" style={{ color: r.fg }} />
                  <span className={`flex-1 text-[15px] ${r.text}`}>
                    {r.label}
                    {r.change && <span className="block text-[11px] leading-4 font-medium text-[#414141]">{r.change}</span>}
                  </span>
                  <span className="w-20 text-[16px] font-semibold text-black">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
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

/** Contact-page heading that sits above its card (Figma: 30px, Title Case). */
function OutsideHeading({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <h2 className={`mb-5 text-[30px] leading-[45px] font-semibold text-black ${center ? "text-center" : ""}`}>{children}</h2>;
}

/**
 * `office-location` (left column of a row with `feedback-form`): heading above the card, then a
 * ~420px sandboxed Google Maps / OpenStreetMap embed with the address under it.
 */
export async function OfficeLocationSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { title?: B; address?: B; mapEmbedUrl?: string };
  // Re-checked here as well as in the backend schema: only these providers may be framed.
  const map = d.mapEmbedUrl && MAP_PREFIXES.some((p) => d.mapEmbedUrl!.startsWith(p)) ? d.mapEmbedUrl : undefined;
  return (
    <div className="flex flex-col">
      <OutsideHeading>{tx(d.title, locale) || t("officeLocationTitle")}</OutsideHeading>
      <div className="flex flex-1 flex-col overflow-hidden rounded-[10px] border border-black/15 bg-white">
        {map && (
          <iframe
            src={map}
            title={tx(d.title, locale) || t("officeMap")}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="h-[420px] w-full flex-1 border-0"
          />
        )}
        {tx(d.address, locale) && (
          <p className="flex gap-2 px-5 py-3 text-[14px] leading-6 whitespace-pre-line text-[#414141]">
            <Icon name="map" className="mt-1 size-4 shrink-0 text-[#135130]" />
            {tx(d.address, locale)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * `feedback-form` (right column of a row with `office-location`): POST /public/:slug/feedback, or the
 * visitor's mail app while the section is placeholder content. The row wrapper only carries the first
 * section's id, so this column carries id="feedback-form" for "page:contact#feedback-form" links.
 */
export async function FeedbackFormSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; showOnWebsite?: boolean; heading?: B; description?: B; recipientEmail?: string; submitButtonText?: B };
  if (d.enabled === false || d.showOnWebsite === false || !d.recipientEmail) return null;
  const input = "w-full rounded-[10px] border border-black/30 bg-white px-4 text-[15px] font-normal text-black placeholder:text-[#8a8a8a] focus:border-[#135130] focus:outline-none";
  return (
    <div id="feedback-form" className="flex scroll-mt-[180px] flex-col">
      <OutsideHeading>{tx(d.heading, locale) || t("feedbackTitle")}</OutsideHeading>
      <div className="flex-1 rounded-[10px] border border-black/25 bg-white p-6">
        {tx(d.description, locale) && <p className="mb-4 text-[13px] text-[#414141]">{tx(d.description, locale)}</p>}
        <MailtoForm
          to={d.recipientEmail}
          subject={tx(d.heading, locale) || t("feedback")}
          submitLabel={tx(d.submitButtonText, locale) || t("send")}
          hint={t("mailHint")}
          api={{ slug, kind: "feedback" }}
          labelClass="text-[15px] font-medium text-black"
          inputClass={`${input} min-h-[56px] py-3`}
          submitClass="mt-2 h-[56px] w-full rounded-full bg-[#135130] px-6 text-[17px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          fields={[
            { name: "name", label: t("fbName"), placeholder: t("phName"), required: true },
            { name: "email", label: t("fbEmail"), placeholder: t("phEmail"), type: "email" },
            { name: "phone", label: t("fbPhone"), placeholder: t("phPhone"), type: "tel" },
            { name: "subject", label: t("fbSubject"), placeholder: t("phSubject") },
            { name: "message", label: t("fbMessage"), placeholder: t("phMessage"), type: "textarea", span: 4, required: true },
          ]}
        />
      </div>
    </div>
  );
}

/** `partners`: groups of partners — icon in a pale circle beside the title, description, then the logos. */
export async function PartnersSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ logoId?: string; title?: B; description?: B; partnerLogoIds?: string[] }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <OutsideHeading center>{t("partnersTitle")}</OutsideHeading>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => {
            const logo = mediaUrl(slug, p.logoId);
            return (
              <li key={i} className="flex flex-col rounded-[10px] bg-white p-6 shadow-[0_0_10px_rgba(0,0,0,0.12)]">
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9f4e9] text-[#135130]">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                      <img src={logo} alt="" loading="lazy" className="size-full object-contain" />
                    ) : (
                      <Icon name="users" className="size-7" />
                    )}
                  </span>
                  <div>
                    <p className="text-[20px] leading-7 font-semibold text-[#135130]">{tx(p.title, locale)}</p>
                    {tx(p.description, locale) && <p className="mt-2 text-[14px] leading-6 text-[#414141]">{tx(p.description, locale)}</p>}
                  </div>
                </div>
                {list<string>(p.partnerLogoIds).length > 0 && (
                  <ul className="mt-6 grid grid-cols-3 items-center gap-4">
                    {list<string>(p.partnerLogoIds).map((id) => (
                      <li key={id} className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                        <img src={mediaUrl(slug, id)} alt="" loading="lazy" className="h-[60px] w-auto max-w-full object-contain" />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * `volunteer-categories`: "Become a Volunteer" heading (taken from `volunteer-registration`) and one
 * selectable card per category; choosing a card preselects that category in the registration form.
 */
export async function VolunteerCategoriesSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ title?: B; description?: B; iconId?: string; order?: number }>((data as { items?: unknown }).items).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (items.length === 0) return null;
  const reg = (siblings?.["volunteer-registration"] ?? {}) as { heading?: B; description?: B };
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(reg.heading, locale) || t("becomeVolunteer")}</h2>
        {tx(reg.description, locale) && <p className="mt-3 text-center text-[20px] leading-[30px] text-black">{tx(reg.description, locale)}</p>}
        <VolunteerCardsClient
          field="area"
          items={items.map((c) => ({ title: tx(c.title, locale), description: tx(c.description, locale), icon: mediaUrl(slug, c.iconId) }))}
        />
      </div>
    </section>
  );
}

/**
 * `volunteer-registration`: "Volunteer Registration Form" card (POST /public/:slug/volunteers, or the
 * mail app while placeholder). Name / email / phone / category / address / areaOfInterest are API fields.
 */
export async function VolunteerRegistrationSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; showOnWebsite?: boolean; heading?: B; description?: B; deadline?: string; recipientEmail?: string; submitButtonText?: B };
  if (d.enabled === false || d.showOnWebsite === false || !d.recipientEmail) return null;
  const categories = list<{ title?: B }>((siblings?.["volunteer-categories"] as { items?: unknown } | undefined)?.items)
    .map((c) => tx(c.title, locale))
    .filter(Boolean);
  const deadline = d.deadline ? new Date(`${d.deadline}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  // Without the category cards above, this section shows the page heading and subtitle itself.
  const standalone = !siblings?.["volunteer-categories"];
  const sub = [standalone ? tx(d.description, locale) : "", deadline ? t("deadline", { date: deadline }) : ""].filter(Boolean).join(" · ");
  const input = "h-[48px] w-full rounded-[10px] border border-black/30 bg-white px-4 text-[15px] font-normal text-black placeholder:text-[#8a8a8a] focus:border-[#135130] focus:outline-none";
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {standalone && <OutsideHeading center>{tx(d.heading, locale) || t("becomeVolunteer")}</OutsideHeading>}
        <div className="rounded-[10px] border border-black/25 bg-white px-6 pt-4 pb-7">
          <h3 className="text-center text-[24px] leading-9 font-semibold text-[#135130]">{t("volunteerFormTitle")}</h3>
          {sub && <p className="mt-1 text-center text-[14px] text-[#414141]">{sub}</p>}
          <div className="mt-4">
            <MailtoForm
              to={d.recipientEmail}
              subject={tx(d.heading, locale) || t("volunteer")}
              submitLabel={tx(d.submitButtonText, locale) || t("send")}
              hint={t("mailHint")}
              api={{ slug, kind: "volunteers", map: { area: "category", interest: "areaOfInterest" } }}
              gridClass="sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-7"
              labelClass="text-[18px] font-semibold text-black"
              inputClass={input}
              submitWrapClass="flex flex-col justify-end gap-2 sm:col-span-full lg:col-span-3"
              submitClass="h-[46px] w-full rounded-full bg-[#135130] px-6 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
              fields={[
                { name: "name", label: t("fullName"), placeholder: t("phName"), required: true, className: "lg:col-span-3" },
                { name: "email", label: t("fbEmail"), placeholder: t("phEmail"), type: "email", required: true, className: "lg:col-span-3" },
                { name: "phone", label: t("fbPhone"), placeholder: t("phPhone"), type: "tel", required: true, className: "lg:col-span-3" },
                ...(categories.length
                  ? [{ name: "area", label: t("volCategory"), type: "select" as const, options: categories, placeholder: t("selectCategory"), required: true, className: "lg:col-span-3" }]
                  : []),
                { name: "address", label: t("volAddress"), placeholder: t("phAddress"), className: "lg:col-span-5" },
                { name: "interest", label: t("areaOfInterest"), placeholder: t("phArea"), className: "lg:col-span-4" },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
