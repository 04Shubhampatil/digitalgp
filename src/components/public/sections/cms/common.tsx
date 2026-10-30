import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { Band, Icon, LinkButton, cardClass, externalProps, list, mediaUrl, plain, readableText, tx, withOpacity, type B } from "./kit";

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
}

/** `top-stats` / `green-scoreboard`: statistic cards (icon, value + unit, title, description). */
export function TopStatsSection({ locale, data }: SectionProps) {
  const d = data as { items?: unknown; heading?: B; subheading?: B; variant?: "tiles" | "strip" };
  const items = list<StatItem>(d.items).filter((i) => i.visible !== false);
  if (items.length === 0) return null;
  const strip = d.variant === "strip";
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
export function SupportCardsSection({ locale, data }: SectionProps) {
  return <SupportCards locale={locale} data={data} />;
}

/** `local-opportunities`: the second card list on the Employment page. */
export async function LocalOpportunitiesSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  return <SupportCards locale={locale} data={data} heading={t("localOpportunities")} figureFirst />;
}

interface IconCardItem {
  icon?: string;
  title?: B;
  link?: string;
  active?: boolean;
}

/** `assistance-items`: icon tiles that link to assistance pages. */
export async function AssistanceItemsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<IconCardItem>((data as { items?: unknown }).items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={t("assistance")} tone="cream">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((c, i) => {
          const inner = (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                <Icon name={c.icon} />
              </span>
              <span className="mt-3 text-[14px] font-semibold text-black">{tx(c.title, locale)}</span>
            </>
          );
          return (
            <li key={i}>
              {c.link ? (
                <Link href={resolveHref(c.link, slug)} className={`${cardClass} flex flex-col items-center text-center hover:shadow-md`}>
                  {inner}
                </Link>
              ) : (
                <div className={`${cardClass} flex flex-col items-center text-center`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ stories & programs

interface StoryItem {
  imageId?: string;
  title?: B;
  description?: B;
  buttonText?: B;
  buttonLink?: string;
  order?: number;
}

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

/** `success-stories`: story cards with photo, text and an optional button. */
export async function CmsSuccessStoriesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<StoryItem>((data as { items?: unknown }).items).sort(byOrder);
  if (items.length === 0) return null;
  return (
    <Band heading={t("successStories")}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => {
          const img = mediaUrl(slug, s.imageId);
          return (
            <li key={i} className={`${cardClass} flex flex-col overflow-hidden !p-0`}>
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={img} alt="" loading="lazy" className="h-44 w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[15px] font-semibold text-black">{tx(s.title, locale)}</p>
                {tx(s.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(s.description, locale)}</p>}
                {s.buttonLink && tx(s.buttonText, locale) && (
                  <div className="mt-auto pt-3">
                    <LinkButton href={resolveHref(s.buttonLink, slug)} external={/^https?:\/\//.test(s.buttonLink)}>
                      {tx(s.buttonText, locale)} <ArrowRight className="size-3.5" aria-hidden />
                    </LinkButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

interface ProgramItem {
  thumbnailImageId?: string;
  title?: B;
  shortDescription?: B;
  ctaText?: B;
  ctaLink?: string;
  order?: number;
  status?: "active" | "inactive";
  featured?: boolean;
}

/** `training-programs`: active programs, featured ones first. */
export async function TrainingProgramsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<ProgramItem>((data as { items?: unknown }).items)
    .filter((p) => p.status !== "inactive")
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || byOrder(a, b));
  if (items.length === 0) return null;
  return (
    <Band heading={t("trainingPrograms")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => {
          const img = mediaUrl(slug, p.thumbnailImageId);
          return (
            <li key={i} className={`${cardClass} flex flex-col overflow-hidden !p-0`}>
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={img} alt="" loading="lazy" className="h-40 w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-4">
                {p.featured && <span className="mb-2 w-fit rounded-full bg-[#f5871f]/15 px-2 py-0.5 text-[11px] font-semibold text-[#c25f00]">{t("featured")}</span>}
                <p className="text-[15px] font-semibold text-black">{tx(p.title, locale)}</p>
                {tx(p.shortDescription, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(p.shortDescription, locale)}</p>}
                {p.ctaLink && (
                  <div className="mt-auto pt-3">
                    <LinkButton href={resolveHref(p.ctaLink, slug)} external={/^https?:\/\//.test(p.ctaLink)}>
                      {tx(p.ctaText, locale) || t("learnMore")}
                    </LinkButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

interface SchemeCardItem {
  icon?: string;
  title?: B;
  description?: B;
  buttonText?: B;
  buttonLink?: string;
  active?: boolean;
}

/** `scheme-cards`: Education page scheme tiles. */
export async function SchemeCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<SchemeCardItem>((data as { items?: unknown }).items).filter((c) => c.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={t("schemeCards")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((c, i) => (
          <li key={i} className={`${cardClass} flex flex-col`}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={c.icon} />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-black">{tx(c.title, locale)}</p>
            {tx(c.description, locale) && <p className="mt-1 text-[12px] leading-5 text-[#414141]">{tx(c.description, locale)}</p>}
            {c.buttonLink && (
              <div className="mt-auto pt-3">
                <LinkButton href={resolveHref(c.buttonLink, slug)} external={/^https?:\/\//.test(c.buttonLink)}>
                  {tx(c.buttonText, locale) || t("learnMore")}
                </LinkButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Band>
  );
}
