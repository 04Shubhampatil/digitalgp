import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { Band, FilledButton, Icon, LinkButton, TextLink, cardClass, externalProps, list, mediaUrl, plain, readableText, tx, withOpacity, type B } from "./kit";

// ------------------------------------------------------------------------------------ banner

interface BannerData {
  layout?: "full-background" | "image-right" | "image-left" | "framed-image";
  heading?: B;
  supportingText?: B;
  description?: B;
  ctas?: { label?: B; linkType?: "page" | "external"; href?: string; openInNewTab?: boolean }[];
  imageId?: string;
  textPosition?: { horizontal?: "left" | "center" | "right"; vertical?: "top" | "middle" | "bottom" };
  overlay?: { enabled?: boolean; colour?: string; intensity?: number; gradient?: "left-right" | "right-left" | "top-bottom" | "none" };
  appearance?: { height?: number; contentWidth?: "small" | "medium" | "large"; cornerRadius?: number; textColour?: string };
}

const WIDTHS = { small: "max-w-md", medium: "max-w-2xl", large: "max-w-4xl" } as const;
const JUSTIFY = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" } as const;
const ALIGN = { top: "items-start", middle: "items-center", bottom: "items-end" } as const;
const GRADIENT_DIR = { "left-right": "to right", "right-left": "to left", "top-bottom": "to bottom" } as const;

function Buttons({ d, slug, locale, light }: { d: BannerData; slug: string; locale: SectionProps["locale"]; light?: boolean }) {
  const ctas = list<NonNullable<BannerData["ctas"]>[number]>(d.ctas).filter((c) => c.href && tx(c.label, locale));
  if (ctas.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {ctas.map((c, i) => {
        const external = c.linkType === "external" || /^https?:\/\//.test(c.href ?? "");
        const cls =
          i === 0
            ? light
              ? "inline-flex rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#135130] hover:opacity-90"
              : "inline-flex rounded-full border border-[#135130] bg-[#135130] px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-90"
            : light
              ? "inline-flex rounded-full border border-white px-5 py-2.5 text-[13px] text-white hover:bg-white/10"
              : "inline-flex rounded-full border border-[#135130] px-5 py-2.5 text-[13px] text-[#135130] hover:bg-[#135130]/5";
        return external || c.openInNewTab ? (
          <a key={i} href={resolveHref(c.href!, slug)} {...(c.openInNewTab || external ? externalProps : {})} className={cls}>
            {tx(c.label, locale)}
          </a>
        ) : (
          <Link key={i} href={resolveHref(c.href!, slug)} className={cls}>
            {tx(c.label, locale)}
          </Link>
        );
      })}
    </div>
  );
}

/** Shared page banner (backend `banner`): four layouts, text position, overlay and appearance. */
export function BannerSection({ slug, locale, data }: SectionProps) {
  const d = data as BannerData;
  const layout = d.layout ?? "full-background";
  const image = mediaUrl(slug, d.imageId);
  const heading = tx(d.heading, locale);
  const supporting = tx(d.supportingText, locale);
  const description = tx(d.description, locale);
  const radius = d.appearance?.cornerRadius ?? 12;
  const height = d.appearance?.height ?? 520;
  const width = WIDTHS[d.appearance?.contentWidth ?? "medium"];
  const text = d.appearance?.textColour;

  const copy = (light: boolean) => (
    <>
      {!light && supporting && <p className="mb-6 text-[20px] leading-7 font-semibold text-[#ea7f14] uppercase">{supporting}</p>}
      {heading && (
        <h1 className="text-[32px] leading-[1.25] font-bold lg:text-[40px]" style={light && text ? { color: text } : undefined}>
          {heading}
        </h1>
      )}
      {light && supporting && (
        <p className="mt-3 text-[18px] leading-7 font-medium" style={text ? { color: text } : undefined}>
          {supporting}
        </p>
      )}
      {description && (
        <p className={`mt-3 text-[15px] leading-[25px] ${light ? "" : "text-[#414141]"}`} style={light && text ? { color: text } : undefined}>
          {description}
        </p>
      )}
      <Buttons d={d} slug={slug} locale={locale} light={light} />
    </>
  );

  if (layout === "full-background") {
    const o = d.overlay;
    const overlayBg = o?.enabled
      ? o.gradient && o.gradient !== "none"
        ? `linear-gradient(${GRADIENT_DIR[o.gradient]}, ${withOpacity(o.colour ?? "#000000", o.intensity ?? 40)}, transparent)`
        : withOpacity(o.colour ?? "#000000", o.intensity ?? 40)
      : undefined;
    const pos = d.textPosition;
    return (
      <section className="relative overflow-hidden bg-[#135130]" style={{ minHeight: height }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {overlayBg && <div aria-hidden className="absolute inset-0" style={{ background: overlayBg }} />}
        <div className={`relative mx-auto flex max-w-[1440px] px-4 py-12 sm:px-8 lg:px-[60px] ${JUSTIFY[pos?.horizontal ?? "left"]} ${ALIGN[pos?.vertical ?? "middle"]}`} style={{ minHeight: height }}>
          <div className={`${width} ${text ? "" : "text-white"}`}>{copy(true)}</div>
        </div>
      </section>
    );
  }

  const imageEl = image ? (
    // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
    <img src={image} alt="" className={`w-full object-cover ${layout === "framed-image" ? "border-8 border-white shadow-lg" : ""}`} style={{ borderRadius: radius, maxHeight: height }} />
  ) : null;
  return (
    <section className="overflow-hidden bg-cream">
      <div className={`mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-10 sm:px-8 lg:px-[62px] ${image ? "lg:grid-cols-2" : ""}`} style={{ minHeight: Math.min(height, 520) }}>
        {layout === "image-left" && imageEl}
        <div className={width}>{copy(false)}</div>
        {layout !== "image-left" && imageEl}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------ top stats

interface StatItem {
  icon?: string;
  title?: B;
  value?: string;
  unit?: B;
  description?: B;
  background?: string;
  visible?: boolean;
  /** Design picture for the icon (placeholder content); backend items use `icon`. */
  iconUrl?: string;
}

/** Icon circle colours of the one-card stats row (Figma Schemes: blue, green, orange, green). */
const CARD_TINTS = [
  { bg: "#e8f1fd", fg: "#1a62e0" },
  { bg: "#e9f4e9", fg: "#135130" },
  { bg: "#fdebe3", fg: "#e2502b" },
  { bg: "#e9f4e9", fg: "#135130" },
];

/** Icon circle colours of the overlapping summary strip (Figma Finance: green, blue, orange, purple). */
const STRIP_TINTS = [
  { bg: "#e9f4e9", fg: "#135130" },
  { bg: "#e5effd", fg: "#1a62e0" },
  { bg: "#fdeee3", fg: "#f5871f" },
  { bg: "#efe8fb", fg: "#7c3aed" },
];

/** `top-stats` / `green-scoreboard`: statistic cards (icon, value + unit, title, description). */
export function TopStatsSection({ locale, data }: SectionProps) {
  const d = data as { items?: unknown; heading?: B; subheading?: B; variant?: "tiles" | "strip" | "card" | "band"; overlap?: boolean };
  const items = list<StatItem>(d.items).filter((i) => i.visible !== false);
  if (items.length === 0) return null;
  if (d.variant === "band") {
    // Figma Services figures: one tinted band, four stats in a row with a 60px dark-green icon circle and dividers.
    return (
      <section className="bg-cream py-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
          <ul className="grid gap-y-6 rounded-[10px] bg-[#eff3ef] px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-black/15 lg:py-[26px]">
            {items.map((s, i) => (
              <li key={i} className="flex items-center gap-5 px-4 lg:justify-center lg:px-6">
                <span aria-hidden className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-[#1b5e3b] text-white">
                  <Icon name={s.icon} className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[18px] leading-7 font-bold text-black">
                    {s.value}
                    {tx(s.unit, locale) && <span className="ml-1 text-[13px] font-medium text-[#414141]">{tx(s.unit, locale)}</span>}
                  </span>
                  <span className="mt-1 block max-w-[150px] text-[14px] leading-[22px] text-black">{tx(s.title, locale)}</span>
                  {tx(s.description, locale) && <span className="block text-[12px] text-[#414141]">{tx(s.description, locale)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  if (d.variant === "card") {
    // Figma Schemes totals: one white card, four stats in a row (coloured icon circle, bold title, 24px value, caption).
    return (
      <Band tone="cream" heading={tx(d.heading, locale) || undefined} subheading={tx(d.subheading, locale) || undefined}>
        <ul className="grid gap-6 rounded-[10px] border border-[#414141]/20 bg-white px-7 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[56px]">
          {items.map((s, i) => {
            const tint = CARD_TINTS[i % CARD_TINTS.length]!;
            return (
              <li key={i} className="flex min-w-0 items-center gap-4">
                {s.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset
                  <img src={s.iconUrl} alt="" width={92} height={88} className="h-[88px] w-[92px] shrink-0" />
                ) : (
                  <span aria-hidden className="flex size-[64px] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg, color: tint.fg }}>
                    <Icon name={s.icon} className="size-7" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-2 leading-6">
                  <span className="text-[14px] font-bold text-black">{tx(s.title, locale)}</span>
                  <span className="text-[24px] font-bold text-black">
                    {s.value}
                    {tx(s.unit, locale) && <span className="ml-1 text-[14px] font-medium text-[#414141]">{tx(s.unit, locale)}</span>}
                  </span>
                  {tx(s.description, locale) && <span className="text-[14px] text-[#414141]">{tx(s.description, locale)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Band>
    );
  }
  const strip = d.variant === "strip";
  if (strip && d.overlap) {
    // Figma Finance summary: a compact white strip centred under the hero and overlapping its bottom edge;
    // tinted icon circle, uppercase label, green value and the change line ("↑ 5.2%  vs LM"), with dividers.
    return (
      <section className="relative z-10 bg-cream px-4 sm:px-8 lg:px-[60px]">
        <ul className="relative -top-8 mx-auto -mb-8 grid max-w-[805px] lg:-top-[45px] lg:-mb-[45px] divide-black/10 rounded-[10px] bg-white py-[18px] shadow-[0_0_14px_rgba(0,0,0,0.12)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
          {items.map((s, i) => {
            const tint = STRIP_TINTS[i % STRIP_TINTS.length]!;
            const change = tx(s.description, locale);
            const up = change.match(/^\s*([↑↓])\s*(\S+)\s*(.*)$/);
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-2">
                <span aria-hidden className="flex size-[50px] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg, color: tint.fg }}>
                  <Icon name={s.icon} className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] leading-4 font-medium text-black uppercase">{tx(s.title, locale)}</span>
                  <span className="mt-1 block text-[21px] leading-7 font-semibold whitespace-nowrap text-[#135130]">
                    {s.value}
                    {tx(s.unit, locale) && <span className="ml-1 text-[12px] font-medium text-[#414141]">{tx(s.unit, locale)}</span>}
                  </span>
                  {change && (
                    <span className="mt-1 block text-[11px] leading-4 text-[#414141]">
                      {up ? (
                        <>
                          <span className={up[1] === "↓" ? "text-[#dc2626]" : "text-[#16a34a]"}>{up[1]}</span> {up[2]}
                          <span className="ml-3">{up[3]}</span>
                        </>
                      ) : (
                        change
                      )}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  return (
    <Band tone="cream" heading={tx(d.heading, locale) || undefined} subheading={tx(d.subheading, locale) || undefined}>
      <ul className={strip ? "grid divide-black/10 overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.08)] sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:divide-x" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"}>
        {items.map((s, i) => {
          const fg = readableText(s.background);
          if (strip) {
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3" style={s.background ? { backgroundColor: s.background, color: fg } : undefined}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={s.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[18px] leading-6 font-semibold text-[#135130]">
                    {s.value}
                    {tx(s.unit, locale) && <span className="ml-1 text-[12px] font-medium text-[#414141]">{tx(s.unit, locale)}</span>}
                  </span>
                  <span className="block text-[12px] font-medium text-black">{tx(s.title, locale)}</span>
                  {tx(s.description, locale) && <span className="block text-[11px] text-[#414141]">{tx(s.description, locale)}</span>}
                </span>
              </li>
            );
          }
          return (
            <li key={i} className={`${cardClass} flex flex-col items-center text-center`} style={s.background ? { backgroundColor: s.background, color: fg } : undefined}>
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${fg ? "bg-current/10" : "bg-[#135130]/10 text-[#135130]"}`}>
                <Icon name={s.icon} />
              </span>
              <p className={`mt-3 text-[24px] leading-8 font-semibold ${fg ? "" : "text-[#135130]"}`}>
                {s.value}
                {tx(s.unit, locale) && <span className={`ml-1 text-[13px] font-medium ${fg ? "opacity-80" : "text-[#414141]"}`}>{tx(s.unit, locale)}</span>}
              </p>
              <p className={`text-[14px] font-semibold ${fg ? "" : "text-black"}`}>{tx(s.title, locale)}</p>
              {tx(s.description, locale) && <p className={`text-[12px] ${fg ? "opacity-80" : "text-[#414141]"}`}>{tx(s.description, locale)}</p>}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ support / icon cards

interface SupportItem {
  icon?: string;
  title?: B;
  description?: B;
  contactOrAction?: string;
  visible?: boolean;
}

/** Desktop column count that fills the row: one to six cards sit side by side, more wrap. */
const SUPPORT_COLS = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6"];

function SupportCards({ locale, data, heading, figureFirst }: { locale: SectionProps["locale"]; data: Record<string, unknown>; heading?: string; figureFirst?: boolean }) {
  const items = list<SupportItem>(data.items).filter((i) => i.visible !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={heading}>
      <ul className={`grid gap-4 sm:grid-cols-2 ${SUPPORT_COLS[Math.min(items.length, 6)]}`}>
        {items.map((c, i) => (
          <li key={i} className={`${cardClass} flex flex-col items-center text-center`}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={c.icon} />
            </span>
            {figureFirst && c.contactOrAction && <p className="mt-3 text-[30px] leading-9 font-bold text-black">{plain(c.contactOrAction, locale)}</p>}
            <p className={`${figureFirst && c.contactOrAction ? "mt-1" : "mt-3"} text-[14px] font-semibold text-black`}>{tx(c.title, locale)}</p>
            {tx(c.description, locale) && <p className="mt-1 text-[12px] text-[#414141]">{tx(c.description, locale)}</p>}
            {!figureFirst && c.contactOrAction && <p className="mt-2 text-[13px] font-medium text-[#135130]">{plain(c.contactOrAction, locale)}</p>}
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** `support-cards`: help / contact cards (Grievance, Employment, Education, Announcements). */
export function SupportCardsSection({ slug, locale, data, siblings }: SectionProps) {
  // The Grievance page uses the "contact" look (Figma 375:11347). The backend schema has no variant
  // field, so a page with a complaint form or tracker gets it too; other pages keep the default cards.
  const contact = data.variant === "contact" || ["grievance-register", "grievance-track", "complaint-form", "track-complaint"].some((k) => siblings?.[k]);
  if (contact) return <ContactSupportCards slug={slug} locale={locale} data={data} />;
  return <SupportCards locale={locale} data={data} />;
}

/** Where a contact card leads: its own link, else a phone / WhatsApp link derived from the shown number. */
function supportHref(c: SupportItem & { link?: string }, slug: string, locale: SectionProps["locale"]): { href: string; external: boolean } | null {
  if (c.link) return { href: resolveHref(c.link, slug), external: /^https?:\/\//.test(c.link) };
  const digits = plain(c.contactOrAction, locale).replace(/[^\d+]/g, "");
  const icon = (c.icon ?? "").toLowerCase();
  if (digits.replace("+", "").length < 6) return null;
  if (icon === "whatsapp") return { href: `https://wa.me/${digits.replace("+", "")}`, external: true };
  if (["headset", "helpline", "phone", "call"].includes(icon)) return { href: `tel:${digits}`, external: false };
  return null;
}

/** Grievance help cards: 60px outline icon, green title, bold green value, caption; the whole card is the link. */
function ContactSupportCards({ slug, locale, data }: { slug: string; locale: SectionProps["locale"]; data: Record<string, unknown> }) {
  const items = list<SupportItem & { link?: string }>(data.items).filter((i) => i.visible !== false);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <ul className={`grid gap-[10px] sm:grid-cols-2 ${SUPPORT_COLS[Math.min(items.length, 6)]}`}>
          {items.map((c, i) => {
            const link = supportHref(c, slug, locale);
            const body = (
              <>
                <Icon name={c.icon} className="size-[60px] text-[#135130] [stroke-width:1.5]" />
                <span className="mt-4 text-[16px] leading-6 font-semibold text-[#135130]">{tx(c.title, locale)}</span>
                {c.contactOrAction && <span className="mt-2 text-[20px] leading-7 font-bold text-[#135130]">{plain(c.contactOrAction, locale)}</span>}
                {tx(c.description, locale) && <span className="mt-2 text-[15px] text-[#414141]">{tx(c.description, locale)}</span>}
              </>
            );
            const cls = "flex h-full min-h-[227px] flex-col items-center justify-center rounded-[10px] bg-white px-4 py-6 text-center shadow-[0_0_10px_rgba(0,0,0,0.12)]";
            return (
              <li key={i}>
                {link ? (
                  link.external ? (
                    <a href={link.href} {...externalProps} className={`${cls} hover:shadow-md`}>
                      {body}
                    </a>
                  ) : link.href.startsWith("/") ? (
                    <Link href={link.href} className={`${cls} hover:shadow-md`}>
                      {body}
                    </Link>
                  ) : (
                    <a href={link.href} className={`${cls} hover:shadow-md`}>
                      {body}
                    </a>
                  )
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// `local-opportunities`, `assistance-items`, `training-programs` and `scheme-cards` (Employment / Education
// layouts) live in ./village.tsx.

// ------------------------------------------------------------------------------------ stories & programs

interface StoryItem {
  imageId?: string;
  title?: B;
  description?: B;
  buttonText?: B;
  buttonLink?: string;
  order?: number;
  /** Quote layout (Figma Schemes): who said it, their ward and the scheme. Placeholder content only for now. */
  name?: B;
  ward?: B;
  tag?: B;
}

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

/** `success-stories`: story cards with photo, text and an optional button. */
export async function CmsSuccessStoriesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { items?: unknown; layout?: "cards" | "quote"; heading?: B; subheading?: B; viewAll?: { label?: B; href?: string } };
  const items = list<StoryItem>(d.items).sort(byOrder);
  if (items.length === 0) return null;
  if (d.layout === "quote") {
    // Figma Schemes "Success Stories": portrait photo on the left, quote mark, quote, story, name, ward and scheme chip.
    return (
      <section className="bg-white py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
          <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale) || t("successStories")}</h2>
          {tx(d.subheading, locale) && <p className="mt-1 text-center text-[20px] leading-[30px] text-black">{tx(d.subheading, locale)}</p>}
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((s, i) => {
              const img = mediaUrl(slug, s.imageId);
              return (
                <li key={i} className="flex min-h-[280px] gap-4 rounded-[10px] border border-[#414141]/20 bg-white p-3">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                    <img src={img} alt="" loading="lazy" className="h-[250px] w-[116px] shrink-0 rounded-[4px] object-cover" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col pt-[18px]">
                    <span aria-hidden className="h-5 font-serif text-[56px] leading-[44px] font-bold text-[#135130]">&ldquo;</span>
                    <p className="mt-1 text-[12px] leading-6 font-semibold text-[#135130]">{tx(s.title, locale)}</p>
                    {tx(s.description, locale) && <p className="mt-1.5 text-[10px] leading-5 text-[#414141]">{tx(s.description, locale)}</p>}
                    <div className="mt-auto pt-3">
                      {tx(s.name, locale) && <p className="text-[10px] leading-4 font-medium text-[#0866ff]">{tx(s.name, locale)}</p>}
                      {tx(s.ward, locale) && <p className="text-[10px] leading-5 font-medium text-[#414141]">{tx(s.ward, locale)}</p>}
                      {tx(s.tag, locale) && <span className="mt-2 inline-flex rounded-full bg-[#138808]/5 px-2.5 py-[3px] text-[10px] leading-5 font-medium text-[#138808]">{tx(s.tag, locale)}</span>}
                      {s.buttonLink && tx(s.buttonText, locale) && (
                        <div className="pt-2">
                          <LinkButton href={resolveHref(s.buttonLink, slug)} external={/^https?:\/\//.test(s.buttonLink)}>
                            {tx(s.buttonText, locale)} <ArrowRight className="size-3.5" aria-hidden />
                          </LinkButton>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }
  return (
    // Figma Our Village / Employment / Education: photo cards with a green "Read Story →" text link and a "View All" pill.
    <Band heading={tx(d.heading, locale) || t("successStories")} subheading={tx(d.subheading, locale) || undefined} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => {
          const img = mediaUrl(slug, s.imageId);
          return (
            <li key={i} className="flex flex-col overflow-hidden rounded-[10px] border border-black/15 bg-white shadow-[0_0_10px_rgba(0,0,0,0.06)]">
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={img} alt="" loading="lazy" className="h-[185px] w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
                <p className="text-[16px] leading-6 font-semibold text-black">{tx(s.title, locale)}</p>
                {tx(s.description, locale) && <p className="mt-2 text-[14px] leading-[25px] text-[#414141]">{tx(s.description, locale)}</p>}
                {s.buttonLink && tx(s.buttonText, locale) && (
                  <div className="mt-auto pt-4">
                    <TextLink href={resolveHref(s.buttonLink, slug)} external={/^https?:\/\//.test(s.buttonLink)}>
                      {tx(s.buttonText, locale)}
                    </TextLink>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {d.viewAll?.href && tx(d.viewAll.label, locale) && (
        <div className="mt-8 flex justify-center">
          <FilledButton href={resolveHref(d.viewAll.href, slug)} external={/^https?:\/\//.test(d.viewAll.href)}>
            {tx(d.viewAll.label, locale)}
          </FilledButton>
        </div>
      )}
    </Band>
  );
}
