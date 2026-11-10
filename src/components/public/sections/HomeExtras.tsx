import { ArrowDown, ArrowRight, ArrowUp, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import { getPublicWeather, publicMediaUrl, type PublicWeatherDto } from "@/lib/api/public";
import type { WardGeometry } from "@/lib/geo";
import { mediaUrl } from "./cms/kit";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";
import { WardDetailsCard } from "./WardDetailsCard";

/** Underline under card headings: orange / white / green segments (Figma 375:12438). */
function HeadingRule() {
  return (
    <div aria-hidden className="mt-4 flex w-[204px] gap-0">
      <span className="h-0.5 w-[68px] bg-[#ff9933]" />
      <span className="h-0.5 w-[68px] bg-white" />
      <span className="h-0.5 w-[68px] bg-[#138808]" />
    </div>
  );
}

/**
 * Weather card data. The backend's `weather` section stores `current` and `forecast`; the live endpoint
 * returns the same shape (or that manual section). The earlier design placeholder used flat fields.
 */
function normaliseWeather(data: unknown, live: PublicWeatherDto | null, locale: SectionProps["locale"]): Record<string, unknown> {
  const own = (data ?? {}) as Record<string, unknown> & { current?: PublicWeatherDto["current"]; location?: unknown };
  const src: { location?: unknown; current?: PublicWeatherDto["current"]; forecast?: PublicWeatherDto["forecast"] } = live?.current ? live : own.current ? (own as { current: PublicWeatherDto["current"]; location?: unknown }) : {};
  if (!src.current) return own;
  const c = src.current;
  const withUnit = (v: string | undefined, unit: string) => (v ? (/[°%]|km|mm/.test(v) ? v : `${v}${unit}`) : undefined);
  const text = (v: unknown) => (typeof v === "string" ? { en: v, mr: v } : v);
  const days = (src.forecast ?? []).slice(0, 5).map((f) => ({
    day: f.date ? new Date(`${f.date}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { weekday: "short" }) : "",
    max: f.maxTemp,
    min: f.minTemp,
  }));
  return {
    title: own.title,
    location: text(src.location ?? own.location),
    temperature: (c.temperature ?? "").replace(/\s*°\s*C?$/i, ""),
    condition: text(c.condition),
    feelsLike: withUnit(c.feelsLike, "°C"),
    humidity: withUnit(c.humidity, "%"),
    wind: c.wind,
    date: new Date().toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }),
    days,
  };
}

/** Marathi form of the placeholder weather values: Devanagari digits, day-part words, month and unit names. */
function mrWeather(v: string | undefined, locale: string): string | undefined {
  if (!v || locale !== "mr") return v;
  const DEV = "०१२३४५६७८९";
  const MONTHS: Record<string, string> = { Jan: "जाने.", Feb: "फेब्रु.", Mar: "मार्च", Apr: "एप्रि.", May: "मे", Jun: "जून", Jul: "जुलै", Aug: "ऑग.", Sep: "सप्टें.", Oct: "ऑक्टो.", Nov: "नोव्हें.", Dec: "डिसें." };
  const DIRS: Record<string, string> = { N: "उ", S: "द", E: "पू", W: "प", NW: "वायव्य", NE: "ईशान्य", SW: "नैऋत्य", SE: "आग्नेय" };
  return v
    .replace(/(\d{1,2}):(\d{2}) (AM|PM)/g, (_m, h: string, mi: string, ap: string) => (ap === "AM" ? "सकाळी" : "सायं.") + " " + h + ":" + mi)
    .replace(/km\/hr/g, "किमी/तास")
    .replace(/\bkm\b/g, "किमी")
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m] ?? m)
    .replace(/\b(NW|NE|SW|SE|N|S|E|W)\b/g, (m) => DIRS[m] ?? m)
    .replace(/\d/g, (c) => DEV[Number(c)] ?? c);
}

/**
 * `weather`: today's weather card (Figma 375:12414). Frontend-only placeholder — the backend has
 * no weather section; values here come from the design until a weather source is wired in.
 */
export async function WeatherSection({ slug, locale, data }: SectionProps) {
  const tw = await getTranslations("public.weatherLabels");
  const live = await getPublicWeather(slug);
  const d = normaliseWeather(data, live, locale) as {
    title?: Bilingual;
    location?: Bilingual;
    temperature?: string;
    condition?: Bilingual;
    feelsLike?: string;
    humidity?: string;
    wind?: string;
    visibility?: string;
    sunrise?: string;
    sunset?: string;
    date?: string;
    days?: { day?: string; max?: string; min?: string }[];
  };
  if (!d.temperature) return null;
  const stat = (label: string, value?: string) =>
    value ? (
      <p className="text-[12px] leading-4 sm:whitespace-nowrap text-white">
        {label}: <strong className="font-bold">{value}</strong>
      </p>
    ) : null;
  return (
    // Figma 375:13077: 650×263; title row at 35px, 64px temperature centred at 96px, details column at 223px,
    // a 591px rule at 182px and the sunrise / sunset / date row 16px below it.
    <div
      className="flex h-full min-h-[263px] min-w-0 flex-col rounded-[10px] px-[29px] pt-[35px] pb-5 text-white"
      style={{ backgroundImage: "linear-gradient(-62.82deg, #0950aa 38%, #002f6b 98.15%)" }}
    >
      <div className="flex items-start justify-between gap-4 pl-8 text-[12px] leading-4 sm:-mr-3">
        <span className="font-bold">{pickText(d.title, locale)}</span>
        <span>{pickText(d.location, locale)}</span>
      </div>
      <div className="mt-[14px] flex flex-wrap gap-y-3">
        <p className="flex w-[194px] shrink-0 items-start pl-[31px] font-bold">
          <span className="text-[64px] leading-[87px]">{d.temperature}</span>
          <span aria-hidden className="mt-[20px] size-3 rounded-full border-2 border-white" />
          <span className="sr-only">°</span>
          <span className="mt-[9px] ml-1 text-[30px] leading-[41px]">C</span>
        </p>
        <div className="pt-5">
          <p className="text-[14px] leading-[19px] font-bold text-[#ffc769]">{pickText(d.condition, locale)}</p>
          <div className="mt-[15px] grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 sm:grid-cols-[225px_auto] gap-y-[11px]">
            {stat(tw("feelsLike"), d.feelsLike)}
            {stat(tw("humidity"), d.humidity)}
            {stat(tw("wind"), mrWeather(d.wind, locale))}
            {stat(tw("visibility"), mrWeather(d.visibility, locale))}
          </div>
        </div>
      </div>
      {d.days && d.days.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-white/30 pt-3 text-[11px]">
          {d.days.map((f, i) => (
            <li key={i}>
              {f.day} <strong className="font-bold">{f.max}°</strong>/{f.min}°
            </li>
          ))}
        </ul>
      )}
      <div className="mt-[30px] grid grid-cols-[257px_253px_auto] border-t border-white/40 pt-4 pl-[29px] text-[12px] leading-4 max-sm:grid-cols-1 max-sm:gap-1">
        <span>{d.sunrise ? `${tw("sunrise")}: ${mrWeather(d.sunrise, locale)}` : ""}</span>
        <span>{d.sunset ? `${tw("sunset")}: ${mrWeather(d.sunset, locale)}` : ""}</span>
        <span className="whitespace-nowrap">{mrWeather(d.date, locale)}</span>
      </div>
    </div>
  );
}

/** `sarpanch-message`: peach quote card with orange left bar (Figma 375:12414). */
export function SarpanchMessageSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; message?: Bilingual; name?: Bilingual; designation?: Bilingual; photoId?: string };
  const message = pickText(d.message, locale);
  if (!message) return null;
  const name = pickText(d.name, locale);
  const initials = name.replace(/^(Smt\.?|Shri\.?|Mr\.?|Mrs\.?)\s*/i, "").split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("").toUpperCase();
  return (
        // Figma 375:13092: 5px orange bar, 10% orange tint, heading at 18px, 50px avatar at 57px, quote at 121px.
    <figure className="flex h-full min-h-[263px] min-w-0 flex-col rounded-[10px] border-l-[5px] border-[#ff9933] bg-[#ff9933]/10 pt-[18px] pr-6 pb-4 pl-[46px] shadow-[0_0_8.6px_rgba(255,153,51,0.45)]">
      {pickText(d.heading, locale) && <h2 className="mb-5 text-[14px] leading-[19px] font-bold text-[#000080]">{pickText(d.heading, locale)}</h2>}
      {d.photoId ? (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served media
        <img src={publicMediaUrl(slug, d.photoId)} alt="" className="size-[50px] rounded-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden className="flex size-[50px] items-center justify-center rounded-full bg-[#000080] text-[21.9px] font-bold text-white">
          {initials}
        </span>
      )}
      <blockquote className="mt-[14px] max-w-[575px] text-[14px] leading-6 tracking-[0.14px] text-black italic">“{message}”</blockquote>
      <figcaption className="mt-2.5 text-[12px] leading-6 tracking-[0.12px] text-[#414141]">
        — {name}
        {pickText(d.designation, locale) && <>, {pickText(d.designation, locale)}</>}
      </figcaption>
    </figure>
  );
}

/**
 * `welcome-video`: "Welcome to <village>" photo with a play prompt (Figma 375:12438). Frontend-only
 * placeholder until the backend offers a video/welcome-media section.
 */
export function WelcomeVideoSection({ locale, data, tenantName }: SectionProps) {
  const d = data as { heading?: Bilingual; watchLabel?: Bilingual; imageUrl?: string; videoUrl?: string };
  const label = pickText(d.watchLabel, locale);
  const inner = (
    <>
      {/* Figma 375:13109: the design's lakeside photo under a navy 40% tint, an 85px outlined play ring and the label. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
      <img src={d.imageUrl ?? "/images/figma/home-video.png"} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      <span aria-hidden className="absolute inset-0 bg-[#000080]/40" />
      <span className="relative flex flex-col items-center gap-[11px] text-white">
        {/* Figma play_arrow: 85px ring (white 25% fill, 2px stroke) around an outlined play triangle. */}
        <svg aria-hidden viewBox="0 0 86.785 86.785" width={87} height={87} fill="none">
          <rect x="1" y="1" width="84.785" height="84.785" rx="42.39" fill="white" fillOpacity="0.25" />
          <rect x="1" y="1" width="84.785" height="84.785" rx="42.39" stroke="white" strokeWidth="2" />
          <path d="M29.26 68.12V18.66l38.86 24.73-38.86 24.73Zm7.07-12.89 18.55-11.84-18.55-11.83v23.67Z" fill="white" />
        </svg>
        {label && (
          <span className="inline-flex items-center gap-1.5 text-[15.6px] leading-[48px] font-black">
            <Play className="size-[22px] fill-white stroke-white" aria-hidden /> {label}
          </span>
        )}
      </span>
    </>
  );
  return (
    <div>
      <h2 className="text-[30px] leading-[45px] font-semibold text-black">
        {pickText(d.heading, locale)} {tenantName}
      </h2>
      <HeadingRule />
      {d.videoUrl ? (
        <a href={d.videoUrl} target="_blank" rel="noopener" className="relative mt-[38px] flex h-[366px] items-center justify-center overflow-hidden rounded-[15px]">
          {inner}
        </a>
      ) : (
        <div className="relative mt-[38px] flex h-[366px] items-center justify-center overflow-hidden rounded-[15px]">{inner}</div>
      )}
    </div>
  );
}

/** Bar colours cycle through the Figma palette. */
const BAR_COLORS = ["#0277bd", "#138808", "#f57c00", "#c62828", "#6a1b9a", "#00838f"];

/** `village-progress`: labelled coloured bars; length follows the first percentage in the value. */
export function VillageProgressSection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; subheading?: Bilingual; items?: { label?: Bilingual; valueText?: string }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  return (
    <div>
      {pickText(d.heading, locale) && <h2 className="text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
      <HeadingRule />
      {/* Figma 375:13125: 11.5px caption 28px under the rule, then 12px labels with 16px bars (8px apart, rows 12px apart). */}
      {pickText(d.subheading, locale) && <p className="mt-7 px-4 text-[11.5px] leading-[20.7px] font-medium text-[#414141]">{pickText(d.subheading, locale)}</p>}
      <ul className="mt-[17px] flex flex-col gap-3 py-1 pl-4">
        {items.map((it, i) => {
          const pct = Math.min(100, Math.max(0, Number.parseFloat(it.valueText ?? "0") || 0));
          return (
            <li key={i}>
              <p className="text-[12px] leading-[20.7px] font-medium text-black">{pickText(it.label, locale)}</p>
              <div className="mt-2 h-4 w-full" role="progressbar" aria-label={pickText(it.label, locale)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} title={it.valueText}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The design's trend line (Figma "Group 25"): a thin green curve with a blurred copy beneath it as its shadow. */
function Sparkline({ id }: { id: string }) {
  const curve = "M9.69 24.94C9.69 24.94 15.2 20.61 19.92 19.83C24.64 19.04 32.51 24.15 42.34 22.58C52.18 21.01 52.97 10.78 62.41 7.24C71.85 3.7 77.36 12.75 86.41 12.75C95.45 12.75 99.39 8.81 102.14 7.24C104.9 5.66 108.04 6.06 108.04 6.06";
  return (
    <svg aria-hidden viewBox="0 0 119.7 41.1" width={100} height={34} className="shrink-0 overflow-visible">
      <defs>
        <filter id={id} x="0" y="0" width="119.7" height="41.1" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="5.19" />
        </filter>
      </defs>
      <path d={curve} transform="translate(1.18 5.16)" fill="none" stroke="#138808" strokeWidth="1.57" filter={`url(#${id})`} />
      <path d={curve} fill="none" stroke="#138808" strokeWidth="0.79" />
    </svg>
  );
}

/** Icon per KPI tile, in the Figma order (people, book, drop). */
const KPI_ICONS = ["stat-population", "stat-literacy", "stat-population", "stat-water", "stat-literacy", "stat-population", "stat-water", "stat-literacy", "stat-population"];

/** `monthly-metrics`: 3-column KPI tiles with icon, value, monthly change and trend line (Figma 375:12550). */
export function MonthlyMetricsSection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; period?: Bilingual; items?: { label?: Bilingual; caption?: Bilingual; value?: string; change?: string; trend?: "up" | "down" | "flat"; trendIsPositive?: boolean; comparedTo?: Bilingual }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const period = pickText(d.period, locale);
  return (
    <div>
      {pickText(d.heading, locale) && <h2 className="mb-4 text-[22px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
      {/* Figma 375:13212: 203×142 tiles, 20px column / 18px row gaps, inset 16px × 20px inside the 683px column. */}
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-y-[18px] xl:px-4 xl:py-5">
        {items.map((m, i) => {
          const icon = KPI_ICONS[i % KPI_ICONS.length]!;
          const caption = pickText(m.caption, locale);
          return (
            <li key={i} className="flex min-h-[142px] flex-col justify-between rounded-[8px] bg-white px-[13px] py-[9px] shadow-[0_0_10px_rgba(0,0,0,0.12)]">
              <p className="text-[9.5px] leading-[19px] text-black">{pickText(m.label, locale)}</p>
              <div className="flex items-center gap-4 px-1">
                <FigmaIcon name={icon} width={54} />
                <div>
                  <p className="text-[22px] leading-[30px] font-medium text-[#135130]">{m.value}</p>
                  {caption && <p className="text-[8px] leading-3 text-[#414141]">{caption}</p>}
                </div>
              </div>
              {/* Figma: "↑ 1.2% this month" on the left, the trend line right beside it on the same baseline. */}
              <div className="flex items-center gap-1">
                {m.change && (() => {
                  // `trend` sets the arrow (default from the sign of `change`); `trendIsPositive: false` marks bad news in red.
                  const trend = m.trend ?? (m.change.trim().startsWith("-") ? "down" : "up");
                  const Arrow = trend === "down" ? ArrowDown : trend === "flat" ? ArrowRight : ArrowUp;
                  const colour = trend === "flat" ? "text-[#414141]" : m.trendIsPositive === false ? "text-[#d92d20]" : "text-[#138808]";
                  const when = pickText(m.comparedTo, locale) || period;
                  return (
                    <p className="inline-flex items-center gap-1 whitespace-nowrap text-[9.5px] leading-[19px]">
                      <Arrow className={`size-3.5 ${colour}`} aria-hidden />
                      <span className={colour}>{m.change.trim().replace(/^[+-]/, "")}</span> {when && <span className="text-black">{when}</span>}
                    </p>
                  );
                })()}
                <Sparkline id={`spark-${i}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Ward map placeholder from the design; swap via `mapImageUrl` once a ward map is uploaded. */
/** `ward-details`: ward map + ward selector with per-ward progress rows (Figma 375:12497). */
export async function WardDetailsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    heading?: Bilingual;
    mapImageUrl?: string;
    viewAll?: { label?: Bilingual; href?: string };
    wards?: { name?: Bilingual; wardNo?: string; colour?: string; geometry?: WardGeometry; mapImageId?: string; items?: { label?: Bilingual; valueText?: string; percent?: number }[] }[];
  };
  const wards = (d.wards ?? []).map((w) => ({
    name: pickText(w.name, locale),
    wardNo: w.wardNo,
    colour: w.colour,
    geometry: w.geometry,
    mapImage: w.mapImageId ? mediaUrl(slug, w.mapImageId) : undefined,
    items: (w.items ?? []).map((it) => ({ label: pickText(it.label, locale), valueText: it.valueText ?? "", percent: it.percent })),
  }));
  if (wards.length === 0) return null;
  const va = d.viewAll;
  return (
    <WardDetailsCard
      heading={pickText(d.heading, locale) || t("wardDetails")}
      wards={wards}
      mapSrc={d.mapImageUrl}
      viewAll={va?.href && pickText(va.label, locale) ? { label: pickText(va.label, locale), href: resolveHref(va.href, slug) } : undefined}
    />
  );
}
