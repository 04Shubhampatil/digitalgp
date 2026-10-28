import { Play } from "lucide-react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

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
export function WeatherSection({ locale, data }: SectionProps) {
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
            {stat("Feels like", d.feelsLike)}
            {stat("Humidity", d.humidity)}
            {stat("Wind", d.wind)}
            {stat("Visibility", d.visibility)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-white/30 pt-4 text-[12px]">
        <span>Sunrise: {d.sunrise}</span>
        <span>Sunset: {d.sunset}</span>
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

/** `monthly-metrics`: indicator tiles with the period's change. */
export function MonthlyMetricsSection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; period?: Bilingual; items?: { label?: Bilingual; value?: string; change?: string }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const period = pickText(d.period, locale);
  return (
    <section className="bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {pickText(d.heading, locale) && <h2 className="mb-6 text-2xl font-bold text-ink md:text-3xl">{pickText(d.heading, locale)}</h2>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <li key={i} className="flex flex-col justify-between rounded-card border border-line bg-surface p-5">
              <p className="text-sm font-medium text-muted">{pickText(m.label, locale)}</p>
              <p className="mt-3 text-3xl font-bold text-ink">{m.value}</p>
              {m.change && (
                <p className="mt-2 text-xs font-semibold text-success">
                  {m.change} {period && <span className="font-normal text-muted">{period}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** `ward-details`: per-ward figures as label/value rows (first ward shown by default). */
export function WardDetailsSection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; wards?: { name?: Bilingual; items?: { label?: Bilingual; valueText?: string }[] }[] };
  const wards = d.wards ?? [];
  if (wards.length === 0) return null;
  return (
    <section className="bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {pickText(d.heading, locale) && <h2 className="mb-6 text-2xl font-bold text-ink md:text-3xl">{pickText(d.heading, locale)}</h2>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wards.map((w, wi) => (
            <details key={wi} open={wi === 0} className="group rounded-card border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {pickText(w.name, locale)}
                <span aria-hidden className="text-muted transition-transform group-open:rotate-180">▾</span>
              </summary>
              <dl className="divide-y divide-line border-t border-line px-5">
                {(w.items ?? []).map((it, i) => (
                  <div key={i} className="flex items-center justify-between py-3 text-sm">
                    <dt className="text-muted">{pickText(it.label, locale)}</dt>
                    <dd className="font-semibold text-ink">{it.valueText}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
