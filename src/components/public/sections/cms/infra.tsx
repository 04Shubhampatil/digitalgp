import { ArrowRight, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { InfraMapClient } from "./infra-map-client";
import {
  Icon,
  cardClass,
  externalProps,
  list,
  mediaUrl,
  plain,
  tx,
  type B,
} from "./kit";

/**
 * Village Infrastructure page (Figma 375:14752, "6. Village Infrastructure"): Public Facilities Overview,
 * Village Infrastructure Map, Smart Village Dashboard and the Latest Announcements / Upcoming Events cards.
 * Measurements are the 1440px design's.
 */

const GREEN = "#0b5a2c";

// ------------------------------------------------------------------------------------ facilities

const FACILITY_ICONS = [
  "water",
  "sanitation",
  "roads",
  "lighting",
  "schools",
  "anganwadi",
  "health-centre",
  "library",
  "playground",
  "shg",
  "bus",
  "camps",
  "vaccination",
  "halls",
  "other",
];

/**
 * `facility-grid`: "Public Facilities Overview" — a white card (20px radius, 20px shadow) floating over the hero's
 * bottom edge with a 5-column grid of 233px tiles: icon circle, 23px semibold name (two lines tall), 13.8px value.
 * A tile's `labelWidth` (design pixels) widens its name box where the design lets it overflow the tile.
 */
export function FacilityGridSection({ locale, data }: SectionProps) {
  const d = data as {
    heading?: Bilingual;
    items?: { label?: Bilingual; value?: Bilingual; labelWidth?: number }[];
  };
  return (
    // The cream page background continues behind the card (below the 94px that overlap the hero picture), so no white band shows.
    <div className="relative z-10 -mt-16 bg-[linear-gradient(to_bottom,transparent_64px,#fcf7ee_64px)] lg:-mt-[94px] lg:bg-[linear-gradient(to_bottom,transparent_94px,#fcf7ee_94px)]">
      <section className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[61px]">
        <div className="rounded-[20px] bg-white px-4 pt-6 pb-6 shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:px-9 lg:h-[778px] lg:pt-[21px] lg:pr-[29px] lg:pb-0 lg:pl-9">
          <h2 className="text-center text-[30px] leading-[41px] font-semibold text-black">
            {pickText(d.heading, locale)}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:mt-[33px] xl:grid-cols-5 xl:gap-x-[22px] xl:gap-y-0">
            {(d.items ?? []).map((it, i) => {
              const icon = FACILITY_ICONS[i % FACILITY_ICONS.length]!;
              // Rows start 95 / 330 / 550px into the card: 32.6px between the first two rows, 17.6px between the last two.
              const row = Math.floor(i / 5);
              const gap =
                row === 1 ? "xl:mt-[32.6px]" : row >= 2 ? "xl:mt-[17.6px]" : "";
              return (
                <li
                  key={i}
                  className={`flex min-h-[202px] flex-col items-center rounded-[10px] border border-[#414141]/20 bg-white px-3 py-[14px] text-center xl:h-[202.4px] xl:min-h-0 xl:px-8 ${gap}`}
                >
                  <span className="flex h-[67px] w-[71px] shrink-0 items-center justify-center overflow-hidden">
                    <FigmaIcon name={`fac-${icon}`} width={71} />
                  </span>
                  <div className="flex w-full flex-col items-center gap-2 p-[9.2px]">
                    <p
                      className="w-full text-[17px] leading-[23px] font-semibold whitespace-pre-line text-black xl:min-h-[62px] xl:w-[var(--lw,148.6px)] xl:max-w-none xl:text-[23px] xl:leading-[31.3px]"
                      style={
                        it.labelWidth ? ({ "--lw": `${it.labelWidth}px` } as React.CSSProperties) : undefined
                      }
                    >
                      {pickText(it.label, locale)}
                    </p>
                    <p className="text-[13.8px] leading-[19px] text-[#135130]">
                      {pickText(it.value, locale)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------------------ map

interface Marker {
  title?: B;
  lat?: number;
  lng?: number;
  icon?: string;
  ward?: string;
}

interface FilterItem {
  icon?: string;
  name?: B;
  colour?: string;
  visible?: boolean;
}

/** `infra-map`: the village map card (picture, Facility Filters panel, controls and legend row) and its marker list. */
export async function InfraMapSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    subheading?: B;
    mapImageId?: string;
    height?: number;
    showLegend?: boolean;
    markers?: unknown;
  };
  const image = mediaUrl(slug, d.mapImageId);
  const markers = list<Marker>(d.markers);
  if (!image && markers.length === 0) return null;
  const filters = list<FilterItem>(
    (siblings?.["map-filters"] as { items?: unknown } | undefined)?.items,
  ).filter((x) => x.visible !== false);
  const heading = tx(d.heading, locale) || t("infraMap");
  return (
    <section className="bg-cream pt-8 lg:pt-[86px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[61px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">
          {heading}
        </h2>
        <p className="text-center text-[20px] leading-[30px] text-black">
          {tx(d.subheading, locale) || t("infraMapSub")}
        </p>
        {image && (
          <div className="mt-6 lg:mt-[29px]">
            <InfraMapClient
              image={image}
              alt={heading}
              title={t("facilityFilters")}
              labels={{
                zoomIn: t("mapZoomIn"),
                zoomOut: t("mapZoomOut"),
                fullscreen: t("mapFullscreen"),
              }}
              filters={filters.map((x) => ({
                name: tx(x.name, locale),
                colour: x.colour ?? "#135130",
                icon: <Icon name={x.icon} className="size-[19px]" />,
              }))}
            />
          </div>
        )}
        {markers.length > 0 && (
          <ul
            className={`${cardClass} mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3`}
          >
            {markers.map((m, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={m.icon ?? "map"} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-black">
                    {tx(m.title, locale)}
                  </span>
                  {m.ward && (
                    <span className="block text-[12px] text-[#414141]">
                      {m.ward}
                    </span>
                  )}
                </span>
                {typeof m.lat === "number" && typeof m.lng === "number" && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=17/${m.lat}/${m.lng}`}
                    {...externalProps}
                    aria-label={t("openOnMap")}
                    className="text-[#135130] hover:underline"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------ dashboard

interface StatusCard {
  icon?: string;
  /** Second glyph beside the big value (defaults to `icon`). */
  valueIcon?: string;
  title?: B;
  smallLabel?: B;
  primaryValue?: string;
  statusText?: B;
  bottomLabel?: B;
  bottomValue?: string;
  buttonText?: B;
  buttonLink?: string;
  theme?: "blue" | "orange" | "green";
}

const THEMES = {
  blue: { fg: "#1a73e8" },
  orange: { fg: "#f5871f" },
  green: { fg: "#0f6a36" },
} as const;

/** Card widths of the design's row (the cards size to their content): 263 / 249 / 244 / 248 / 254 px. */
const CARD_COLUMNS =
  "lg:[grid-template-columns:minmax(0,263fr)_minmax(0,249fr)_minmax(0,244fr)_minmax(0,247.5fr)_minmax(0,254fr)]";

/**
 * `status-cards` (Figma "Smart Village Dashboard"): 322px cards — coloured icon and title, a second icon beside the
 * big value with the status in green, a divider, the bottom figure, another divider and a "View Details →" link.
 */
export async function StatusCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subheading?: B; items?: unknown };
  const items = list<StatusCard>(d.items);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream pt-8 lg:pt-[71px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">
          {tx(d.heading, locale) || t("statusCards")}
        </h2>
        <p className="text-center text-[20px] leading-[30px] text-black">
          {tx(d.subheading, locale) || t("statusCardsSub")}
        </p>
        <ul
          className={`mt-6 grid gap-[15px] sm:grid-cols-2 lg:mt-6 ${items.length === 5 ? CARD_COLUMNS : "lg:[grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]"}`}
        >
          {items.map((c, i) => {
            const th = THEMES[c.theme ?? "green"] ?? THEMES.green;
            return (
              <li
                key={i}
                className="flex flex-col rounded-[14px] border border-black/10 bg-white px-7 pt-5 pb-[17px] shadow-[0_0_10px_rgba(0,0,0,0.04)] lg:h-[322px]"
              >
                <div className="flex h-[50px] items-start gap-[28px]">
                  <span
                    aria-hidden
                    className="mt-1 ml-1 flex size-[30px] shrink-0 items-center justify-center"
                    style={{ color: th.fg }}
                  >
                    <Icon name={c.icon} className="size-[27px]" />
                  </span>
                  <div className="-ml-[3px] min-w-0">
                    <p
                      className="text-[16px] leading-[26px] font-semibold whitespace-nowrap"
                      style={{ color: c.theme === "blue" ? th.fg : "#111" }}
                    >
                      {tx(c.title, locale)}
                    </p>
                    {tx(c.smallLabel, locale) && (
                      <p className="text-[13px] leading-[22px] whitespace-nowrap text-[#414141]">
                        {tx(c.smallLabel, locale)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-[30px] flex items-start gap-[28px]">
                  <span
                    aria-hidden
                    className="mt-[10px] flex size-[32px] shrink-0 items-center justify-center"
                    style={{ color: th.fg }}
                  >
                    <Icon
                      name={c.valueIcon ?? c.icon}
                      className="size-[30px]"
                    />
                  </span>
                  <div className="-ml-[3px] min-w-0">
                    <p
                      className="text-[34px] leading-[44px] font-bold"
                      style={{ color: GREEN }}
                    >
                      {c.primaryValue}
                    </p>
                    {tx(c.statusText, locale) && (
                      <p
                        className="text-[14px] leading-6 font-bold whitespace-nowrap"
                        style={{ color: GREEN }}
                      >
                        {tx(c.statusText, locale)}
                      </p>
                    )}
                  </div>
                </div>
                {(tx(c.bottomLabel, locale) || c.bottomValue) && (
                  <div className="mt-4 border-t border-black/10 pt-[13px]">
                    <p className="text-[14px] leading-[22px] text-[#414141]">
                      {tx(c.bottomLabel, locale)}
                    </p>
                    <p className="mt-[3px] text-[20px] leading-[30px] font-bold text-black">
                      {c.bottomValue}
                    </p>
                  </div>
                )}
                {c.buttonLink && (
                  <div className="mt-auto border-t border-black/10 pt-[14px]">
                    <Link
                      href={resolveHref(c.buttonLink, slug)}
                      className="inline-flex items-center gap-3 text-[14px] leading-6 font-bold hover:underline"
                      style={{ color: GREEN }}
                    >
                      {tx(c.buttonText, locale) || t("learnMore")}{" "}
                      <ArrowRight className="size-[18px]" aria-hidden />
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------ announcements / events

interface DatedEntry {
  icon?: string;
  title?: B;
  date?: string;
}

/** `latest-announcements` / `upcoming-events` card (Figma Infrastructure): 570px card, 57px tinted icon squares, link at the foot. */
function EntriesCard({
  slug,
  locale,
  data,
  heading,
}: {
  slug: string;
  locale: SectionProps["locale"];
  data: Record<string, unknown>;
  heading: string;
}) {
  const d = data as {
    enabled?: boolean;
    heading?: B;
    buttonText?: B;
    buttonLink?: string;
    items?: unknown;
  };
  const items = list<DatedEntry>(d.items);
  if (d.enabled === false || items.length === 0) return null;
  return (
    <div className="flex flex-col rounded-[10px] border border-black/10 bg-white px-[29px] pt-[37px] pb-6 shadow-[0_0_10px_rgba(0,0,0,0.04)] lg:h-[570px] lg:pb-0">
      <h2 className="ml-1 text-[24px] leading-8 font-bold text-black">
        {tx(d.heading, locale) || heading}
      </h2>
      <ul className="mt-[29px] space-y-[19.6px]">
        {items.map((e, i) => (
          <li key={i} className="flex items-center gap-[21px]">
            <span
              aria-hidden
              className="flex size-[57px] shrink-0 items-center justify-center rounded-[12px] border border-white/70 text-[#0f6a36] shadow-[inset_0_0_6px_rgba(15,106,54,0.06)]"
              style={{ background: "linear-gradient(135deg,#eaf4ec,#d8eadc)" }}
            >
              <Icon name={e.icon} className="size-[30px]" />
            </span>
            <span className="min-w-0 flex-1 text-[16.5px] leading-6 text-black">
              {tx(e.title, locale)}
            </span>
            <span className="shrink-0 pr-1 text-[16px] text-[#3d4a63]">
              {plain(e.date, locale)}
            </span>
          </li>
        ))}
      </ul>
      {d.buttonLink && (
        <div className="mt-6 border-t border-black/10 pt-[22px] lg:mt-auto lg:mb-[25px]">
          <Link
            href={resolveHref(d.buttonLink, slug)}
            className="inline-flex items-center gap-3 text-[17px] leading-7 font-bold hover:underline"
            style={{ color: "#0f6a36" }}
          >
            {tx(d.buttonText, locale)}{" "}
            <ArrowRight className="size-[22px]" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

/** `latest-announcements` (card in a two-column row with `upcoming-events`). */
export async function LatestAnnouncementsCard({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  return (
    <EntriesCard
      slug={slug}
      locale={locale}
      data={data}
      heading={t("latestAnnouncements")}
    />
  );
}

/** `upcoming-events`. */
export async function UpcomingEventsCard({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  return (
    <EntriesCard
      slug={slug}
      locale={locale}
      data={data}
      heading={t("upcomingEvents")}
    />
  );
}
