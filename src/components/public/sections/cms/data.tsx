import { ArrowRight, Cloud, CloudLightning, CloudRain, CloudSun, Download, ExternalLink, FileText, Store, Sun, TreePine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getPublicWeather } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { BudgetChartClient, type BudgetChartData } from "./client";
import { InfraMapClient } from "./infra-map-client";
import { TreeAdoptionButton } from "./TreeAdoptionForm";
import { MarketPricesClient, type MarketView } from "./MarketPricesClient";
import { Band, Icon, cardClass, externalProps, list, mediaUrl, plain, readableText, tx, type B } from "./kit";

const inr = (n: number | string) => Number(n).toLocaleString("en-IN");

// ------------------------------------------------------------------------------------ infrastructure

interface Marker {
  title?: B;
  lat?: number;
  lng?: number;
  icon?: string;
  ward?: string;
}

/** `infra-map`: the village map picture with its marker list (links open the point on OpenStreetMap). */
export async function InfraMapSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subheading?: B; mapImageId?: string; height?: number; showLegend?: boolean; markers?: unknown };
  const image = mediaUrl(slug, d.mapImageId);
  const markers = list<Marker>(d.markers);
  if (!image && markers.length === 0) return null;
  const filters = list<FilterItem>((siblings?.["map-filters"] as { items?: unknown } | undefined)?.items).filter((x) => x.visible !== false);
  if (image && filters.length > 0 && d.showLegend !== false) {
    // Figma Infrastructure: one card — map picture, "Facility Filters" panel on its left edge, controls, legend row.
    return (
      <section className="bg-cream py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
          <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale) || t("infraMap")}</h2>
          <p className="mt-0.5 text-center text-[20px] leading-[30px] text-black">{tx(d.subheading, locale) || t("infraMapSub")}</p>
          <div className="mt-6">
            <InfraMapClient
              image={image}
              alt={tx(d.heading, locale) || t("infraMap")}
              title={t("facilityFilters")}
              labels={{ zoomIn: t("mapZoomIn"), zoomOut: t("mapZoomOut"), fullscreen: t("mapFullscreen") }}
              filters={filters.map((x) => ({ name: tx(x.name, locale), colour: x.colour ?? "#135130", icon: <Icon name={x.icon} className="size-[18px]" /> }))}
            />
          </div>
          {markers.length > 0 && (
            <ul className={`${cardClass} mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3`}>
              {markers.map((m, i) => (
                <li key={i} className="flex items-center gap-3 text-[13px]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                    <Icon name={m.icon ?? "map"} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-black">{tx(m.title, locale)}</span>
                    {m.ward && <span className="block text-[12px] text-[#414141]">{m.ward}</span>}
                  </span>
                  {typeof m.lat === "number" && typeof m.lng === "number" && (
                    <a href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=17/${m.lat}/${m.lng}`} {...externalProps} aria-label={t("openOnMap")} className="text-[#135130] hover:underline">
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
  return (
    <Band heading={t("infraMap")} subheading={t("infraMapSub")} tone="cream">
      <div className={`grid gap-5 ${markers.length > 0 ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={image} alt={t("infraMap")} className="w-full rounded-[10px] border border-black/10 object-cover" style={{ maxHeight: d.height ?? 500 }} />
        )}
        {markers.length > 0 && (
          <ul className={`${cardClass} max-h-[500px] space-y-2 overflow-auto`}>
            {markers.map((m, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={m.icon ?? "map"} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-black">{tx(m.title, locale)}</span>
                  {m.ward && <span className="block text-[12px] text-[#414141]">{m.ward}</span>}
                </span>
                {typeof m.lat === "number" && typeof m.lng === "number" && (
                  <a href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=17/${m.lat}/${m.lng}`} {...externalProps} aria-label={t("openOnMap")} className="text-[#135130] hover:underline">
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Band>
  );
}

interface FilterItem {
  icon?: string;
  name?: B;
  colour?: string;
  visible?: boolean;
}

/** `map-filters`: the map legend as colour chips. */
export function MapFiltersSection({ slug, locale, data, siblings }: SectionProps) {
  const items = list<FilterItem>((data as { items?: unknown }).items).filter((f) => f.visible !== false);
  if (items.length === 0) return null;
  // With a map picture the filters are drawn inside the map card (InfraMapSection).
  const map = siblings?.["infra-map"] as { mapImageId?: string; showLegend?: boolean } | undefined;
  if (map && mediaUrl(slug, map.mapImageId) && map.showLegend !== false) return null;
  return (
    <section className="bg-cream pb-6">
      <ul className="mx-auto flex max-w-[1440px] flex-wrap gap-2 px-4 sm:px-8 lg:px-[60px]">
        {items.map((f, i) => (
          <li key={i} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-black">
            <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: f.colour }} />
            <Icon name={f.icon} className="size-3.5 text-[#414141]" />
            {tx(f.name, locale)}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface StatusCard {
  icon?: string;
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
  green: { fg: "#135130" },
} as const;

/**
 * `status-cards` (Figma "Smart Village Dashboard"): title with a coloured icon, a 44px icon beside the big value,
 * the status in green, a divider, the bottom figure, another divider and a "View Details →" text link.
 */
export async function StatusCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subheading?: B; items?: unknown };
  const items = list<StatusCard>(d.items);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale) || t("statusCards")}</h2>
        <p className="mt-0.5 text-center text-[20px] leading-[30px] text-black">{tx(d.subheading, locale) || t("statusCardsSub")}</p>
        <ul className="mt-6 grid gap-[10px] sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(215px,1fr))]">
          {items.map((c, i) => {
            const th = THEMES[c.theme ?? "green"] ?? THEMES.green;
            return (
              <li key={i} className="flex flex-col rounded-[10px] border border-black/10 bg-white px-5 pt-5 pb-4 shadow-[0_0_10px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-3">
                  <span aria-hidden style={{ color: th.fg }}>
                    <Icon name={c.icon} className="size-8" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[16px] leading-6 font-semibold text-black">{tx(c.title, locale)}</p>
                    {tx(c.smallLabel, locale) && <p className="mt-1 text-[13px] text-[#414141]">{tx(c.smallLabel, locale)}</p>}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <span aria-hidden className="flex size-11 shrink-0 items-center justify-center" style={{ color: th.fg }}>
                    <Icon name={c.icon} className="size-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[34px] leading-10 font-bold text-[#135130]">{c.primaryValue}</p>
                    {tx(c.statusText, locale) && <p className="text-[14px] font-semibold text-[#135130]">{tx(c.statusText, locale)}</p>}
                  </div>
                </div>
                {(tx(c.bottomLabel, locale) || c.bottomValue) && (
                  <div className="mt-4 border-t border-black/10 pt-4">
                    <p className="text-[14px] text-[#414141]">{tx(c.bottomLabel, locale)}</p>
                    <p className="mt-1 text-[20px] leading-7 font-bold text-black">{c.bottomValue}</p>
                  </div>
                )}
                {c.buttonLink && (
                  <div className="mt-4 border-t border-black/10 pt-4">
                    <Link href={resolveHref(c.buttonLink, slug)} className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#135130] hover:underline">
                      {tx(c.buttonText, locale) || t("learnMore")} <ArrowRight className="size-4" aria-hidden />
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

interface DatedEntry {
  icon?: string;
  title?: B;
  date?: string;
}

/** `latest-announcements` / `upcoming-events` card (Figma Infrastructure): 22px heading, rows with a 44px tinted icon square, link at the bottom. */
function EntriesCard({ slug, locale, data, heading }: { slug: string; locale: SectionProps["locale"]; data: Record<string, unknown>; heading: string }) {
  const d = data as { enabled?: boolean; heading?: B; buttonText?: B; buttonLink?: string; items?: unknown };
  const items = list<DatedEntry>(d.items);
  if (d.enabled === false || items.length === 0) return null;
  return (
    <div className="flex flex-col rounded-[10px] border border-black/10 bg-white px-[30px] pt-8 pb-6 shadow-[0_0_10px_rgba(0,0,0,0.04)]">
      <h2 className="text-[22px] leading-8 font-bold text-black">{tx(d.heading, locale) || heading}</h2>
      <ul className="mt-5 flex-1 space-y-[19px]">
        {items.map((e, i) => (
          <li key={i} className="flex items-center gap-5">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#e4f1e7] text-[#135130]">
              <Icon name={e.icon} className="size-6" />
            </span>
            <span className="min-w-0 flex-1 text-[15px] leading-6 text-black">{tx(e.title, locale)}</span>
            <span className="shrink-0 text-[14px] text-[#414a5a]">{plain(e.date, locale)}</span>
          </li>
        ))}
      </ul>
      {d.buttonLink && (
        <div className="mt-6 border-t border-black/10 pt-5">
          <Link href={resolveHref(d.buttonLink, slug)} className="inline-flex items-center gap-3 text-[17px] font-semibold text-[#135130] hover:underline">
            {tx(d.buttonText, locale)} <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

/** `latest-announcements` (card in a two-column row with `upcoming-events`). */
export async function LatestAnnouncementsCard({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  return <EntriesCard slug={slug} locale={locale} data={data} heading={t("latestAnnouncements")} />;
}

/** `upcoming-events`. */
export async function UpcomingEventsCard({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  return <EntriesCard slug={slug} locale={locale} data={data} heading={t("upcomingEvents")} />;
}

// ------------------------------------------------------------------------------------ finance

interface Category {
  name?: B;
  amount?: string;
  percentage?: number;
  colour?: string;
}

interface InfoCard {
  enabled?: boolean;
  icon?: string;
  title?: B;
  description?: B;
  buttonText?: B;
  buttonLink?: string;
}

/** Colours for income categories (the schema stores a colour only for expenditure), in the Figma Finance order. */
const INCOME_COLOURS = ["#167a3a", "#2a6fd0", "#f2622e", "#1e88e5", "#8b6fc0", "#ecb22e", "#ec4899", "#64748b"];

/** ₹ amount in rupees → "₹1.80 Cr" / "₹4.50 L" / "₹12,500" (Marathi: कोटी / लाख). */
export function formatMoney(rupees: number, locale: SectionProps["locale"], unit: "auto" | "cr" | "lakh" = "auto"): string {
  const cr = locale === "mr" ? "कोटी" : "Cr";
  const lakh = locale === "mr" ? "लाख" : "L";
  const u = unit === "auto" ? (rupees >= 1e7 ? "cr" : rupees >= 1e5 ? "lakh" : "none") : unit;
  if (u === "cr") return `₹${(rupees / 1e7).toFixed(2)} ${cr}`;
  if (u === "lakh") return `₹${(rupees / 1e5).toFixed(2)} ${lakh}`;
  return `₹${inr(rupees)}`;
}

/** The unit that suits a block's biggest figure, so every amount in it is shown the same way. */
const blockUnit = (biggest: number): "cr" | "lakh" | "auto" => (biggest >= 1e7 ? "cr" : biggest >= 1e5 ? "lakh" : "auto");

const sumAmount = (cats: Category[]) => cats.reduce((s, c) => s + (Number(c.amount) || 0), 0);

function InfoCardBlock({ slug, locale, card }: { slug: string; locale: SectionProps["locale"]; card?: InfoCard }) {
  if (!card || card.enabled === false || !tx(card.title, locale)) return null;
  return (
    <aside className="flex h-full flex-col items-center justify-center rounded-[10px] border border-black/10 bg-[#f3f7f2] px-6 py-8 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
        <Icon name={card.icon} className="size-11" />
      </span>
      <p className="mt-5 text-[20px] leading-7 font-bold text-[#135130]">{tx(card.title, locale)}</p>
      {tx(card.description, locale) && <p className="mt-3 max-w-[220px] text-[16px] leading-8 text-black">{tx(card.description, locale)}</p>}
      {card.buttonLink && (
        <div className="mt-6">
          <Link href={resolveHref(card.buttonLink, slug)} className="inline-flex items-center gap-3 rounded-[8px] bg-[#135130] px-5 py-3 text-[15px] font-medium text-white shadow hover:opacity-90">
            {tx(card.buttonText, locale) || "→"} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </aside>
  );
}

/**
 * Donut chart (SVG) as in the Figma Finance page: segments clockwise from the top, each segment's share
 * written inside it, and a white centre with the label and total.
 */
function Donut({ segments, label, value }: { segments: { value: number; colour: string; pct: number }[]; label: string; value: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 100;
  const r = 44;
  const pt = (a: number, rad: number) => [100 + rad * Math.sin(a), 100 - rad * Math.cos(a)] as const;
  const arcs = segments.reduce<{ d: string; colour: string; pct: number; mid: number; share: number; end: number }[]>((acc, sg) => {
    const start = acc.length > 0 ? acc[acc.length - 1]!.end : 0;
    const share = sg.value / total;
    const end = start + share * 2 * Math.PI;
    // A single 100% segment cannot be drawn as one arc; stop just short of the full circle.
    const stop = Math.min(end, start + 2 * Math.PI - 1e-4);
    const large = stop - start > Math.PI ? 1 : 0;
    const [x1, y1] = pt(start, R);
    const [x2, y2] = pt(stop, R);
    const [x3, y3] = pt(stop, r);
    const [x4, y4] = pt(start, r);
    const d = `M${x1} ${y1}A${R} ${R} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${large} 0 ${x4} ${y4}Z`;
    return [...acc, { d, colour: sg.colour, pct: sg.pct, mid: (start + end) / 2, share, end }];
  }, []);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[352px]">
      <svg viewBox="0 0 200 200" className="size-full" role="img" aria-label={`${label} ${value}`}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.colour} stroke="#fff" strokeWidth="0.8" />
        ))}
        {arcs
          // Slices under 4% are too thin for a label; their share is in the legend.
          .filter((a) => a.share >= 0.04)
          .map((a, i) => {
            const [x, y] = pt(a.mid, (R + r) / 2);
            return (
              <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill="#fff">
                {a.pct}%
              </text>
            );
          })}
      </svg>
      <div className="absolute inset-[28%] flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-[15px] leading-5 font-medium text-[#333]">{label}</span>
        <span className="mt-1 text-[22px] leading-tight font-bold text-black">{value}</span>
      </div>
    </div>
  );
}

/** Icon for an expenditure head (the schema has no icon field), guessed from its English name. */
const EXP_ICONS: [RegExp, string][] = [
  [/infra|road|build/i, "building"],
  [/sanit|clean|waste/i, "sanitation"],
  [/educat|school/i, "book"],
  [/water/i, "water"],
  [/health|nutri/i, "heart"],
  [/agri|farm|liveli/i, "wheat"],
];
const expIcon = (c: Category & { icon?: string }) => c.icon ?? EXP_ICONS.find(([re]) => re.test(c.name?.en ?? ""))?.[1] ?? "landmark";

/** `income-sources`: legend card, donut with the total in the middle, and an optional information card, in one white panel (Figma Finance). */
export async function IncomeSourcesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; heading?: B; subtitle?: B; categories?: unknown; supportCard?: InfoCard };
  const categories = list<Category>(d.categories);
  if (d.enabled === false || categories.length === 0) return null;
  const total = sumAmount(categories);
  const unit = blockUnit(total);
  const coloured = categories.map((c, i) => ({ ...c, colour: c.colour ?? INCOME_COLOURS[i % INCOME_COLOURS.length]! }));
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-2 text-center text-[20px] leading-[30px] text-black">{tx(d.subtitle, locale)}</p>}
        <div className="mt-6 grid items-center gap-6 rounded-[10px] border border-black/10 bg-white p-4 lg:grid-cols-[minmax(0,476px)_minmax(0,1fr)_297px] lg:py-4 lg:pr-5 lg:pl-[30px]">
          <ul className="flex flex-col gap-[30px] rounded-[10px] border border-black/10 bg-white px-5 py-7 sm:px-[22px]">
            {coloured.map((c, i) => (
              <li key={i} className="flex items-center gap-4 text-[16px] leading-6 text-[#2b2b2b]">
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.colour }} />
                <span className="min-w-0 flex-1">{tx(c.name, locale)}</span>
                <span className="shrink-0">
                  {formatMoney(Number(c.amount) || 0, locale, unit)} ({c.percentage ?? 0}%)
                </span>
              </li>
            ))}
          </ul>
          <Donut segments={coloured.map((c) => ({ value: Number(c.amount) || 0, colour: c.colour, pct: c.percentage ?? 0 }))} label={t("totalIncome")} value={formatMoney(total, locale, unit)} />
          <InfoCardBlock slug={slug} locale={locale} card={d.supportCard} />
        </div>
      </div>
    </section>
  );
}

/** `expenditure`: donut, category rows (icon, amount, share, bar in the GP's colour) and an optional side card, in one white panel. */
export async function ExpenditureSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subtitle?: B; backgroundColour?: string; categories?: unknown; sideCard?: InfoCard };
  const categories = list<Category & { icon?: string }>(d.categories);
  if (categories.length === 0) return null;
  const total = sumAmount(categories);
  const unit = blockUnit(total);
  // Bars are drawn relative to the largest head (Figma: the largest share fills a little over half the track).
  const maxPct = Math.max(...categories.map((c) => c.percentage ?? 0), 1);
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#fcf7ee", color: readableText(d.backgroundColour) }}>
      <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-8 lg:px-[60px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-2 text-[20px] leading-[30px]">{tx(d.subtitle, locale)}</p>}
        <div className="mt-6 grid items-center gap-8 rounded-[10px] border border-black/10 bg-white p-4 text-left text-black sm:p-6 lg:grid-cols-[360px_minmax(0,1fr)_280px] lg:gap-[30px] lg:py-5 lg:pr-5 lg:pl-2.5">
          <Donut segments={categories.map((c) => ({ value: Number(c.amount) || 0, colour: c.colour ?? "#135130", pct: c.percentage ?? 0 }))} label={t("totalExpenditure")} value={formatMoney(total, locale, unit)} />
          <ul className="space-y-[15px]">
            {categories.map((c, i) => {
              const colour = c.colour ?? "#135130";
              const pct = Math.max(0, Math.min(100, c.percentage ?? 0));
              return (
                <li key={i} className="flex items-center gap-[19px]">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${colour}1f`, color: colour }}>
                    <Icon name={expIcon(c)} className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-3 text-[15px] leading-6">
                      <span className="min-w-0 flex-1 text-black">{tx(c.name, locale)}</span>
                      <span className="shrink-0 font-bold text-black">{formatMoney(Number(c.amount) || 0, locale, unit)}</span>
                      <span className="w-14 shrink-0 text-right text-[#414141]">{pct}%</span>
                    </span>
                    <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-black/[0.07]" role="img" aria-label={`${tx(c.name, locale)} ${pct}%`}>
                      <span className="block h-full rounded-full" style={{ width: `${(pct / maxPct) * 55}%`, backgroundColor: colour }} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <InfoCardBlock slug={slug} locale={locale} card={d.sideCard} />
        </div>
      </div>
    </section>
  );
}

/**
 * `budget-visualizer`: vertical bar chart (values are in ₹ lakh), the first enabled tab name as the
 * chart title, the budget overview card and the report download. The overview totals are computed from
 * the page's own income and expenditure sections: `dynamic` fields are total income, then total
 * expenditure; `auto` fields are the surplus, and the budget utilisation when their suffix is "%".
 */
export async function BudgetVisualizerSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    enabled?: boolean;
    heading?: B;
    subtitle?: B;
    backgroundColour?: string;
    tabs?: { tabKey?: string; name?: B; enabled?: boolean }[];
    overviewCard?: { title?: B; fields?: { label?: B; valueType?: "dynamic" | "auto"; prefixSuffix?: string; colour?: string }[] };
    barChart?: { label?: B; value?: string; colour?: string }[];
    charts?: { tabKey?: string; type?: "bar" | "line"; labels?: string[]; series?: { name?: B; colour?: string; values?: number[] }[] }[];
    downloadReport?: { enabled?: boolean; buttonText?: B; fileId?: string };
  };
  const bars = list<{ label?: B; value?: string; colour?: string }>(d.barChart);
  const tabs = list<{ tabKey?: string; name?: B; enabled?: boolean }>(d.tabs).filter((x) => x.enabled !== false);
  // One chart per tab (`charts`). The older single bar series (values in ₹ lakh) becomes one bar chart.
  const charts: BudgetChartData[] = list<NonNullable<typeof d.charts>[number]>(d.charts)
    .filter((c) => c.tabKey)
    .map((c) => ({
      tabKey: c.tabKey!,
      type: c.type === "line" ? "line" : "bar",
      labels: list<string>(c.labels),
      series: list<{ name?: B; colour?: string; values?: number[] }>(c.series).map((s) => ({ name: tx(s.name, locale), colour: s.colour ?? "#135130", values: list<number>(s.values).map(Number) })),
    }));
  if (charts.length === 0 && bars.length > 0) {
    charts.push({ tabKey: "legacy", type: "bar", labels: bars.map((b) => tx(b.label, locale)), series: [{ name: "", colour: "#135130", values: bars.map((b) => (Number(b.value) || 0) * 1e5) }] });
  }
  if (d.enabled === false || charts.length === 0) return null;
  const chartTabs = tabs.filter((x) => x.tabKey).map((x) => ({ key: x.tabKey!, name: tx(x.name, locale) }));
  const income = sumAmount(list<Category>((siblings?.["income-sources"] as { categories?: unknown } | undefined)?.categories));
  const spent = sumAmount(list<Category>((siblings?.["expenditure"] as { categories?: unknown } | undefined)?.categories));
  const known = income > 0 && spent > 0;
  const unit = blockUnit(Math.max(income, spent));
  let dynamicIndex = 0;
  const fields = list<{ label?: B; valueType?: string; prefixSuffix?: string; colour?: string }>(d.overviewCard?.fields).map((f) => {
    let value = "—";
    if (known) {
      if (f.valueType === "dynamic") value = formatMoney(dynamicIndex++ === 0 ? income : spent, locale, unit);
      else if (f.prefixSuffix === "%") value = `${((spent / income) * 100).toFixed(1)}%`;
      else value = formatMoney(Math.abs(income - spent), locale, unit);
    }
    return { ...f, value };
  });
  const file = mediaUrl(slug, d.downloadReport?.enabled === false ? undefined : d.downloadReport?.fileId);
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#ffffff", color: readableText(d.backgroundColour) }}>
      <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-8 lg:px-[60px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-2 text-[20px] leading-[30px]">{tx(d.subtitle, locale)}</p>}
        <div className="mt-6 grid gap-6 text-left text-black lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className={cardClass}>
            <BudgetChartClient tabs={chartTabs} charts={charts} crLabel={locale === "mr" ? "कोटी" : "Cr"} lakhLabel={locale === "mr" ? "लाख" : "L"} emptyLabel={t("noChart")} />
          </div>
          <div className={`${cardClass} flex flex-col`}>
            <p className="text-[16px] font-semibold text-black">{tx(d.overviewCard?.title, locale)}</p>
            <ul className="mt-3 divide-y divide-black/10">
              {fields.map((f, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-black">{tx(f.label, locale)}</span>
                  <span className="font-semibold" style={{ color: f.colour }}>
                    {f.value}
                  </span>
                </li>
              ))}
            </ul>
            {file && (
              <a href={file} download className="mt-auto inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#135130] px-4 py-3 text-[13px] font-medium text-white hover:opacity-90">
                {tx(d.downloadReport?.buttonText, locale) || t("download")} <Download className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * `documents`: document cards as in Figma Finance (red PDF icon on the left, title, "PDF • size", "Download ⤓").
 * An entry without a file yet links "Download" to `fallbackLink` (e.g. the Notices page) instead of nowhere.
 */
export async function DocumentsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subtitle?: B; description?: B; backgroundColour?: string; items?: unknown; fallbackLink?: string };
  const items = list<{ title?: B; fileId?: string; buttonText?: B; size?: string; format?: string }>(d.items);
  if (items.length === 0) return null;
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#ffffff", color: readableText(d.backgroundColour) }}>
      <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-8 lg:px-[60px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-2 text-[20px] leading-[30px]">{tx(d.subtitle, locale)}</p>}
        {tx(d.description, locale) && <p className="mt-1 text-[14px] opacity-80">{tx(d.description, locale)}</p>}
        <ul className="mt-6 grid gap-4 rounded-[10px] border border-black/10 bg-white p-4 text-left text-black sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] lg:gap-[18px] lg:px-[22px] lg:py-[23px]">
          {items.map((it, i) => {
            const file = mediaUrl(slug, it.fileId);
            const href = file ?? (d.fallbackLink ? resolveHref(d.fallbackLink, slug) : undefined);
            const label = (
              <>
                {tx(it.buttonText, locale) || t("download")} <Download className="size-[18px]" aria-hidden />
              </>
            );
            const linkClass = "inline-flex items-center gap-3 text-[15px] font-semibold text-[#135130] hover:underline";
            return (
              <li key={i} className="flex min-h-[146px] flex-col rounded-[10px] border border-black/10 bg-white px-4 pt-4 pb-4 shadow-[0_0_6px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-3.5">
                  <span aria-hidden className="flex size-[46px] shrink-0 items-center justify-center rounded-[8px] bg-[#e53935]/10 text-[#e53935]">
                    <FileText className="size-6" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[14px] leading-5 font-bold text-[#135130]">{tx(it.title, locale)}</p>
                    <p className="mt-2 text-[14px] text-[#414141]">{[it.format ?? "PDF", it.size].filter(Boolean).join(" • ")}</p>
                  </div>
                </div>
                {href && (
                  <div className="mt-auto flex justify-center pt-4">
                    {file ? (
                      <a href={file} download className={linkClass}>
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className={linkClass}>
                        {label}
                      </Link>
                    )}
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

/// ------------------------------------------------------------------------------------ environment

/** Green check-circle bullet of the Figma "Adopt a Tree" card. */
function CheckBullet() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 size-5 shrink-0">
      <circle cx="10" cy="10" r="10" fill="#2f9e3f" />
      <path d="M5.8 10.3l2.7 2.7 5.7-5.9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * `key-initiatives` (Figma 375:11378 "Our Key Initiatives"): white panel overlapping the bottom of the
 * hero with icon tiles in rows of five, separated by thin dividers. Tiles with a link jump to the
 * matching section. Backend section Environment › `key-initiatives` (heading / subheading / viewAll,
 * items { icon, title, link?, active? }); the placeholder fills in while it is not published.
 */
export async function KeyInitiativesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subheading?: B; viewAll?: { label?: B; href?: string }; items?: unknown };
  const items = list<{ icon?: string; iconImage?: string; title?: B; link?: string; active?: boolean }>(d.items).filter((i) => i.active !== false && tx(i.title, locale));
  if (items.length === 0) return null;
  const viewAll = d.viewAll?.href && tx(d.viewAll.label, locale) ? { href: d.viewAll.href, label: tx(d.viewAll.label, locale) } : null;
  return (
    <section className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8 lg:-mt-[78px] lg:px-[62px]">
      <div className="rounded-[14px] bg-white px-4 pt-6 pb-4 shadow-[0_2px_14px_rgba(0,0,0,0.08)] sm:px-5">
        <h2 className="text-center text-[26px] leading-9 font-semibold text-black">{tx(d.heading, locale) || t("keyInitiatives")}</h2>
        <span aria-hidden className="mx-auto mt-2 block h-0.5 w-[50px] rounded bg-[#135130]" />
        {tx(d.subheading, locale) && <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-6 text-[#414141]">{tx(d.subheading, locale)}</p>}
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it, i) => {
            const body = (
              <>
                {it.iconImage ? (
                  // Placeholder content: the Figma pictogram (filled glyph in its tinted circle), sliced from the design.
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset
                  <img src={it.iconImage} alt="" width={64} height={64} className="size-16" />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-[#e7f3e8] text-[#135130]">
                    <Icon name={it.icon} className="size-8" />
                  </span>
                )}
                <span className="mt-3 max-w-[165px] text-[16px] leading-[27px] font-semibold whitespace-pre-line text-black">{tx(it.title, locale)}</span>
              </>
            );
            const cls = "flex h-full flex-col items-center px-3 py-4 text-center";
            return (
              <li key={i} className={`border-black/10 lg:border-l lg:[&:nth-child(5n+1)]:border-l-0 ${i >= 5 ? "lg:border-t" : ""}`}>
                {it.link && /^https?:\/\//.test(it.link) ? (
                  <a href={it.link} {...externalProps} className={`${cls} rounded-[10px] hover:bg-[#f4faf4]`}>
                    {body}
                  </a>
                ) : it.link ? (
                  <Link href={resolveHref(it.link, slug)} className={`${cls} rounded-[10px] hover:bg-[#f4faf4]`}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        {viewAll && (
          <p className="mt-2 text-center">
            <a href={resolveHref(viewAll.href, slug)} {...(/^https?:\/\//.test(viewAll.href) ? externalProps : {})} className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#135130] hover:underline">
              {viewAll.label} <ArrowRight aria-hidden className="size-4" />
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * `tree-adoption` (Figma "Adopt a Tree"): one white card — illustration, title, text, check bullets and a
 * filled button on the left; the key figures as three cards in a row on the right. The button opens the
 * adoption request form (POST /public/:slug/tree-adoptions); `buttonLink` is where the form sends
 * visitors while requests are closed (default: the volunteer form).
 */
export async function TreeAdoptionSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; title?: B; description?: B; bullets?: unknown; illustrationId?: string; buttonText?: B; buttonLink?: string; stats?: unknown; successMessage?: B };
  if (d.enabled === false) return null;
  const bullets = list<B>(d.bullets).filter((b) => tx(b, locale));
  const stats = list<{ icon?: string; title?: B; value?: string; subText?: B }>(d.stats);
  const image = mediaUrl(slug, d.illustrationId);
  // A link back to this card (or its button) would loop: fall back to the volunteer form then.
  const ownLink = !d.buttonLink || /^page:environment#(tree-adoption|adopt-a-tree)$/.test(d.buttonLink);
  const fallback = resolveHref(ownLink ? "page:contact#volunteer-registration" : d.buttonLink!, slug);
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <div className="grid items-center gap-8 rounded-[14px] border border-black/5 bg-white p-6 shadow-[0_0_10px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:px-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
              <img src={image} alt="" className="mx-auto w-[170px] shrink-0 object-contain" />
            )}
            <div>
              <h2 className="text-[26px] leading-9 font-semibold text-black">{tx(d.title, locale)}</h2>
              {tx(d.description, locale) && <p className="mt-2 text-[15px] leading-6 text-[#414141]">{tx(d.description, locale)}</p>}
              {bullets.length > 0 && (
                <ul className="mt-3 space-y-2 text-[14px] text-black">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5">
                      <CheckBullet />
                      {tx(b, locale)}
                    </li>
                  ))}
                </ul>
              )}
              <TreeAdoptionButton slug={slug} label={tx(d.buttonText, locale) || t("adoptTreeNow")} successMessage={tx(d.successMessage, locale) || undefined} fallbackHref={fallback} />
            </div>
          </div>
          {stats.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-3">
              {stats.map((s, i) => (
                <li key={i} className="flex flex-col items-center rounded-[10px] border border-black/10 bg-white px-3 py-5 text-center shadow-[0_0_8px_rgba(0,0,0,0.05)]">
                  <Icon name={s.icon} className="size-10 text-[#2f8a3c]" />
                  <span className="mt-3 text-[14px] font-semibold text-black">{tx(s.title, locale)}</span>
                  <span className="mt-1 text-[32px] leading-10 font-bold text-[#0f3d22]">{s.value}</span>
                  {tx(s.subText, locale) && <span className="mt-1 text-[14px] font-medium text-[#2f8a3c]">{tx(s.subText, locale)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * `sustainability-initiatives`: cards with a 100px round photo, title, description and "View Details →"
 * (shown when the item has a `link`: a "page:<key>#<section>" link, a site path or an https URL).
 */
export async function SustainabilityInitiativesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ imageId?: string; title?: B; description?: B; active?: boolean; link?: string }>((data as { items?: unknown }).items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="mb-5 text-center text-[22px] leading-8 font-semibold text-black">{t("initiativesTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const img = mediaUrl(slug, it.imageId);
            return (
              <li key={i} className="flex items-center gap-8 rounded-[10px] border border-black/10 bg-white px-4 py-4 shadow-[0_0_8px_rgba(0,0,0,0.04)]">
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                  <img src={img} alt="" loading="lazy" className="size-[100px] shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-[16px] leading-[22px] font-semibold text-black">{tx(it.title, locale)}</p>
                  {tx(it.description, locale) && <p className="mt-2 text-[14px] leading-5 text-[#414141]">{tx(it.description, locale)}</p>}
                  {it.link &&
                    (/^https?:\/\//.test(it.link) ? (
                      <a href={it.link} {...externalProps} className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[#135130] hover:underline">
                        {t("viewDetails")} <ArrowRight aria-hidden className="size-3.5" />
                      </a>
                    ) : (
                      <Link href={resolveHref(it.link, slug)} className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[#135130] hover:underline">
                        {t("viewDetails")} <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const STALE_DAYS = 7;

type PriceRow = { commodity?: B; unit?: string; minPrice?: number; maxPrice?: number; modalPrice?: number };

/**
 * `market-prices` (left card of a row with `weather-update`): "Select Market" dropdown, commodity table,
 * "Last Updated" line and a right-aligned link. Several markets come from `markets[]` (key, name,
 * lastUpdatedAt, rows); the older single-market shape (`marketName` + `rows`) still works and is the
 * default selection. Stale real prices are flagged; the design's sample date (`designSample`, set only
 * by the placeholder content) is not.
 */
export async function MarketPricesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    title?: B;
    lastUpdatedAt?: string;
    marketName?: B;
    currency?: string;
    rows?: unknown;
    markets?: unknown;
    note?: B;
    buttonText?: B;
    buttonLink?: string;
    designSample?: boolean;
  };
  const sym = d.currency === "INR" || !d.currency ? "₹" : `${d.currency} `;
  const view = (key: string, name: string, lastUpdatedAt: string | undefined, raw: unknown): MarketView => {
    const updated = lastUpdatedAt ? new Date(lastUpdatedAt) : null;
    const valid = updated && !Number.isNaN(updated.getTime()) ? updated : null;
    const when = valid ? valid.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
    return {
      key,
      name,
      updated: when ? t("lastUpdated", { date: when }) : "",
      stale: !d.designSample && (valid ? new Date().getTime() - valid.getTime() > STALE_DAYS * 86_400_000 : true),
      rows: list<PriceRow>(raw).map((r) => ({
        commodity: tx(r.commodity, locale),
        unit: r.unit ?? "",
        min: `${sym}${inr(r.minPrice ?? 0)}`,
        max: `${sym}${inr(r.maxPrice ?? 0)}`,
        modal: `${sym}${inr(r.modalPrice ?? 0)}`,
      })),
    };
  };
  const single = tx(d.marketName, locale);
  const markets = list<{ key?: string; name?: B; lastUpdatedAt?: string; rows?: unknown }>(d.markets)
    .filter((m) => m.key)
    .map((m) => view(m.key!, tx(m.name, locale), m.lastUpdatedAt ?? d.lastUpdatedAt, m.rows));
  // The single-market rows stay the default selection; they are listed first unless a market of the
  // list already has that name.
  const own = view("__default", single, d.lastUpdatedAt, d.rows);
  const named = single ? markets.find((m) => m.name === single) : undefined;
  const all = (own.rows.length && !named ? [own, ...markets] : markets.length ? markets : [own]).filter((m) => m.rows.length > 0);
  if (all.length === 0) return null;
  const initial = (named && named.rows.length ? named : all[0]!).key;
  const external = !!d.buttonLink && /^https?:\/\//.test(d.buttonLink);
  return (
    <div className="flex flex-col rounded-[10px] border border-black/10 bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e7f3e8] text-[#135130]">
          <Store aria-hidden className="size-6" />
        </span>
        <div>
          <h2 className="text-[18px] leading-6 font-semibold text-black">{tx(d.title, locale)}</h2>
          <p className="text-[12px] text-[#414141]">{t("marketSub")}</p>
        </div>
      </div>
      <MarketPricesClient
        markets={all}
        initialKey={initial}
        note={tx(d.note, locale) || undefined}
        labels={{
          market: t("marketLabel"),
          select: t("selectMarket"),
          commodity: t("commodity"),
          unit: t("unit"),
          min: t("minPrice"),
          max: t("maxPrice"),
          modal: t("modalPrice"),
          stale: t("pricesStale"),
        }}
        footer={
          d.buttonLink ? (
            <a href={resolveHref(d.buttonLink, slug)} {...(external ? externalProps : {})} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#135130] hover:underline">
              {tx(d.buttonText, locale) || t("learnMore")} <ArrowRight aria-hidden className="size-3.5" />
            </a>
          ) : undefined
        }
      />
    </div>
  );
}

/** Weather icon for a free-text icon / condition name. */
function WeatherGlyph({ name, className }: { name?: string; className?: string }) {
  const k = (name ?? "").toLowerCase();
  const G = /rain|shower|drizzle/.test(k) ? CloudRain : /storm|thunder/.test(k) ? CloudLightning : /part|few|scatter/.test(k) ? CloudSun : /cloud|overcast|fog|mist/.test(k) ? Cloud : Sun;
  return <G aria-hidden className={className} />;
}

/** Official district forecasts (India Meteorological Department) for "View Detailed Forecast". */
const DETAILED_FORECAST_URL = "https://mausam.imd.gov.in/";

/**
 * `weather-update` (right card of a row with `market-prices`): current conditions in a green panel and a
 * five-day forecast. Live figures from GET /public/:slug/weather are used when a provider is configured;
 * otherwise the figures the Gram Panchayat entered in this section.
 */
export async function WeatherUpdateSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    title?: B;
    location?: B;
    current?: { temperature?: string; humidity?: string; wind?: string; feelsLike?: string; condition?: B };
    forecast?: unknown;
  };
  const live = await getPublicWeather(slug);
  const useLive = live?.source === "live" && !!live.current;
  const c = useLive ? { ...live!.current!, condition: plain(live!.current!.condition, locale) } : d.current ? { ...d.current, condition: tx(d.current.condition, locale) } : null;
  const days = useLive ? (live!.forecast ?? []) : list<{ date?: string; icon?: string; maxTemp?: string; minTemp?: string }>(d.forecast);
  if (!c) return null;
  const loc = locale === "mr" ? "mr-IN" : "en-IN";
  return (
    // The row wrapper carries only the first section's id, so this card carries its own anchor.
    <div id="weather-update" className="flex scroll-mt-[180px] flex-col rounded-[10px] border border-black/10 bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e7f3e8] text-[#135130]">
          <TreePine aria-hidden className="size-6" />
        </span>
        <div>
          <h2 className="text-[18px] leading-6 font-semibold text-black">{tx(d.title, locale)}</h2>
          {tx(d.location, locale) && <p className="text-[12px] text-[#414141]">{tx(d.location, locale)}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[8px] bg-[#135130] px-5 py-4 text-white">
        <div className="flex items-center gap-4">
          <span className="relative block size-16">
            <Sun aria-hidden className="absolute top-0 left-0 size-11 text-[#ffc83d]" fill="#ffc83d" />
            <Cloud aria-hidden className="absolute right-0 bottom-0 size-11 text-white" fill="#ffffff" />
          </span>
          <div>
            <p className="text-[32px] leading-none font-bold">{c.temperature}°C</p>
            <p className="mt-1.5 text-[14px] opacity-95">{c.condition}</p>
          </div>
        </div>
        <dl className="grid gap-0.5 text-[13px]">
          <div className="flex gap-1"><dt>{t("humidity")}:</dt><dd>{c.humidity}%</dd></div>
          <div className="flex gap-1"><dt>{t("wind")}:</dt><dd>{c.wind}</dd></div>
          <div className="flex gap-1"><dt>{t("feelsLike")}:</dt><dd>{c.feelsLike}°C</dd></div>
        </dl>
      </div>
      {days.length > 0 && (
        <ul className="mt-2 grid grid-cols-5 gap-2">
          {days.slice(0, 5).map((day, i) => {
            const date = day.date ? new Date(`${day.date}T00:00:00`) : null;
            return (
              <li key={i} className="flex flex-col items-center rounded-[8px] border border-black/10 px-1 py-2 text-center">
                <span className="text-[12px] font-semibold text-[#135130]">{date ? date.toLocaleDateString(loc, { weekday: "short" }) : ""}</span>
                <span className="text-[10px] text-[#414141]">{date ? date.toLocaleDateString(loc, { day: "numeric", month: "short" }) : ""}</span>
                <WeatherGlyph name={day.icon} className="my-1 size-4 text-[#f5a623]" />
                <span className="text-[13px] font-semibold text-black">{day.maxTemp}°C</span>
                <span className="text-[13px] font-semibold text-black">{day.minTemp}°C</span>
              </li>
            );
          })}
        </ul>
      )}
      <a href={DETAILED_FORECAST_URL} {...externalProps} className="mt-3 inline-flex items-center gap-2 self-start pl-2 text-[13px] font-semibold text-[#135130] hover:underline">
        {t("detailedForecast")} <ArrowRight aria-hidden className="size-3.5" />
      </a>
    </div>
  );
}

/** `green-scoreboard`: dark green panel with the headline environmental figures (Figma: 40px icons, 32px values). */
export async function GreenScoreboardSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ icon?: string; iconImage?: string; title?: B; value?: string; description?: B; visible?: boolean }>((data as { items?: unknown }).items).filter((i) => i.visible !== false);
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[58px]">
        <div className="rounded-[20px] bg-[#0e4a27] px-5 py-6 text-center text-white sm:px-7">
          <h2 className="text-[26px] leading-9 font-semibold">{t("greenScoreboard")}</h2>
          <p className="mt-1 text-[16px] opacity-90">{t("greenScoreboardSub")}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
            {items.map((s, i) => (
              <li key={i} className="flex flex-col items-center rounded-[8px] bg-[#1d5c37] px-4 py-5">
                {s.iconImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset
                  <img src={s.iconImage} alt="" width={66} height={62} className="h-[50px] w-auto" />
                ) : (
                  <Icon name={s.icon} className="size-10" />
                )}
                <p className="mt-3 text-[32px] leading-10 font-bold">{s.value}</p>
                <p className="mt-1 text-[16px] leading-6 font-semibold">{tx(s.title, locale)}</p>
                {tx(s.description, locale) && <p className="mt-1 text-[14px] opacity-90">{tx(s.description, locale)}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
