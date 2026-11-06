import { ChevronRight, CircleCheck, House } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import {
  HeritageCarousel,
  YouthSpeakClient,
  type YouthPostCard,
} from "./village-client";
import {
  Band,
  FilledButton,
  Icon,
  TextLink,
  VideoEmbed,
  externalProps,
  list,
  mediaUrl,
  plain,
  tx,
  type B,
} from "./kit";

/**
 * Figma layouts of the Our Village (culture), Employment and Education pages. The section data shapes
 * are the backend ones (src/config/sections-pages.ts); a few optional presentation fields (`heading`,
 * `viewAll`, `link`, `colour`, captions) are read when present — placeholder content sets them, the
 * backend does not have them yet (docs/backend-needs).
 */

type Locale = SectionProps["locale"];
interface Btn {
  label?: B;
  href?: string;
}
const isExternal = (href: string) => /^https?:\/\//.test(href);
const byOrder = <T extends { order?: number }>(a: T, b: T) =>
  (a.order ?? 0) - (b.order ?? 0);

/** "View All …" pill under a block, when the data names a target. */
function ViewAll({
  btn,
  slug,
  locale,
  className,
  small,
}: {
  btn: Btn | undefined;
  slug: string;
  locale: Locale;
  className?: string;
  /** Figma's small pill (12.5px, 33px tall) instead of the 14px / 39px one. */
  small?: boolean;
}) {
  if (!btn?.href || !tx(btn.label, locale)) return null;
  if (small)
    return (
      <div className={`flex justify-center ${className ?? "mt-8"}`}>
        <a
          href={resolveHref(btn.href, slug)}
          {...(isExternal(btn.href) ? externalProps : {})}
          className="inline-flex items-center justify-center rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"
        >
          {tx(btn.label, locale)}
        </a>
      </div>
    );
  return (
    <div className={`flex justify-center ${className ?? "mt-8"}`}>
      <FilledButton
        href={resolveHref(btn.href, slug)}
        external={isExternal(btn.href)}
      >
        {tx(btn.label, locale)}
      </FilledButton>
    </div>
  );
}

// ------------------------------------------------------------------------------------ Our Village: history + heritage

interface IntroData {
  heading?: B;
  iconId?: string;
  title?: B;
  description?: B;
  buttonLabel?: B;
  buttonLink?: string;
}
type HeritageItem = { title?: B; description?: B; imageId?: string };

function HistoryCard({
  slug,
  locale,
  d,
}: {
  slug: string;
  locale: Locale;
  d: IntroData;
}) {
  const icon = mediaUrl(slug, d.iconId);
  return (
    <div className="flex h-full flex-col items-start gap-6 rounded-[10px] border border-black/10 bg-white px-8 py-6 sm:flex-row sm:items-center">
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
        <img
          src={icon}
          alt=""
          className="size-[115px] shrink-0 rounded-full object-contain"
        />
      )}
      <div className="min-w-0">
        <h3 className="text-[20px] leading-7 font-semibold text-black">
          {tx(d.title, locale)}
        </h3>
        {tx(d.description, locale) && (
          <p className="mt-2 text-[14px] leading-6 text-[#414141]">
            {tx(d.description, locale)}
          </p>
        )}
        {d.buttonLink && tx(d.buttonLabel, locale) && (
          <TextLink
            href={resolveHref(d.buttonLink, slug)}
            external={isExternal(d.buttonLink)}
            className="mt-6 text-[15px]"
          >
            {tx(d.buttonLabel, locale)}
          </TextLink>
        )}
      </div>
    </div>
  );
}

/**
 * `village-intro`: the History card. When the page also has `heritage-cards`, both share one block —
 * "Our Village History and Heritage" with the card on the left and the temple carousel on the right.
 */
export async function VillageIntroSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as IntroData;
  const heritage = list<HeritageItem>(
    (siblings?.["heritage-cards"] as { items?: unknown } | undefined)?.items,
  );
  if (heritage.length === 0) {
    return (
      <Band tone="cream" heading={tx(d.heading, locale) || undefined}>
        <HistoryCard slug={slug} locale={locale} d={d} />
      </Band>
    );
  }
  return (
    <Band tone="cream" heading={tx(d.heading, locale) || t("historyHeritage")} pad="pt-10 pb-10 lg:pt-[77px] lg:pb-[62px]" headGap="mb-2 lg:mb-0">
      <div className="grid gap-[9px] lg:grid-cols-[450px_minmax(0,1fr)]">
        <HistoryCard slug={slug} locale={locale} d={d} />
        <HeritageCarousel
          items={heritage.map((h) => ({
            title: tx(h.title, locale),
            description: tx(h.description, locale),
            image: mediaUrl(slug, h.imageId),
          }))}
          prevLabel={t("previous")}
          nextLabel={t("next")}
        />
      </div>
    </Band>
  );
}

/** `heritage-cards`: shown inside the History block when `village-intro` is on the page, else on its own. */
export async function HeritageCardsSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  if (siblings?.["village-intro"]) return null;
  const t = await getTranslations("public.cms");
  const items = list<HeritageItem>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band tone="cream" heading={t("historyHeritage")}>
      <HeritageCarousel
        items={items.map((h) => ({
          title: tx(h.title, locale),
          description: tx(h.description, locale),
          image: mediaUrl(slug, h.imageId),
        }))}
        prevLabel={t("previous")}
        nextLabel={t("next")}
      />
    </Band>
  );
}

/** `culture-cards`: four tall photo cards ("Culture Tradition & Our Way of Life"). */
export async function CultureCardsSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; heading?: B; items?: unknown };
  const items = list<HeritageItem>(d.items);
  if (d.enabled === false || items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("culture")} tone="cream" pad="pt-10 pb-6 lg:pt-[62px] lg:pb-[22px]" headGap="mb-6 lg:mb-[44px]">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => {
          const img = mediaUrl(slug, c.imageId);
          return (
            <li
              key={i}
              className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.12)]"
            >
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  className="h-[275px] w-full object-cover"
                />
              )}
              <div className="px-5 pt-7 pb-[45px]">
                <p className="text-[22px] leading-[30px] font-semibold text-black">
                  {tx(c.title, locale)}
                </p>
                {tx(c.description, locale) && (
                  <p className="mt-3.5 text-[17px] leading-[33px] text-[#414141]">
                    {tx(c.description, locale)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `homestay`: photo on the left, text in the middle, feature chips stacked on the right (one tinted strip). */
export function HomestaySection({ slug, locale, data }: SectionProps) {
  const d = data as {
    heading?: B;
    description?: B;
    buttonLabel?: B;
    buttonLink?: string;
    imageId?: string;
    features?: unknown;
  };
  const img = mediaUrl(slug, d.imageId);
  const features = list<{ icon?: string; title?: B }>(d.features);
  return (
    <Band tone="cream" pad="py-6 lg:py-[22px]">
      <div
        className={`grid items-center overflow-hidden rounded-[10px] bg-[#f3f1ec] ${img ? "lg:grid-cols-[540px_minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img
            src={img}
            alt=""
            loading="lazy"
            className="h-[210px] w-full object-cover"
          />
        )}
        <div className="px-6 py-6 lg:px-[45px]">
          <h2 className="flex items-center gap-4 text-[18px] leading-6 font-semibold text-[#135130]">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#135130]/10"
            >
              <House className="size-5" />
            </span>
            {tx(d.heading, locale)}
          </h2>
          {tx(d.description, locale) && (
            <p className="mt-3 max-w-[330px] text-[15px] leading-[25px] text-[#333]">
              {tx(d.description, locale)}
            </p>
          )}
          {d.buttonLink && tx(d.buttonLabel, locale) && (
            <TextLink
              href={resolveHref(d.buttonLink, slug)}
              external={isExternal(d.buttonLink)}
              className="mt-4"
            >
              {tx(d.buttonLabel, locale)}
            </TextLink>
          )}
        </div>
        {features.length > 0 && (
          <ul className="space-y-[1px] px-6 pb-6 lg:w-[348px] lg:px-0 lg:pr-[80px] lg:pb-0">
            {features.map((f, i) => (
              <li
                key={i}
                className="flex h-[46px] items-center gap-4 rounded-[8px] bg-white px-6 text-[14.5px] whitespace-nowrap text-black"
              >
                <Icon
                  name={f.icon}
                  className="size-7 shrink-0 text-[#135130]"
                />
                {tx(f.title, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Band>
  );
}

/** `leader-cards`: distinguished personalities — portrait, name, italic designation, one line. */
export async function LeaderCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{
    photoId?: string;
    name?: B;
    designation?: B;
    description?: B;
  }>(d.items);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("leaders")} tone="cream" pad="py-6 lg:pt-[22px] lg:pb-[25px]" headGap="mb-6 lg:mb-[35px]">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => {
          const photo = mediaUrl(slug, p.photoId);
          return (
            <li
              key={i}
              className="rounded-[8px] bg-white px-4 pt-2 pb-6 text-center shadow-[0_0_10px_rgba(0,0,0,0.12)]"
            >
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="mx-auto h-[162px] w-[155px] rounded-[6px] object-cover"
                />
              )}
              <p className="mt-4 text-[16px] font-semibold text-black">
                {tx(p.name, locale)}
              </p>
              {tx(p.designation, locale) && (
                <p className="text-[14px] text-[#414141] italic">
                  {tx(p.designation, locale)}
                </p>
              )}
              {tx(p.description, locale) && (
                <p className="mx-auto mt-3 max-w-[240px] text-[14px] leading-6 text-[#414141]">
                  {tx(p.description, locale)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `fpo-gallery-voice`: Farmer Producer Organisation, Virtual Gallery collage and Voice of the Village — three cards. */
export async function FpoGalleryVoiceSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    enabled?: boolean;
    fpo?: {
      iconId?: string;
      title?: B;
      description?: B;
      points?: unknown;
      link?: string;
      linkLabel?: B;
    };
    gallery?: {
      title?: B;
      description?: B;
      imageIds?: unknown;
      link?: string;
      linkLabel?: B;
    };
    voice?: {
      title?: B;
      description?: B;
      videoId?: string;
      videoUrl?: string;
      imageId?: string;
      link?: string;
      linkLabel?: B;
    };
  };
  if (d.enabled === false) return null;
  const fpoIcon = mediaUrl(slug, d.fpo?.iconId);
  const points = list<B>(d.fpo?.points).filter((p) => tx(p, locale));
  const images = list<string>(d.gallery?.imageIds).filter(Boolean);
  const video = mediaUrl(slug, d.voice?.videoId);
  const voiceImage = mediaUrl(slug, d.voice?.imageId);
  const showFpo = !!tx(d.fpo?.title, locale);
  const showGallery = images.length > 0 || !!tx(d.gallery?.title, locale);
  const showVoice = !!(video || d.voice?.videoUrl || voiceImage);
  const count = [showFpo, showGallery, showVoice].filter(Boolean).length;
  if (count === 0) return null;
  const card =
    "flex flex-col rounded-[10px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.12)] lg:min-h-[371px]";
  const title = "text-[20px] leading-7 font-semibold text-[#135130]";
  // Gallery link: the website's own Gallery page unless the data names another target.
  const galleryLink = d.gallery?.link ?? "page:gallery";
  return (
    <Band tone="cream" pad="py-6 lg:pt-[24px] lg:pb-[38px]">
      <div
        className={`grid gap-[34px] ${count === 3 ? "lg:grid-cols-[441fr_402fr_403fr]" : count === 2 ? "lg:grid-cols-2" : ""}`}
      >
        {showFpo && (
          <div className={card}>
            <h3 className={title}>{tx(d.fpo?.title, locale)}</h3>
            <div className="mt-3 flex flex-1 gap-6">
              {fpoIcon && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img
                  src={fpoIcon}
                  alt=""
                  className="w-[104px] shrink-0 self-center object-contain"
                />
              )}
              <div className="min-w-0">
                {tx(d.fpo?.description, locale) && (
                  <p className="text-[14px] leading-[27px] text-[#414141]">
                    {tx(d.fpo?.description, locale)}
                  </p>
                )}
                {points.length > 0 && (
                  <ul className="mt-4 space-y-3 text-[14px] text-black">
                    {points.map((p, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CircleCheck
                          className="size-[18px] shrink-0 text-[#135130]"
                          aria-hidden
                        />
                        {tx(p, locale)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {d.fpo?.link && (
              <TextLink
                href={resolveHref(d.fpo.link, slug)}
                external={isExternal(d.fpo.link)}
                className="mt-6 self-start sm:ml-[130px]"
              >
                {tx(d.fpo.linkLabel, locale) || t("learnMore")}
              </TextLink>
            )}
          </div>
        )}
        {showGallery && (
          <div className={card}>
            <h3 className={title}>{tx(d.gallery?.title, locale)}</h3>
            {tx(d.gallery?.description, locale) && (
              <p className="mt-1 max-w-[260px] text-[15px] leading-[25px] text-[#414141]">
                {tx(d.gallery?.description, locale)}
              </p>
            )}
            {images.length > 0 && (
              <div className="mt-3 space-y-1">
                {[images.slice(0, 2), images.slice(2, 4)].map((row, r) =>
                  row.length > 0 ? (
                    <div
                      key={r}
                      className={`grid gap-1 ${row.length === 1 ? "" : r === 0 ? "grid-cols-[45fr_55fr]" : "grid-cols-[60fr_40fr]"}`}
                    >
                      {row.map((id) => (
                        // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                        <img
                          key={id}
                          src={mediaUrl(slug, id)}
                          alt=""
                          loading="lazy"
                          className="h-[98px] w-full rounded-[4px] object-cover"
                        />
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            )}
            <TextLink
              href={resolveHref(galleryLink, slug)}
              external={isExternal(galleryLink)}
              className="mt-auto pt-4"
            >
              {tx(d.gallery?.linkLabel, locale) || t("exploreGallery")}
            </TextLink>
          </div>
        )}
        {showVoice && (
          <div className={card}>
            <h3 className={title}>{tx(d.voice?.title, locale)}</h3>
            {tx(d.voice?.description, locale) && (
              <p className="mt-2 text-[15px] leading-[27px] text-[#414141]">
                {tx(d.voice?.description, locale)}
              </p>
            )}
            <div className="mt-3">
              {video ? (
                <video
                  src={video}
                  controls
                  preload="metadata"
                  className="aspect-video w-full rounded-[6px] bg-black"
                />
              ) : d.voice?.videoUrl ? (
                <VideoEmbed
                  url={d.voice.videoUrl}
                  title={tx(d.voice?.title, locale)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img
                  src={voiceImage}
                  alt=""
                  loading="lazy"
                  className="h-[166px] w-full rounded-[6px] object-cover"
                />
              )}
            </div>
            {d.voice?.link && (
              <TextLink
                href={resolveHref(d.voice.link, slug)}
                external={isExternal(d.voice.link)}
                className="mt-auto pt-4"
              >
                {tx(d.voice.linkLabel, locale) || t("watchVideos")}
              </TextLink>
            )}
          </div>
        )}
      </div>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Employment / Education

interface SupportItem {
  icon?: string;
  /** Placeholder only: path of the Figma pictogram shown instead of `icon`. */
  iconImage?: string;
  title?: B;
  description?: B;
  contactOrAction?: string;
  link?: string;
  visible?: boolean;
}

/** `support-cards` with `layout: "strip"`: one white strip overlapping the hero, six tiles split by dividers. */
export function SupportStripSection({ slug, locale, data }: SectionProps) {
  const items = list<SupportItem>((data as { items?: unknown }).items).filter(
    (i) => i.visible !== false,
  );
  if (items.length === 0) return null;
  // Figma: the strip overlaps the hero by 72px (Employment) or 111px (Education); pictograms are 84 / 92px.
  // `spacious` (Education): 280px strip with more air between pictogram, title and caption.
  const opt = data as { overlap?: number; iconSize?: number; spacious?: boolean };
  const sp = !!opt.spacious;
  const overlap = opt.overlap ?? 72;
  const iconSize = opt.iconSize ?? 84;
  return (
    <section
      style={{ "--ov": `${overlap}px` } as React.CSSProperties}
      className="relative z-10 bg-cream pt-8 pb-4 lg:-mt-[var(--ov)] lg:bg-[linear-gradient(to_bottom,transparent_var(--ov),var(--color-cream)_var(--ov))] lg:pt-0"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <ul className={`grid grid-cols-2 gap-y-4 bg-white shadow-[0_0_14px_rgba(0,0,0,0.12)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-black/10 ${sp ? "rounded-[10px] pt-[18px] pb-[31px]" : "rounded-[16px] py-5"}`}>
          {items.map((c, i) => {
            const inner = (
              <>
                {c.iconImage ? (
                  // Placeholder content: the Figma pictogram (filled glyph in its tinted circle), sliced from the design.
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset
                  <img src={c.iconImage} alt="" width={iconSize} height={iconSize} style={{ width: iconSize, height: iconSize }} />
                ) : (
                  <span className="flex size-[84px] items-center justify-center rounded-full bg-[#eef4ef] text-[#135130]">
                    <Icon name={c.icon} className="size-11" />
                  </span>
                )}
                <span className={`leading-6 font-semibold text-black ${sp ? "mt-[22px] text-[17px]" : "mt-4 text-[16px]"}`}>
                  {tx(c.title, locale)}
                </span>
                {tx(c.description, locale) && (
                  <span className={`leading-[28px] text-[#414141] ${sp ? "mt-[21px] text-[15.5px]" : "mt-2 text-[15px]"}`}>
                    {tx(c.description, locale)}
                  </span>
                )}
                {c.contactOrAction && (
                  <span className="mt-1 text-[13px] font-medium text-[#135130]">
                    {plain(c.contactOrAction, locale)}
                  </span>
                )}
              </>
            );
            const cls =
              "flex h-full flex-col items-center px-4 py-2 text-center";
            return (
              <li key={i}>
                {c.link ? (
                  <a
                    href={resolveHref(c.link, slug)}
                    {...(isExternal(c.link) ? externalProps : {})}
                    className={`${cls} rounded-[10px] hover:bg-[#135130]/5`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Icon colours of the coloured-icon lists (Figma: green, purple, blue, orange …). */
const ICON_COLOURS = ["#138808", "#6d3fc0", "#1a62e0", "#f5871f", "#7c3aed"];

/** `local-opportunities`: big coloured icon, large green figure, title and caption per card. */
export async function LocalOpportunitiesSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown; viewAll?: Btn };
  const items = list<SupportItem & { colour?: string }>(d.items).filter(
    (i) => i.visible !== false,
  );
  if (items.length === 0) return null;
  // Figma Employment "Local Opportunities": 314×288 cards, 92px pictogram, 40px green count, 20 / 17px text.
  return (
    <Band
      heading={tx(d.heading, locale) || t("localOpportunities")}
      tone="cream"
      pad="py-8 lg:pt-[15px] lg:pb-[47px]"
      headGap="mb-6 lg:mb-[31px]"
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => (
          <li
            key={i}
            className="flex flex-col items-center rounded-[12px] border-[1.2px] border-[#414141]/15 bg-white px-4 pt-5 pb-8 text-center shadow-[0_0_20px_rgba(0,0,0,0.25)] lg:h-[288px] lg:pb-0"
          >
            {c.iconImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- static design asset
              <img src={c.iconImage} alt="" width={92} height={91} className="h-[91px] w-[92px]" />
            ) : (
              <span
                className="flex h-[91px] items-center"
                style={{
                  color: c.colour ?? ICON_COLOURS[i % ICON_COLOURS.length],
                }}
              >
                <Icon name={c.icon} className="size-[60px]" />
              </span>
            )}
            {c.contactOrAction && (
              <p className="text-[39.5px] leading-[54px] font-bold text-[#135130]">
                {plain(c.contactOrAction, locale)}
              </p>
            )}
            <p className="mt-2.5 text-[19.7px] leading-[27px] font-semibold text-[#414141]">
              {tx(c.title, locale)}
            </p>
            {tx(c.description, locale) && (
              <p className="mt-2 text-[17.3px] leading-6 text-[#414141]">
                {tx(c.description, locale)}
              </p>
            )}
          </li>
        ))}
      </ul>
      <ViewAll btn={d.viewAll} slug={slug} locale={locale} className="mt-8 lg:mt-[29px]" small />
    </Band>
  );
}

/** `skill-directory` (card; sits beside the Farmer Assistance Centre): square skill tiles, 4 × 2. */
export async function SkillDirectorySection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    subheading?: B;
    items?: unknown;
    viewAll?: Btn;
  };
  const items = list<{
    icon?: string;
    /** Placeholder only: the Figma pictogram shown instead of `icon`. */
    iconImage?: string;
    skillName?: B;
    availableCount?: number;
    countIsApproximate?: boolean;
    link?: string;
    active?: boolean;
  }>(d.items).filter((s) => s.active !== false);
  if (items.length === 0) return null;
  return (
    // Figma Employment "Village Talent Directory": 759×591 card, 4 × 2 tiles of 160×201 with 85px pictograms.
    <div className="rounded-[10px] border border-black/15 bg-white px-5 pt-[17px] pb-[18px] sm:px-8">
      <h2 className="text-center text-[26px] leading-tight font-semibold text-black lg:text-[30px] lg:leading-[53px]">
        {tx(d.heading, locale) || t("skillDirectory")}
      </h2>
      <p className="text-center text-[18px] leading-[36px] text-black lg:text-[20px]">
        {tx(d.subheading, locale) || t("skillDirectorySub")}
      </p>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {items.map((s, i) => {
          const inner = (
            <>
              {s.iconImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- static design asset
                <img src={s.iconImage} alt="" width={85} height={84} className="h-[84px] w-[85px]" />
              ) : (
                <span className="flex size-[84px] items-center justify-center rounded-full bg-[#eef4ef] text-[#135130]">
                  <Icon name={s.icon} className="size-9" />
                </span>
              )}
              <span className="mt-2.5 text-[18px] leading-[35px] font-semibold text-black lg:text-[19px]">
                {tx(s.skillName, locale)}
              </span>
              {typeof s.availableCount === "number" ? (
                <span className="mt-1.5 text-[10px] leading-[17px] text-[#135130]">
                  <b>
                    {s.countIsApproximate
                      ? `≈ ${s.availableCount}`
                      : s.availableCount}
                  </b>{" "}
                  {t("availableWord")}
                </span>
              ) : (
                s.link && (
                  <span className="mt-1.5 text-[10px] leading-[17px] font-semibold text-[#135130]">
                    {t("exploreAll")}
                  </span>
                )
              )}
            </>
          );
          const cls =
            "flex h-[201px] flex-col items-center justify-center rounded-[10px] border border-black/25 px-2 text-center";
          return (
            <li key={i}>
              {s.link ? (
                <a
                  href={resolveHref(s.link, slug)}
                  {...(isExternal(s.link) ? externalProps : {})}
                  className={`${cls} hover:shadow-md`}
                >
                  {inner}
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <ViewAll btn={d.viewAll} slug={slug} locale={locale} className="mt-3" />
    </div>
  );
}

/** `assistance-items` (card): Farmer Assistance Centre — coloured icon, title + caption, chevron per row. */
export async function AssistanceItemsSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    subheading?: B;
    items?: unknown;
    viewAll?: Btn;
  };
  const items = list<{
    icon?: string;
    /** Placeholder only: the Figma pictogram shown instead of `icon`. */
    iconImage?: string;
    title?: B;
    description?: B;
    colour?: string;
    link?: string;
    active?: boolean;
  }>(d.items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  const colours = ["#f5871f", "#1a62e0", "#3f9b2f", "#6d3fc0", "#f59e0b"];
  return (
    <div
      id="farmer-assistance"
      className="scroll-mt-[180px] rounded-[10px] border border-black/10 bg-white px-5 pt-6 pb-[30px] shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:px-7"
    >
      <h2 className="text-center text-[22px] leading-[33px] font-semibold text-black">
        {tx(d.heading, locale) || t("farmerCentre")}
      </h2>
      <p className="mt-1 text-center text-[15px] text-[#414141]">
        {tx(d.subheading, locale) || t("farmerCentreSub")}
      </p>
      <ul className="mt-6 space-y-1.5">
        {items.map((c, i) => {
          const inner = (
            <>
              {c.iconImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- static design asset
                <img src={c.iconImage} alt="" width={50} height={50} className="size-[50px] shrink-0" />
              ) : (
                <span className="flex size-[50px] shrink-0 items-center justify-center" style={{ color: c.colour ?? colours[i % colours.length] }}>
                  <Icon name={c.icon} className="size-8" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] leading-6 font-semibold text-black">
                  {tx(c.title, locale)}
                </span>
                {tx(c.description, locale) && (
                  <span className="mt-1 block text-[13.5px] leading-5 text-[#414141]">
                    {tx(c.description, locale)}
                  </span>
                )}
              </span>
              {c.link && (
                <ChevronRight
                  className="size-5 shrink-0 text-[#135130]"
                  aria-hidden
                />
              )}
            </>
          );
          const cls =
            "flex min-h-[74px] items-center gap-5 rounded-[8px] border border-black/10 bg-white px-6 py-3";
          return (
            <li key={i}>
              {c.link ? (
                <a
                  href={resolveHref(c.link, slug)}
                  {...(isExternal(c.link) ? externalProps : {})}
                  className={`${cls} hover:shadow-md`}
                >
                  {inner}
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <ViewAll btn={d.viewAll} slug={slug} locale={locale} className="mt-6" />
    </div>
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
interface PortalItem {
  logoId?: string;
  name?: B;
  description?: B;
  websiteUrl?: string;
  order?: number;
  active?: boolean;
}

function programsOf(data: unknown): ProgramItem[] {
  return list<ProgramItem>((data as { items?: unknown } | undefined)?.items)
    .filter((p) => p.status !== "inactive")
    .sort(
      (a, b) => Number(!!b.featured) - Number(!!a.featured) || byOrder(a, b),
    );
}
function portalsOf(data: unknown): PortalItem[] {
  return list<PortalItem>((data as { items?: unknown } | undefined)?.items)
    .filter((p) => p.active !== false)
    .sort(byOrder);
}

async function ProgramsCard({
  slug,
  locale,
  items,
}: {
  slug: string;
  locale: Locale;
  items: ProgramItem[];
}) {
  const t = await getTranslations("public.cms");
  return (
    <ul className="rounded-[10px] border border-black/10 bg-white px-6 shadow-[0_0_10px_rgba(0,0,0,0.06)]">
      {items.map((p, i) => {
        const img = mediaUrl(slug, p.thumbnailImageId);
        return (
          <li key={i} className="flex items-center gap-7 py-3">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
              <img
                src={img}
                alt=""
                loading="lazy"
                className="h-[88px] w-[128px] shrink-0 rounded-[6px] object-cover"
              />
            )}
            <div className="min-w-0">
              {p.featured && (
                <span className="mb-1 inline-block rounded-full bg-[#f5871f]/15 px-2 py-0.5 text-[11px] font-semibold text-[#c25f00]">
                  {t("featured")}
                </span>
              )}
              <p className="text-[18px] leading-6 font-semibold text-black">
                {tx(p.title, locale)}
              </p>
              {tx(p.shortDescription, locale) && (
                <p className="mt-0.5 text-[15.5px] leading-[26px] text-[#555]">
                  {tx(p.shortDescription, locale)}
                </p>
              )}
              {p.ctaLink && (
                <TextLink
                  href={resolveHref(p.ctaLink, slug)}
                  external={isExternal(p.ctaLink)}
                  className="mt-1 text-[15px]"
                >
                  {tx(p.ctaText, locale) || t("viewDetails")}
                </TextLink>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function PortalsCard({
  slug,
  locale,
  items,
  d,
}: {
  slug: string;
  locale: Locale;
  items: PortalItem[];
  d: { heading?: B; subheading?: B; viewAll?: Btn };
}) {
  const t = await getTranslations("public.cms");
  return (
    <div
      id="gov-job-portals"
      className="scroll-mt-[180px] rounded-[10px] border border-black/10 bg-white px-6 pt-6 pb-5 shadow-[0_0_10px_rgba(0,0,0,0.06)] lg:pr-8 lg:pl-[52px]"
    >
      <h3 className="text-[20px] leading-7 font-semibold text-black">
        {tx(d.heading, locale) || t("jobPortals")}
      </h3>
      <p className="mt-1 text-[15px] text-[#414141]">
        {tx(d.subheading, locale) || t("jobPortalsSub")}
      </p>
      <ul className="mt-3 space-y-0">
        {items.map((p, i) => {
          const logo = mediaUrl(slug, p.logoId);
          const inner = (
            <>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img
                  src={logo}
                  alt=""
                  loading="lazy"
                  className="size-[50px] shrink-0 object-contain"
                />
              )}
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-black">
                  {tx(p.name, locale)}
                </span>
                {tx(p.description, locale) && (
                  <span className="block text-[14px] text-[#414141]">
                    {tx(p.description, locale)}
                  </span>
                )}
              </span>
            </>
          );
          const cls =
            "flex items-center gap-8 rounded-[8px] border border-black/10 bg-white px-5 py-3";
          return (
            <li key={i}>
              {p.websiteUrl ? (
                <a
                  href={p.websiteUrl}
                  {...externalProps}
                  className={`${cls} hover:shadow-md`}
                >
                  {inner}
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {d.viewAll?.href && tx(d.viewAll.label, locale) && (
        <div className="mt-4 flex justify-center">
          <TextLink
            href={resolveHref(d.viewAll.href, slug)}
            external={isExternal(d.viewAll.href)}
          >
            {tx(d.viewAll.label, locale)}
          </TextLink>
        </div>
      )}
    </div>
  );
}

/**
 * `training-programs`: program rows (thumbnail, title, caption, "View Details →"). When the page also has
 * `job-portals`, both share one block: "Training Programs & Digital Literacy" with the portals card on the right.
 */
export async function TrainingProgramsSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = programsOf(data);
  const portalsData = siblings?.["job-portals"] as
    { heading?: B; subheading?: B; viewAll?: Btn } | undefined;
  const portals = portalsOf(portalsData);
  if (items.length === 0 && portals.length === 0) return null;
  const heading = tx((data as { heading?: B }).heading, locale);
  if (portals.length === 0) {
    return (
      <Band heading={heading || t("trainingPrograms")}>
        <ProgramsCard slug={slug} locale={locale} items={items} />
      </Band>
    );
  }
  return (
    <Band heading={heading || t("trainingDigital")} pad="py-8 lg:pt-[23px] lg:pb-0">
      <div
        className={`grid items-stretch gap-6 ${items.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] lg:gap-[43px]" : ""}`}
      >
        {items.length > 0 && (
          <>
            <ProgramsCard slug={slug} locale={locale} items={items} />
            <span
              aria-hidden
              className="hidden h-[60%] w-px self-center bg-black/30 lg:block"
            />
          </>
        )}
        <PortalsCard
          slug={slug}
          locale={locale}
          items={portals}
          d={portalsData ?? {}}
        />
      </div>
    </Band>
  );
}

/** `job-portals`: shown beside the training programs when both are on the page, else on its own. */
export async function JobPortalsSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  if (programsOf(siblings?.["training-programs"]).length > 0) return null;
  const items = portalsOf(data);
  if (items.length === 0) return null;
  return (
    <Band>
      <div className="mx-auto max-w-[640px]">
        <PortalsCard
          slug={slug}
          locale={locale}
          items={items}
          d={data as { heading?: B; subheading?: B; viewAll?: Btn }}
        />
      </div>
    </Band>
  );
}

/**
 * `student-spotlight`: an identifiable child. Never shown unless the guardian's consent is recorded as
 * confirmed (the backend also requires it before the section can be submitted for review).
 */
export async function StudentSpotlightSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    photoId?: string;
    name?: B;
    classAndSchool?: B;
    achievements?: B;
    quote?: B;
    buttonText?: B;
    buttonLink?: string;
    achievementCards?: unknown;
    guardianConsent?: { confirmed?: boolean };
  };
  if (d.guardianConsent?.confirmed !== true) return null;
  const photo = mediaUrl(slug, d.photoId);
  const cards = list<{
    icon?: string;
    /** Placeholder only: the Figma pictogram shown instead of `icon`. */
    iconImage?: string;
    title?: B;
    value?: string;
    colour?: string;
  }>(d.achievementCards);
  const [klass, ...school] = tx(d.classAndSchool, locale)
    .split("|")
    .map((s) => s.trim());
  const colours = [
    "#1a62e0",
    "#138808",
    "#f5871f",
    "#1a62e0",
    "#6d3fc0",
    "#e2502b",
  ];
  return (
    // Figma Education spotlight: 1318×374 card, 231×318 photo, 21.7 / 17.4px text, 234×128 stat boxes.
    <Band tone="cream" pad="py-8 lg:pt-[46px] lg:pb-[13px]">
      <div className="grid items-center gap-8 rounded-[11px] border border-[#414141]/20 bg-white p-6 lg:grid-cols-[231px_minmax(0,1fr)_minmax(0,498px)] lg:gap-10 lg:py-[26px] lg:pr-[38px] lg:pl-[35px]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img
            src={photo}
            alt={tx(d.name, locale)}
            loading="lazy"
            className="mx-auto h-[318px] w-[231px] rounded-[11px] object-cover"
          />
        )}
        <div>
          <h2 className="text-[21.7px] leading-[26px] font-semibold text-[#135130]">
            {tx(d.name, locale)}
          </h2>
          {klass && (
            <p className="mt-5 text-[17.35px] leading-[21px] text-[#414141]">
              {klass}
              {school.length > 0 && (
                <span className="ml-2 border-l border-black/30 pl-2">
                  {school.join(" | ")}
                </span>
              )}
            </p>
          )}
          {tx(d.achievements, locale) && (
            <p className="mt-[26px] max-w-[366px] text-[17.35px] leading-[26px] text-[#414141]">
              <span className="font-medium text-black">
                {t("achievementsLabel")}
              </span>{" "}
              {tx(d.achievements, locale)}
            </p>
          )}
          {tx(d.quote, locale) && (
            <figure className="mt-[37px] max-w-[345px] text-[17.35px] leading-[26px] text-[#414141]">
              <blockquote>&ldquo;{tx(d.quote, locale)}&rdquo;</blockquote>
              <figcaption className="mt-1 pl-3">
                &bull; {tx(d.name, locale)}
              </figcaption>
            </figure>
          )}
          {d.buttonLink && tx(d.buttonText, locale) && (
            <div className="mt-[19px]">
              <a
                href={resolveHref(d.buttonLink, slug)}
                {...(isExternal(d.buttonLink) ? externalProps : {})}
                className="inline-flex w-[188px] items-center justify-center rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[13.5px] font-medium text-white hover:opacity-90"
              >
                {tx(d.buttonText, locale)}
              </a>
            </div>
          )}
        </div>
        {cards.length > 0 && (
          <ul className="grid gap-x-[30px] gap-y-[41px] sm:grid-cols-2">
            {cards.map((c, i) => {
              const colour = c.colour ?? colours[i % colours.length]!;
              return (
                <li
                  key={i}
                  className="flex h-[128px] items-center gap-2 rounded-[11px] border border-[#414141]/15 bg-white pr-4 pl-2"
                >
                  {c.iconImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static design asset
                    <img src={c.iconImage} alt="" width={59} height={51} className="h-[51px] w-[59px] shrink-0" />
                  ) : (
                    <span
                      className="mx-2 flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ color: colour, backgroundColor: `${colour}14` }}
                    >
                      <Icon name={c.icon} className="size-6" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-[#414141]">
                      {tx(c.title, locale)}
                    </span>
                    <span className="mt-5 block text-[15.2px] font-semibold text-black">
                      {c.value}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Band>
  );
}

/** `youth-speak-tabs`: nothing on its own; the tabs are shown together with `youth-posts`. */
export function YouthSpeakTabsSection() {
  return null;
}

/** `youth-posts`: Figma "Youth Speak" — tab chips, badge on the cover, author and date, paging arrow, "View All Contribution". */
export async function YouthPostsSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const tabs = list<{ tabKey?: string; name?: B; active?: boolean }>(
    (siblings?.["youth-speak-tabs"] as { items?: unknown } | undefined)?.items,
  )
    .filter((x) => x.active !== false && x.tabKey)
    .map((x) => ({ key: x.tabKey!, name: tx(x.name, locale) }));
  const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const posts: YouthPostCard[] = list<{
    tabKey?: string;
    type?: YouthPostCard["type"];
    title?: B;
    coverImageId?: string;
    url?: string;
    author?: B;
    date?: string;
  }>((data as { items?: unknown }).items).map((p) => {
    const type = p.type ?? "blog";
    const date =
      p.date && !Number.isNaN(Date.parse(p.date))
        ? fmt.format(new Date(`${p.date.slice(0, 10)}T00:00:00`))
        : undefined;
    return {
      tab: p.tabKey ?? "",
      type,
      typeLabel: t(`post_${type}`),
      title: tx(p.title, locale),
      cover: mediaUrl(slug, p.coverImageId),
      href: p.url ? resolveHref(p.url, slug) : undefined,
      external: p.url ? isExternal(p.url) : false,
      author: tx(p.author, locale)
        ? t("byAuthor", { name: tx(p.author, locale) })
        : undefined,
      date,
    };
  });
  if (posts.length === 0) return null;
  return (
    <Band heading={t("youthSpeak")} tone="cream">
      <YouthSpeakClient
        tabs={tabs}
        posts={posts}
        labels={{
          all: t("all"),
          viewAll: t("viewAllContribution"),
          showLess: t("showLess"),
          next: t("next"),
          previous: t("previous"),
        }}
      />
    </Band>
  );
}

/** Tinted card + icon colours of "Schemes & Opportunities for Youth" (green, purple, orange, blue, pink). */
const SCHEME_TINTS = [
  { bg: "#f3f8f3", border: "#d9e7da", fg: "#3f9b2f" },
  { bg: "#f7f4fb", border: "#e4dcef", fg: "#a855f7" },
  { bg: "#fdf6ee", border: "#f1e0cc", fg: "#f97316" },
  { bg: "#f1f6fd", border: "#d6e3f5", fg: "#1a8cff" },
  { bg: "#fdf4f5", border: "#f1dadf", fg: "#f0567a" },
];

/** `scheme-cards`: pastel tinted cards with a coloured icon and an "Explore Now →" link. */
export async function SchemeCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{
    icon?: string;
    title?: B;
    description?: B;
    buttonText?: B;
    buttonLink?: string;
    active?: boolean;
  }>(d.items).filter((c) => c.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("schemeCards")} tone="cream" headGap="mb-6 lg:mb-[49px]">
      <ul className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-5">
        {items.map((c, i) => {
          const tint = SCHEME_TINTS[i % SCHEME_TINTS.length]!;
          return (
            <li
              key={i}
              className="flex min-h-[286px] flex-col rounded-[10px] border px-6 py-7"
              style={{ backgroundColor: tint.bg, borderColor: tint.border }}
            >
              <span style={{ color: tint.fg }}>
                <Icon name={c.icon} className="size-11" />
              </span>
              <p className="mt-5 text-[16px] font-semibold text-black">
                {tx(c.title, locale)}
              </p>
              {tx(c.description, locale) && (
                <p className="mt-3 text-[16px] leading-[22px] text-[#414141]">
                  {tx(c.description, locale)}
                </p>
              )}
              {c.buttonLink && (
                <TextLink
                  href={resolveHref(c.buttonLink, slug)}
                  external={isExternal(c.buttonLink)}
                  className="mt-auto pt-8 text-[16px] !font-normal"
                >
                  {tx(c.buttonText, locale) || t("learnMore")}
                </TextLink>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}
