import { ArrowUp, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";
import { WardDetailsCard } from "./WardDetailsCard";

/** Underline under card headings: orange / white / green segments (Figma 375:12438). */
function HeadingRule() {
  return (
    <div aria-hidden className="mt-3 flex w-[204px] gap-0">
      <span className="h-0.5 w-[68px] bg-[#ff9933]" />
      <span className="h-0.5 w-[68px] bg-white" />
      <span className="h-0.5 w-[68px] bg-[#138808]" />
    </div>
  );
}

/**
 * `weather`: today's weather card (Figma 375:12414). Frontend-only placeholder — the backend has
 * no weather section; values here come from the design until a weather source is wired in.
 */
export async function WeatherSection({ locale, data }: SectionProps) {
  const tw = await getTranslations("public.weatherLabels");
  const d = data as {
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
  };
  if (!d.temperature) return null;
  const stat = (label: string, value?: string) =>
    value ? (
      <p className="text-[12px] leading-[22px] text-white">
        {label}: <strong className="font-bold">{value}</strong>
      </p>
    ) : null;
  return (
    <div className="flex h-full min-h-[263px] flex-col justify-between rounded-[10px] bg-gradient-to-br from-[#003580] to-[#0b57b0] px-[30px] py-9 text-white">
      <div className="flex items-start justify-between gap-4 text-[12px] font-semibold">
        <span>{pickText(d.title, locale)}</span>
        <span className="font-normal">{pickText(d.location, locale)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-14 gap-y-3">
        <p className="flex items-start text-[64px] leading-none font-bold">
          {d.temperature}
          <span className="mt-1 text-[32px] font-semibold">°C</span>
        </p>
        <div>
          <p className="text-[14px] leading-[22px] font-semibold text-[#ffc857]">{pickText(d.condition, locale)}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-14">
            {stat(tw("feelsLike"), d.feelsLike)}
            {stat(tw("humidity"), d.humidity)}
            {stat(tw("wind"), d.wind)}
            {stat(tw("visibility"), d.visibility)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-white/30 pt-4 text-[12px]">
        <span>{tw("sunrise")}: {d.sunrise}</span>
        <span>{tw("sunset")}: {d.sunset}</span>
        <span>{d.date}</span>
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
    <figure className="flex h-full min-h-[263px] flex-col gap-4 rounded-[10px] border-l-[6px] border-[#ff9933] bg-[#ffefe3] px-[50px] py-7 shadow-[0_0_10px_rgba(0,0,0,0.06)]">
      {pickText(d.heading, locale) && <h2 className="text-[14px] font-bold text-[#000080]">{pickText(d.heading, locale)}</h2>}
      {d.photoId ? (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served media
        <img src={publicMediaUrl(slug, d.photoId)} alt="" className="size-[50px] rounded-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden className="flex size-[50px] items-center justify-center rounded-full bg-[#000080] text-[18px] font-bold text-white">
          {initials}
        </span>
      )}
      <blockquote className="text-[14px] leading-[26px] text-black italic">“{message}”</blockquote>
      <figcaption className="text-[12px] text-[#414141]">
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
      {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
      <img src={d.imageUrl ?? "/images/figma/home-hero.png"} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      <span aria-hidden className="absolute inset-0 bg-[#1a237e]/45" />
      <span className="relative flex flex-col items-center gap-5 text-white">
        <span className="flex size-[88px] items-center justify-center rounded-full border-[3px] border-white/80">
          <Play className="size-10 fill-white" aria-hidden />
        </span>
        {label && (
          <span className="inline-flex items-center gap-2 text-[16px] font-bold">
            <Play className="size-4 fill-white" aria-hidden /> {label}
          </span>
        )}
      </span>
    </>
  );
  return (
    <div>
      <h2 className="text-[28px] leading-[38px] font-semibold text-black">
        {pickText(d.heading, locale)} {tenantName}
      </h2>
      <HeadingRule />
      {d.videoUrl ? (
        <a href={d.videoUrl} target="_blank" rel="noopener" className="relative mt-9 flex h-[366px] items-center justify-center overflow-hidden rounded-[16px]">
          {inner}
        </a>
      ) : (
        <div className="relative mt-9 flex h-[366px] items-center justify-center overflow-hidden rounded-[16px]">{inner}</div>
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
      {pickText(d.heading, locale) && <h2 className="text-[28px] leading-[38px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
      <HeadingRule />
      {pickText(d.subheading, locale) && <p className="mt-9 px-4 text-[12px] text-[#414141]">{pickText(d.subheading, locale)}</p>}
      <ul className="mt-4 flex flex-col gap-[18px] px-4">
        {items.map((it, i) => {
          const pct = Math.min(100, Math.max(0, Number.parseFloat(it.valueText ?? "0") || 0));
          return (
            <li key={i}>
              <p className="text-[12px] text-black">{pickText(it.label, locale)}</p>
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

/** Decorative upward trend line under each KPI tile. */
function Sparkline() {
  return (
    <svg aria-hidden viewBox="0 0 100 24" className="h-6 w-[100px] shrink-0 drop-shadow-[0_4px_4px_rgba(34,160,10,0.35)]">
      <path d="M1 20 C 12 12, 20 8, 30 14 S 46 20, 56 12 S 74 2, 99 5" fill="none" stroke="#22a00a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** Icon per KPI tile, in the Figma order (people, book, drop). */
const KPI_ICONS = ["stat-population", "stat-literacy", "stat-population", "stat-water", "stat-literacy", "stat-population", "stat-water", "stat-literacy", "stat-population"];

/** `monthly-metrics`: 3-column KPI tiles with icon, value, monthly change and trend line (Figma 375:12550). */
export function MonthlyMetricsSection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; period?: Bilingual; items?: { label?: Bilingual; caption?: Bilingual; value?: string; change?: string }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const period = pickText(d.period, locale);
  return (
    <div>
      {pickText(d.heading, locale) && <h2 className="mb-4 text-[22px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((m, i) => {
          const icon = KPI_ICONS[i % KPI_ICONS.length]!;
          const caption = pickText(m.caption, locale);
          return (
            <li key={i} className="flex min-h-[142px] flex-col justify-between rounded-[8px] bg-white px-[13px] py-[9px] shadow-[0_0_10px_rgba(0,0,0,0.12)]">
              <p className="text-[12px] leading-[19px] text-black">{pickText(m.label, locale)}</p>
              <div className="flex items-center gap-4 px-1">
                <FigmaIcon name={icon} width={54} />
                <div>
                  <p className="text-[24px] leading-[30px] font-semibold text-[#135130]">{m.value}</p>
                  {caption && <p className="text-[8px] leading-3 text-[#414141]">{caption}</p>}
                </div>
              </div>
              <div className="flex items-end justify-between">
                {m.change && (
                  <p className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-[#1b7a0a]">
                    <ArrowUp className="size-3.5" aria-hidden />
                    {m.change.replace(/^\+/, "")} {period && <span className="text-black">{period}</span>}
                  </p>
                )}
                <Sparkline />
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
    wards?: { name?: Bilingual; items?: { label?: Bilingual; valueText?: string; percent?: number }[] }[];
  };
  const wards = (d.wards ?? []).map((w) => ({
    name: pickText(w.name, locale),
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
