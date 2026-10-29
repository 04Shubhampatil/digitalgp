import { Download, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { Band, Icon, LinkButton, cardClass, externalProps, list, mediaUrl, tx, type B } from "./kit";

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
export async function InfraMapSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { mapImageId?: string; height?: number; showLegend?: boolean; markers?: unknown };
  const image = mediaUrl(slug, d.mapImageId);
  const markers = list<Marker>(d.markers);
  if (!image && markers.length === 0) return null;
  return (
    <Band heading={t("infraMap")} subheading={t("infraMapSub")} tone="cream">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
export function MapFiltersSection({ locale, data }: SectionProps) {
  const items = list<FilterItem>((data as { items?: unknown }).items).filter((f) => f.visible !== false);
  if (items.length === 0) return null;
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
  blue: { chip: "bg-[#2563eb]/10 text-[#1d4ed8]", bar: "bg-[#2563eb]" },
  orange: { chip: "bg-[#f5871f]/15 text-[#c25f00]", bar: "bg-[#f5871f]" },
  green: { chip: "bg-[#16a34a]/10 text-[#15803d]", bar: "bg-[#16a34a]" },
} as const;

/** `status-cards`: infrastructure status tiles (value, status text, bottom figure, button). */
export function StatusCardsSection({ slug, locale, data }: SectionProps) {
  const items = list<StatusCard>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band tone="white">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => {
          const th = THEMES[c.theme ?? "green"];
          return (
            <li key={i} className={`${cardClass} flex flex-col overflow-hidden`}>
              <div className="flex items-center gap-3">
                <span className={`flex size-11 items-center justify-center rounded-full ${th.chip}`}>
                  <Icon name={c.icon} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-black">{tx(c.title, locale)}</p>
                  {tx(c.smallLabel, locale) && <p className="text-[12px] text-[#414141]">{tx(c.smallLabel, locale)}</p>}
                </div>
              </div>
              <p className="mt-4 text-[30px] leading-9 font-bold text-black">{c.primaryValue}</p>
              {tx(c.statusText, locale) && <p className={`mt-1 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${th.chip}`}>{tx(c.statusText, locale)}</p>}
              {(tx(c.bottomLabel, locale) || c.bottomValue) && (
                <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-[13px]">
                  <span className="text-[#414141]">{tx(c.bottomLabel, locale)}</span>
                  <span className="font-semibold text-black">{c.bottomValue}</span>
                </div>
              )}
              {c.buttonLink && (
                <div className="mt-4">
                  <LinkButton href={resolveHref(c.buttonLink, slug)} external={/^https?:\/\//.test(c.buttonLink)}>
                    {tx(c.buttonText, locale) || "→"}
                  </LinkButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

interface DatedEntry {
  icon?: string;
  title?: B;
  date?: string;
}

function EntriesCard({ slug, locale, data, heading }: { slug: string; locale: SectionProps["locale"]; data: Record<string, unknown>; heading: string }) {
  const d = data as { enabled?: boolean; heading?: B; buttonText?: B; buttonLink?: string; items?: unknown };
  const items = list<DatedEntry>(d.items);
  if (d.enabled === false || items.length === 0) return null;
  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold text-black">{tx(d.heading, locale) || heading}</h2>
        {d.buttonLink && (
          <Link href={resolveHref(d.buttonLink, slug)} className="text-[12px] font-medium text-[#135130] hover:underline">
            {tx(d.buttonText, locale)}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-black/10">
        {items.map((e, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={e.icon} className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-medium text-black">{tx(e.title, locale)}</span>
            <span className="shrink-0 text-[12px] text-[#414141]">{e.date}</span>
          </li>
        ))}
      </ul>
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

function InfoCardBlock({ slug, locale, card }: { slug: string; locale: SectionProps["locale"]; card?: InfoCard }) {
  if (!card || card.enabled === false || !tx(card.title, locale)) return null;
  return (
    <aside className={`${cardClass} flex flex-col items-start`}>
      <span className="flex size-12 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
        <Icon name={card.icon} />
      </span>
      <p className="mt-3 text-[16px] font-semibold text-black">{tx(card.title, locale)}</p>
      {tx(card.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(card.description, locale)}</p>}
      {card.buttonLink && (
        <div className="mt-4">
          <LinkButton href={resolveHref(card.buttonLink, slug)} external={/^https?:\/\//.test(card.buttonLink)}>
            {tx(card.buttonText, locale) || "→"}
          </LinkButton>
        </div>
      )}
    </aside>
  );
}

function Bars({ categories, locale, colourful }: { categories: Category[]; locale: SectionProps["locale"]; colourful: boolean }) {
  return (
    <ul className="space-y-4">
      {categories.map((c, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-black">{tx(c.name, locale)}</span>
            <span className="text-[#414141]">
              ₹ {inr(c.amount ?? 0)} · <span className="font-semibold text-black">{c.percentage ?? 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/10" role="img" aria-label={`${tx(c.name, locale)} ${c.percentage ?? 0}%`}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, c.percentage ?? 0))}%`, backgroundColor: colourful ? (c.colour ?? "#135130") : "#135130" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** `income-sources`: categories as proportional bars plus an optional information card. */
export function IncomeSourcesSection({ slug, locale, data }: SectionProps) {
  const d = data as { enabled?: boolean; heading?: B; subtitle?: B; categories?: unknown; supportCard?: InfoCard };
  const categories = list<Category>(d.categories);
  if (d.enabled === false || categories.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale)} subheading={tx(d.subtitle, locale)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={cardClass}>
          <Bars categories={categories} locale={locale} colourful={false} />
        </div>
        <InfoCardBlock slug={slug} locale={locale} card={d.supportCard} />
      </div>
    </Band>
  );
}

/** `expenditure`: coloured category bars on a coloured band plus an optional side card. */
export function ExpenditureSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; subtitle?: B; backgroundColour?: string; categories?: unknown; sideCard?: InfoCard };
  const categories = list<Category>(d.categories);
  if (categories.length === 0) return null;
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#fcf7ee" }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-[26px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-1 mb-6 text-[14px] text-[#414141]">{tx(d.subtitle, locale)}</p>}
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className={cardClass}>
            <Bars categories={categories} locale={locale} colourful />
          </div>
          <InfoCardBlock slug={slug} locale={locale} card={d.sideCard} />
        </div>
      </div>
    </section>
  );
}

/** `budget-visualizer`: bar chart of the entered values, totals card and the report download. */
export async function BudgetVisualizerSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    enabled?: boolean;
    heading?: B;
    subtitle?: B;
    backgroundColour?: string;
    tabs?: { name?: B; enabled?: boolean }[];
    overviewCard?: { title?: B; fields?: { label?: B; valueType?: "dynamic" | "auto"; prefixSuffix?: string; colour?: string }[] };
    barChart?: { label?: B; value?: string; colour?: string }[];
    downloadReport?: { enabled?: boolean; buttonText?: B; fileId?: string };
  };
  const bars = list<{ label?: B; value?: string; colour?: string }>(d.barChart);
  if (d.enabled === false || bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => Number(b.value) || 0), 1);
  const total = bars.reduce((s, b) => s + (Number(b.value) || 0), 0);
  const tab = list<{ name?: B; enabled?: boolean }>(d.tabs).find((x) => x.enabled !== false);
  const fields = list<{ label?: B; valueType?: string; prefixSuffix?: string; colour?: string }>(d.overviewCard?.fields).filter((f) => f.valueType === "dynamic");
  const file = mediaUrl(slug, d.downloadReport?.enabled === false ? undefined : d.downloadReport?.fileId);
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#ffffff" }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-[26px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-1 text-[14px] text-[#414141]">{tx(d.subtitle, locale)}</p>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className={cardClass}>
            {tab && <p className="mb-4 text-[14px] font-semibold text-[#135130]">{tx(tab.name, locale)}</p>}
            <ul className="space-y-3">
              {bars.map((b, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-[13px]">
                  <span className="truncate text-black">{tx(b.label, locale)}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-black/10" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${((Number(b.value) || 0) / max) * 100}%`, backgroundColor: b.colour ?? "#135130" }} />
                  </span>
                  <span className="text-right font-semibold text-black">{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${cardClass} flex flex-col`}>
            <p className="text-[16px] font-semibold text-black">{tx(d.overviewCard?.title, locale)}</p>
            <ul className="mt-3 space-y-2">
              {fields.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#414141]">{tx(f.label, locale)}</span>
                  <span className="font-semibold" style={{ color: f.colour }}>
                    {f.prefixSuffix && /^[₹$€]/.test(f.prefixSuffix) ? f.prefixSuffix : ""}
                    {inr(total)}
                    {f.prefixSuffix && !/^[₹$€]/.test(f.prefixSuffix) ? ` ${f.prefixSuffix}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {file && (
              <a href={file} download className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#135130] px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90">
                <Download className="size-4" aria-hidden /> {tx(d.downloadReport?.buttonText, locale) || t("download")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** `documents`: downloadable PDF cards. */
export async function DocumentsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; subtitle?: B; description?: B; backgroundColour?: string; items?: unknown };
  const items = list<{ title?: B; fileId?: string; buttonText?: B }>(d.items).filter((i) => i.fileId);
  if (items.length === 0) return null;
  return (
    <section className="py-10" style={{ backgroundColor: d.backgroundColour || "#ffffff" }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-[26px] font-semibold text-black">{tx(d.heading, locale)}</h2>
        {tx(d.subtitle, locale) && <p className="mt-1 text-[14px] text-[#414141]">{tx(d.subtitle, locale)}</p>}
        {tx(d.description, locale) && <p className="mt-1 text-[13px] text-[#414141]">{tx(d.description, locale)}</p>}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((it, i) => (
            <li key={i} className={`${cardClass} flex flex-col items-center text-center`}>
              <span className="flex size-12 items-center justify-center rounded-full bg-[#e53935]/10 text-[#e53935]">
                <Icon name="file" />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-black">{tx(it.title, locale)}</p>
              <a href={mediaUrl(slug, it.fileId)} download className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[12px] font-medium text-[#135130] hover:underline">
                <Download className="size-3.5" aria-hidden /> {tx(it.buttonText, locale) || t("download")}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------ environment

/** `tree-adoption`: call to action with bullets, illustration and key figures. */
export async function TreeAdoptionSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; title?: B; description?: B; bullets?: unknown; illustrationId?: string; buttonText?: B; buttonLink?: string; stats?: unknown };
  if (d.enabled === false) return null;
  const bullets = list<B>(d.bullets).filter((b) => tx(b, locale));
  const stats = list<{ icon?: string; title?: B; value?: string; subText?: B }>(d.stats);
  const image = mediaUrl(slug, d.illustrationId);
  return (
    <Band tone="cream">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-[26px] font-semibold text-black">{tx(d.title, locale)}</h2>
          {tx(d.description, locale) && <p className="mt-2 text-[14px] leading-6 text-[#414141]">{tx(d.description, locale)}</p>}
          {bullets.length > 0 && (
            <ul className="mt-4 space-y-2 text-[13px] text-black">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <Icon name="leaf" className="mt-0.5 size-4 shrink-0 text-[#135130]" />
                  {tx(b, locale)}
                </li>
              ))}
            </ul>
          )}
          {d.buttonLink && (
            <div className="mt-5">
              <LinkButton href={resolveHref(d.buttonLink, slug)} external={/^https?:\/\//.test(d.buttonLink)}>
                {tx(d.buttonText, locale) || t("learnMore")}
              </LinkButton>
            </div>
          )}
        </div>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={image} alt="" className="mx-auto max-h-72 w-auto object-contain" />
        ) : (
          <span />
        )}
        {stats.length > 0 && (
          <ul className="space-y-3">
            {stats.map((s, i) => (
              <li key={i} className={`${cardClass} flex items-center gap-3 !p-3`}>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={s.icon} className="size-5" />
                </span>
                <span className="flex-1 text-[13px] font-medium text-black">{tx(s.title, locale)}</span>
                <span className="text-right">
                  <span className="block text-[18px] font-bold text-[#135130]">{s.value}</span>
                  {tx(s.subText, locale) && <span className="block text-[11px] text-[#414141]">{tx(s.subText, locale)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Band>
  );
}

/** `sustainability-initiatives`: image cards. */
export async function SustainabilityInitiativesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ imageId?: string; title?: B; description?: B; active?: boolean }>((data as { items?: unknown }).items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={t("initiatives")}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const img = mediaUrl(slug, it.imageId);
          return (
            <li key={i} className={`${cardClass} flex items-center gap-4`}>
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={img} alt="" loading="lazy" className="size-20 shrink-0 rounded-full object-cover" />
              )}
              <div>
                <p className="text-[14px] font-semibold text-black">{tx(it.title, locale)}</p>
                {tx(it.description, locale) && <p className="mt-1 text-[12px] leading-5 text-[#414141]">{tx(it.description, locale)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

const STALE_DAYS = 7;

/** `market-prices`: commodity price table with its update time; stale prices are flagged. */
export async function MarketPricesSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { title?: B; lastUpdatedAt?: string; marketName?: B; currency?: string; rows?: unknown; note?: B; buttonText?: B; buttonLink?: string };
  const rows = list<{ commodity?: B; unit?: string; minPrice?: number; maxPrice?: number; modalPrice?: number }>(d.rows);
  if (rows.length === 0) return null;
  const updated = d.lastUpdatedAt ? new Date(d.lastUpdatedAt) : null;
  const stale = updated ? new Date().getTime() - updated.getTime() > STALE_DAYS * 86_400_000 : true;
  const sym = d.currency === "INR" || !d.currency ? "₹" : `${d.currency} `;
  return (
    <Band heading={tx(d.title, locale)} subheading={tx(d.marketName, locale)}>
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[32rem] text-left text-[13px]">
          <thead className="text-[11px] tracking-wide text-[#414141] uppercase">
            <tr>
              <th className="py-2 pr-3">{t("commodity")}</th>
              <th className="py-2 pr-3">{t("unit")}</th>
              <th className="py-2 pr-3 text-right">{t("minPrice")}</th>
              <th className="py-2 pr-3 text-right">{t("maxPrice")}</th>
              <th className="py-2 text-right">{t("modalPrice")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-2.5 pr-3 font-medium text-black">{tx(r.commodity, locale)}</td>
                <td className="py-2.5 pr-3 text-[#414141]">{r.unit}</td>
                <td className="py-2.5 pr-3 text-right">{sym}{inr(r.minPrice ?? 0)}</td>
                <td className="py-2.5 pr-3 text-right">{sym}{inr(r.maxPrice ?? 0)}</td>
                <td className="py-2.5 text-right font-semibold text-[#135130]">{sym}{inr(r.modalPrice ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`mt-3 text-[12px] ${stale ? "font-medium text-[#c25f00]" : "text-[#414141]"}`}>
          {updated ? t("pricesUpdated", { date: updated.toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }) }) : ""}
          {stale && ` · ${t("pricesStale")}`}
        </p>
        {tx(d.note, locale) && <p className="mt-1 text-[12px] text-[#414141]">{tx(d.note, locale)}</p>}
      </div>
      {d.buttonLink && (
        <div className="mt-4">
          <LinkButton href={d.buttonLink} external={/^https?:\/\//.test(d.buttonLink)}>
            {tx(d.buttonText, locale) || t("learnMore")}
          </LinkButton>
        </div>
      )}
    </Band>
  );
}

/** `weather-update`: current conditions and the forecast the GP entered. */
export async function WeatherUpdateSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    title?: B;
    location?: B;
    current?: { temperature?: string; humidity?: string; wind?: string; feelsLike?: string; condition?: B };
    forecast?: unknown;
  };
  const c = d.current;
  const days = list<{ date?: string; icon?: string; maxTemp?: string; minTemp?: string }>(d.forecast);
  if (!c) return null;
  return (
    <Band heading={tx(d.title, locale)} subheading={tx(d.location, locale)} tone="cream">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className={cardClass}>
          <p className="text-[40px] leading-none font-bold text-black">{c.temperature}°C</p>
          <p className="mt-2 text-[14px] font-medium text-[#135130]">{tx(c.condition, locale)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            <div><dt className="text-[#414141]">{t("humidity")}</dt><dd className="font-semibold text-black">{c.humidity}%</dd></div>
            <div><dt className="text-[#414141]">{t("wind")}</dt><dd className="font-semibold text-black">{c.wind}</dd></div>
            <div><dt className="text-[#414141]">{t("feelsLike")}</dt><dd className="font-semibold text-black">{c.feelsLike}°C</dd></div>
          </dl>
        </div>
        {days.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {days.map((day, i) => (
              <li key={i} className={`${cardClass} flex flex-col items-center text-center !p-3`}>
                <span className="text-[12px] font-medium text-[#414141]">
                  {day.date ? new Date(`${day.date}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""}
                </span>
                <Icon name={day.icon ?? "sun"} className="my-2 size-7 text-[#f5871f]" />
                <span className="text-[13px] font-semibold text-black">{day.maxTemp}°</span>
                <span className="text-[12px] text-[#414141]">{day.minTemp}°</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Band>
  );
}
