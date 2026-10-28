import { ArrowRight, Building2, CircleCheck, ClipboardPlus, Droplet, GlassWater, GraduationCap, Hourglass, House, Leaf, Lightbulb, Monitor, Plug, Recycle, Route, Star, Toilet, TreePine, Users, Wifi, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicProjects, publicMediaUrl } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { BeforeAfterGrid, ProjectTabs, type ProjectCard } from "./KitClient";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

/**
 * Reusable page blocks for the inner public pages (Key Projects, Infrastructure, Finance …),
 * built from the Figma design. Every block is driven by section `data`, so the content comes from
 * src/content/figma-*.ts until the backend publishes matching sections.
 */

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="text-[20px] font-semibold tracking-wide text-[#ea7f14] uppercase">{children}</p>;
const ghostBtn = "inline-flex items-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-2 text-[13.5px] text-[#135130] hover:bg-[#135130]/5";
const GREEN = "#135130";

/** Card chrome used by tracker/impact/timeline/finance blocks that sit side by side. */
const card = "rounded-[10px] border border-black/15 bg-white px-8 py-6";

/** `project-showcase`: stage tabs + cards. Real published projects replace the placeholders. */
export async function ProjectShowcaseSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    eyebrow?: B;
    tabs?: { key: string; label: B }[];
    items?: { stage?: string; name?: B; location?: B; year?: string; budget?: string; outcome?: B; families?: string; imageUrl?: string }[];
    viewAll?: Btn;
  };
  const live = await listPublicProjects(slug, { limit: 100 }).catch(() => null);
  const fmt = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const items: ProjectCard[] =
    live && live.data.length > 0
      ? live.data.map((p) => ({
          stage: p.stage,
          name: pickText(pair(p.nameEn, p.nameMr), locale),
          location: p.wardNo ? `${t("ward")} ${p.wardNo}` : undefined,
          year: p.year ? String(p.year) : undefined,
          budget: p.budget ? fmt.format(Number(p.budget)) : undefined,
          outcome: pickText(pair(p.outcomeEn, p.outcomeMr), locale) || undefined,
          families: p.familiesBenefited !== null ? p.familiesBenefited.toLocaleString("en-IN") : undefined,
          imageUrl: p.coverImageId ? publicMediaUrl(slug, p.coverImageId) : undefined,
        }))
      : (d.items ?? []).map((p) => ({
          stage: p.stage ?? "COMPLETED",
          name: pickText(p.name, locale),
          location: pickText(p.location, locale) || undefined,
          year: p.year,
          budget: p.budget,
          outcome: pickText(p.outcome, locale) || undefined,
          families: p.families,
          imageUrl: p.imageUrl ?? "/images/figma/about-road.png",
        }));
  const tabs = (d.tabs ?? []).map((x) => ({ key: x.key, label: pickText(x.label, locale) }));
  const labels = {
    year: t("projectYear"),
    budget: t("budget"),
    outcome: t("outcome"),
    families: t("familiesBenefited"),
    details: t("viewDetails"),
    stageLabel: { ONGOING: t("projectStage.ONGOING"), COMPLETED: t("projectStage.COMPLETED"), UPCOMING: t("projectStage.UPCOMING") },
    empty: t("noProjects"),
  };
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <Eyebrow>{pickText(d.eyebrow, locale)}</Eyebrow>
        </div>
        <ProjectTabs tabs={tabs} items={items} labels={labels} />
        {d.viewAll?.href && (
          <div className="mt-8 flex justify-center">
            <Link href={resolveHref(d.viewAll.href, slug)} className="inline-flex rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90">
              {pickText(d.viewAll.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/** `before-after`: draggable comparison tiles. */
export async function BeforeAfterSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { eyebrow?: B; heading?: B; items?: { label?: B; beforeUrl?: string; afterUrl?: string; height?: number }[]; viewAll?: Btn };
  const items = (d.items ?? []).map((i) => ({
    label: pickText(i.label, locale),
    beforeUrl: i.beforeUrl ?? "/images/figma/about-aerial.png",
    afterUrl: i.afterUrl ?? "/images/figma/about-road.png",
    height: i.height,
  }));
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {pickText(d.heading, locale) && <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
        <div className="mb-5 flex items-center justify-between">
          <Eyebrow>{pickText(d.eyebrow, locale)}</Eyebrow>
          {d.viewAll?.href && (
            <Link href={resolveHref(d.viewAll.href, slug)} className="inline-flex items-center gap-2 text-[14px] text-[#135130] hover:underline">
              {pickText(d.viewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <BeforeAfterGrid items={items} before={t("before")} after={t("after")} />
      </div>
    </section>
  );
}

const TRACKER_ICONS: LucideIcon[] = [Leaf, Droplet, Monitor, Zap, Leaf, Recycle, Building2, Droplet, TreePine, Building2];

/** `progress-tracker`: "Village Resolution Tracker" — icon, label, bar and percentage rows. */
export function ProgressTrackerSection({ locale, data }: SectionProps) {
  const d = data as { title?: B; subtitle?: B; items?: { label?: B; percent?: number }[] };
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase">{pickText(d.title, locale)}</h2>
      <p className="mt-2 text-[12px] text-[#414141]">{pickText(d.subtitle, locale)}</p>
      <ul className="mt-5 flex flex-col gap-[14px]">
        {(d.items ?? []).map((it, i) => {
          const Icon = TRACKER_ICONS[i % TRACKER_ICONS.length]!;
          const pct = Math.max(0, Math.min(100, it.percent ?? 0));
          return (
            <li key={i} className="flex items-center gap-4 text-[13px]">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#135130] text-white">
                <Icon className="size-3.5" />
              </span>
              <span className="w-[150px] shrink-0 text-black">{pickText(it.label, locale)}</span>
              <span className="h-[5px] flex-1 rounded-full bg-[#e6ede9]" role="progressbar" aria-label={pickText(it.label, locale)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <span className="block h-full rounded-full bg-[#135130]" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 text-right text-[12px] text-black">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Outline icons for the Impact Dashboard tiles, in the Figma order. */
const IMPACT_ICONS: LucideIcon[] = [Toilet, Plug, GlassWater, House, Route, Lightbulb, Wifi, GraduationCap, TreePine, Users, ClipboardPlus, Recycle];

/** `impact-grid`: "Impact Dashboard" — indicator tiles. */
export function ImpactGridSection({ locale, data }: SectionProps) {
  const d = data as { title?: B; subtitle?: B; items?: { label?: B; value?: string; unit?: string }[] };
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase">{pickText(d.title, locale)}</h2>
      <p className="mt-2 text-[12px] text-[#414141]">{pickText(d.subtitle, locale)}</p>
      <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {(d.items ?? []).map((it, i) => {
          const Icon = IMPACT_ICONS[i % IMPACT_ICONS.length]!;
          return (
          <li key={i} className="flex items-center gap-3 rounded-[10px] border border-black/15 bg-white px-3 py-5">
            <span aria-hidden className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]">
              <Icon className="size-6" strokeWidth={1.6} />
            </span>
            <div>
              <p className="text-[11px] font-medium text-[#135130]">{pickText(it.label, locale)}</p>
              <p className="mt-1 text-[24px] leading-[30px] font-bold text-black">
                {it.value}
                {it.unit && <span className="ml-1 text-[14px] font-semibold">{pickText({ en: it.unit }, locale)}</span>}
              </p>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

/** `dev-timeline`: milestone timeline with completed / in-progress markers. */
export function DevTimelineSection({ slug, locale, data }: SectionProps) {
  const d = data as { title?: B; steps?: { year?: string; label?: B; status?: B; done?: boolean }[]; action?: Btn };
  const steps = d.steps ?? [];
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase">{pickText(d.title, locale)}</h2>
      <ol className="relative mt-8 grid auto-cols-fr grid-flow-col gap-2">
        <span aria-hidden className="absolute top-[14px] right-4 left-4 h-px bg-black/25" />
        {steps.map((s, i) => (
          <li key={i} className="relative flex flex-col items-center text-center">
            <span className={`relative z-10 flex size-7 items-center justify-center rounded-full text-white ${s.done === false ? "bg-[#f5871f]" : "bg-[#135130]"}`}>
              {s.done === false ? <Hourglass className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
            </span>
            <p className={`mt-3 text-[16px] font-semibold ${s.done === false ? "text-[#f5871f]" : "text-[#135130]"}`}>{s.year}</p>
            <p className="mt-3 text-[12px] leading-[16px] text-black">{pickText(s.label, locale)}</p>
            <p className={`mt-4 text-[11px] ${s.done === false ? "text-[#f5871f]" : "text-[#135130]"}`}>{pickText(s.status, locale)}</p>
          </li>
        ))}
      </ol>
      {d.action?.href && (
        <div className="mt-6 flex justify-center">
          <Link href={resolveHref(d.action.href, slug)} className={ghostBtn}>
            {pickText(d.action.label, locale)} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

const ALLOC_COLORS = ["#135130", "#1a62e0", "#f5a03a", "#c62828", "#6a1b9a", "#1b5ec7"];
const SOURCE_COLORS = ["#135130", "#1a62e0", "#2e9e2e", "#f5a03a"];

/** `financial-overview`: budget allocation bars, funding-source donut and legend. */
export function FinancialOverviewSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    title?: B;
    budgetLabel?: B;
    sourcesLabel?: B;
    allocation?: { label?: B; percent?: number }[];
    sources?: { label?: B; amount?: string; value?: number }[];
    action?: Btn;
  };
  const sources = d.sources ?? [];
  const total = sources.reduce((a, s) => a + (s.value ?? 0), 0) || 1;
  const R = 40;
  const C = 2 * Math.PI * R;
  const segs = sources.reduce<{ len: number; off: number }[]>((out, s) => {
    const off = out.length ? out[out.length - 1]!.off + out[out.length - 1]!.len : 0;
    return [...out, { len: ((s.value ?? 0) / total) * C, off }];
  }, []);
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase">{pickText(d.title, locale)}</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[12px] text-[#414141]">{pickText(d.budgetLabel, locale)}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {(d.allocation ?? []).map((a, i) => (
              <li key={i} className="flex items-center gap-3 text-[11px]">
                <span className="w-[62px] shrink-0 text-black">{pickText(a.label, locale)}</span>
                <span className="h-1.5 flex-1 rounded-full bg-[#e5e7eb]">
                  <span className="block h-full rounded-full" style={{ width: `${a.percent ?? 0}%`, backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                </span>
                <span className="w-8 text-right text-[#414141]">{a.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-start gap-4">
            <svg viewBox="0 0 100 100" className="size-[110px] shrink-0 -rotate-90" role="img" aria-label={pickText(d.sourcesLabel, locale)}>
              {segs.map((g, i) => (
                <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={SOURCE_COLORS[i % SOURCE_COLORS.length]} strokeWidth="18" strokeDasharray={`${g.len} ${C - g.len}`} strokeDashoffset={-g.off} />
              ))}
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-[#414141]">{pickText(d.sourcesLabel, locale)}</p>
              <ul className="mt-3 flex flex-col gap-2.5 text-[11px]">
                {sources.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="flex-1 text-black">{pickText(s.label, locale)}</span>
                    <span className="text-[#414141]">{s.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {d.action?.href && (
        <div className="mt-4 flex justify-center">
          <Link href={resolveHref(d.action.href, slug)} className={ghostBtn}>
            {pickText(d.action.label, locale)} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

/** `success-stories`: quote cards with star ratings. */
export function SuccessStoriesSection({ slug, locale, data }: SectionProps) {
  const d = data as { title?: B; viewAll?: Btn; items?: { quote?: B; name?: B; role?: B; photoUrl?: string }[] };
  return (
    <section className="bg-cream py-4">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="rounded-[10px] border border-black/15 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-black uppercase">{pickText(d.title, locale)}</h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={ghostBtn + " !py-1 !text-[11px]"}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {(d.items ?? []).map((s, i) => {
              const name = pickText(s.name, locale);
              return (
                <li key={i} className="flex gap-4 rounded-[8px] border border-black/15 p-4">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static design asset
                    <img src={s.photoUrl} alt="" className="size-[76px] shrink-0 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span aria-hidden className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[24px] font-bold text-[#135130]">
                      {name.charAt(0)}
                    </span>
                  )}
                  <div className="text-[12px]">
                    <p className="leading-6 text-black">“{pickText(s.quote, locale)}”</p>
                    <p className="mt-2 font-medium text-[#135130]">— {name}</p>
                    <p className="text-[#414141]">{pickText(s.role, locale)}</p>
                    <p className="mt-1 flex gap-1 text-[#135130]" aria-hidden>
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className="size-3.5 fill-[#135130]" />
                      ))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** `cta-banner`: dark-green call-to-action band with two pill buttons. */
export function CtaBannerSection({ slug, locale, data }: SectionProps) {
  const d = data as { title?: B; body?: B; primary?: Btn; secondary?: Btn };
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="flex flex-col items-center justify-between gap-4 rounded-[10px] bg-[#135130] px-8 py-7 text-white md:flex-row" style={{ backgroundColor: GREEN }}>
          <div className="md:pl-24">
            <p className="text-[20px] font-semibold">{pickText(d.title, locale)}</p>
            <p className="mt-1 text-[14px] font-medium">{pickText(d.body, locale)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {d.primary?.href && (
              <Link href={resolveHref(d.primary.href, slug)} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[16px] text-[#135130] hover:opacity-90">
                {pickText(d.primary.label, locale)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            {d.secondary?.href && (
              <Link href={resolveHref(d.secondary.href, slug)} className="inline-flex items-center gap-2 rounded-full border border-white px-6 py-2.5 text-[16px] text-white hover:bg-white/10">
                {pickText(d.secondary.label, locale)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const FACILITY_ICONS = ["water", "sanitation", "roads", "lighting", "schools", "anganwadi", "health-centre", "library", "playground", "shg", "bus", "camps", "vaccination", "halls", "other"];

/** `facility-grid`: "Public Facilities Overview" — a floating card with a 5-column grid of icon tiles. */
export function FacilityGridSection({ locale, data }: SectionProps) {
  const d = data as { heading?: B; items?: { label?: B; value?: B }[] };
  return (
    <section className="relative z-10 mx-auto -mt-16 max-w-[1440px] px-4 sm:px-8 lg:-mt-[94px] lg:px-[62px]">
      <div className="rounded-[20px] bg-white px-4 py-6 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:px-9">
        <h2 className="text-center text-[30px] leading-[41px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {(d.items ?? []).map((it, i) => {
            const icon = FACILITY_ICONS[i % FACILITY_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[202px] flex-col items-center rounded-[10px] border border-black/15 bg-white px-3 py-4 text-center shadow-[0_0_10px_rgba(0,0,0,0.12)]">
                <FigmaIcon name={`fac-${icon}`} width={67} />
                <p className="mt-4 text-[16px] leading-[22px] font-semibold text-black">{pickText(it.label, locale)}</p>
                <p className="mt-auto pt-3 text-[12px] text-[#414141]">{pickText(it.value, locale)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

interface CropItem {
  src: string;
  /** Frame size in design pixels (sets the aspect ratio and the share of the row). */
  w: number;
  h: number;
  /** Figma crop: image size and offset as % of the frame. */
  crop?: { w: number; h: number; l: number; t: number };
  shadow?: boolean;
  bordered?: boolean;
}

/**
 * `image-crops`: heading + rows of picture frames taken from the Figma design. Used for the parts of
 * the design that are illustrations/dashboards without separate data (maps, charts, galleries) until
 * real content replaces them.
 */
export function ImageCropsSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    heading?: B;
    subheading?: B;
    surface?: "cream" | "tint";
    maxWidth?: number;
    rows?: { gap?: number; framed?: boolean; items: CropItem[] }[];
    action?: Btn;
  };
  return (
    <section className={d.surface === "tint" ? "bg-[rgba(34,138,83,0.05)] py-8" : "bg-cream py-6"}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {pickText(d.heading, locale) && <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
        {pickText(d.subheading, locale) && <p className="mx-auto mt-2 max-w-[1094px] text-center text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>}
        <div className="mx-auto mt-6 flex flex-col gap-6" style={d.maxWidth ? { maxWidth: d.maxWidth } : undefined}>
          {(d.rows ?? []).map((row, ri) => (
            <div key={ri} className={row.framed ? "rounded-[10px] border border-black/20 bg-white p-3" : undefined}>
              <div className="grid items-start" style={{ gridTemplateColumns: row.items.map((i) => `${i.w}fr`).join(" "), gap: row.gap ?? 20 }}>
                {row.items.map((it, ii) => (
                  <div
                    key={ii}
                    className={`relative overflow-hidden rounded-[10px] bg-white ${it.shadow ? "shadow-[0_0_20px_rgba(0,0,0,0.25)]" : ""} ${it.bordered ? "border border-black/20" : ""}`}
                    style={{ aspectRatio: `${it.w} / ${it.h}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                    <img
                      src={it.src}
                      alt=""
                      loading="lazy"
                      className="absolute max-w-none"
                      style={it.crop ? { width: `${it.crop.w}%`, height: `${it.crop.h}%`, left: `${it.crop.l}%`, top: `${it.crop.t}%` } : { inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {d.action?.href && (
          <div className="mt-8 flex justify-center">
            <Link href={resolveHref(d.action.href, slug)} className="inline-flex rounded-full border border-[#135130] bg-[#135130] px-5 py-2.5 text-[14.6px] font-semibold text-white hover:opacity-90">
              {pickText(d.action.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
