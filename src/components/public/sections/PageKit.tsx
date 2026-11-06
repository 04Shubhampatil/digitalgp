import { ArrowRight, Building2, CircleCheck, ClipboardPlus, Droplet, GlassWater, GraduationCap, Hourglass, House, Leaf, Lightbulb, Monitor, Plug, Recycle, Route, Star, Toilet, TreePine, Users, Wifi, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicProjects, listPublicSuccessStories, publicMediaUrl } from "@/lib/api/public";
import { detailHref, resolveHref } from "@/lib/href";
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

/** Section label; `green` is the Key Projects style (Figma 375:13993: 20px semibold #135130, no letter-spacing). */
const Eyebrow = ({ children, green }: { children: React.ReactNode; green?: boolean }) => (
  <p className={green ? "text-[20px] leading-[27px] font-semibold text-[#135130] uppercase" : "text-[20px] font-semibold tracking-wide text-[#ea7f14] uppercase"}>{children}</p>
);
const ghostBtn = "inline-flex items-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-2 text-[13.5px] text-[#135130] hover:bg-[#135130]/5";

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
          location: pickText(pair(p.wardLabelEn, p.wardLabelMr), locale) || (p.wardNo ? `${t("ward")} ${p.wardNo}` : undefined),
          year: p.year ? String(p.year) : undefined,
          budget: p.budget ? fmt.format(Number(p.budget)) : undefined,
          // Cards show the one-line outcome; the full text is on the project page.
          outcome: pickText(pair(p.outcomeShortEn, p.outcomeShortMr), locale) || pickText(pair(p.outcomeEn, p.outcomeMr), locale) || undefined,
          families: p.familiesBenefited !== null ? p.familiesBenefited.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN") : undefined,
          imageUrl: p.coverImageId ? publicMediaUrl(slug, p.coverImageId) : p.afterImageId ? publicMediaUrl(slug, p.afterImageId) : undefined,
          beforeUrl: p.beforeImageId && p.afterImageId ? publicMediaUrl(slug, p.beforeImageId) : undefined,
          afterUrl: p.beforeImageId && p.afterImageId ? publicMediaUrl(slug, p.afterImageId) : undefined,
          href: detailHref(slug, "projects", p.id),
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
    stageLabel: { ONGOING: t("projectBadge.ONGOING"), COMPLETED: t("projectBadge.COMPLETED"), UPCOMING: t("projectBadge.UPCOMING") },
    empty: t("noProjects"),
    before: t("before"),
    after: t("after"),
  };
  return (
    // Figma: "KEY PROJECTS" sits 94px below the stats card.
    <section className="bg-cream py-8 lg:pt-[94px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <Eyebrow green>{pickText(d.eyebrow, locale)}</Eyebrow>
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

/**
 * `before-after` (Figma placeholder) and `before-after-gallery` (backend section): draggable comparison tiles.
 * Backend items carry media ids (`beforeImageId`, `afterImageId`, `title`, `description`); placeholder items carry
 * picture paths. A placeholder with `source: "projects"` shows the published projects that have both pictures instead.
 */
export async function BeforeAfterSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    eyebrow?: B;
    heading?: B;
    source?: "projects";
    items?: { label?: B; title?: B; description?: B; beforeUrl?: string; afterUrl?: string; beforeImageId?: string; afterImageId?: string; height?: number; order?: number }[];
    viewAll?: Btn;
  };
  const media = (id: string | undefined) => (id ? (id.startsWith("/") ? id : publicMediaUrl(slug, id)) : undefined);
  let items = (d.items ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((i) => ({
      label: [pickText(i.label ?? i.title, locale), pickText(i.description, locale)].filter(Boolean).join(" — "),
      beforeUrl: i.beforeUrl ?? media(i.beforeImageId) ?? (d.source ? "/images/figma/about-aerial.png" : ""),
      afterUrl: i.afterUrl ?? media(i.afterImageId) ?? (d.source ? "/images/figma/about-road.png" : ""),
      height: i.height,
    }))
    .filter((i) => i.beforeUrl && i.afterUrl);
  if (d.source === "projects") {
    const live = await listPublicProjects(slug, { limit: 100 }).catch(() => null);
    const pairs = (live?.data ?? []).filter((p) => p.beforeImageId && p.afterImageId);
    if (pairs.length > 0)
      items = pairs.slice(0, 8).map((p) => ({
        label: pickText(pair(p.nameEn, p.nameMr), locale),
        beforeUrl: publicMediaUrl(slug, p.beforeImageId!),
        afterUrl: publicMediaUrl(slug, p.afterImageId!),
        height: undefined,
      }));
  }
  if (items.length === 0) return null;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {pickText(d.heading, locale) && <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
        <div className="mb-5 flex items-center justify-between">
          <Eyebrow green={d.source === "projects"}>{pickText(d.eyebrow, locale) || (pickText(d.heading, locale) ? "" : t("detail.beforeAfter"))}</Eyebrow>
          {d.viewAll?.href && (
            <Link href={resolveHref(d.viewAll.href, slug)} className="inline-flex items-center gap-2 text-[14px] text-[#135130] hover:underline">
              {pickText(d.viewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <BeforeAfterGrid items={items} before={t("before")} after={t("after")} grid />
      </div>
    </section>
  );
}

const TRACKER_ICONS: LucideIcon[] = [Leaf, Droplet, Monitor, Zap, Leaf, Recycle, Building2, Droplet, TreePine, Building2];

const RESOLUTION_STYLE: Record<string, { pill: string; bar: string; width: number }> = {
  resolved: { pill: "bg-[#e3efe7] text-[#135130]", bar: "bg-[#135130]", width: 100 },
  "in-progress": { pill: "bg-[#fdf3d6] text-[#9a6700]", bar: "bg-[#f5a03a]", width: 50 },
  open: { pill: "bg-[#fde3e4] text-[#b42318]", bar: "bg-[#d92d20]", width: 8 },
};

/**
 * `progress-tracker` (placeholder: `{ label, percent }` rows) and the backend `village-resolution-tracker`
 * (`{ title, status, date?, wardNo?, updateNote? }`): "Village Resolution Tracker" — icon, label, bar and a percentage
 * or the commitment's status.
 */
export async function ProgressTrackerSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    title?: B;
    heading?: B;
    subtitle?: B;
    items?: { label?: B; title?: B; percent?: number; status?: string; date?: string; wardNo?: string; updateNote?: B }[];
  };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const withStatus = items.some((i) => i.status);
  const count = (st: string) => items.filter((i) => i.status === st).length;
  const subtitle = pickText(d.subtitle, locale) || (withStatus ? t("resolutionSummary", { resolved: count("resolved"), progress: count("in-progress"), open: count("open") }) : "");
  return (
    <div className={card}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase">{pickText(d.title ?? d.heading, locale) || t("resolutionTracker")}</h2>
      {subtitle && <p className="mt-2 text-[12px] text-[#414141]">{subtitle}</p>}
      <ul className="mt-5 flex flex-col gap-[14px]">
        {items.map((it, i) => {
          const Icon = TRACKER_ICONS[i % TRACKER_ICONS.length]!;
          const label = pickText(it.label ?? it.title, locale);
          if (it.status) {
            const st = RESOLUTION_STYLE[it.status] ?? RESOLUTION_STYLE.open!;
            const note = [pickText(it.updateNote, locale), it.wardNo ? t("ward", { no: it.wardNo }) : "", it.date ?? ""].filter(Boolean).join(" · ");
            return (
              <li key={i} className="flex items-center gap-4 text-[13px]">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#135130] text-white">
                  <Icon className="size-3.5" />
                </span>
                <span className="w-[150px] shrink-0 text-black">
                  {label}
                  {note && <span className="block text-[11px] text-[#414141]">{note}</span>}
                </span>
                <span aria-hidden className="h-[5px] flex-1 rounded-full bg-[#e6ede9]">
                  <span className={`block h-full rounded-full ${st.bar}`} style={{ width: `${st.width}%` }} />
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.pill}`}>{t(`status_${(RESOLUTION_STYLE[it.status] ? it.status : "open").replace("-", "_")}`)}</span>
              </li>
            );
          }
          const pct = Math.max(0, Math.min(100, it.percent ?? 0));
          return (
            <li key={i} className="flex items-center gap-4 text-[13px]">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#135130] text-white">
                <Icon className="size-3.5" />
              </span>
              <span className="w-[150px] shrink-0 text-black">{label}</span>
              <span className="h-[5px] flex-1 rounded-full bg-[#e6ede9]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
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
    // Figma 375:14178: 736px card, 167×102 tiles 12px apart (inset 16px), 51px green line icon, 10px label over a 24px value.
    <div className={`${card} xl:px-4`}>
      <h2 className="text-[22px] leading-[27px] font-semibold text-black uppercase xl:px-[18px]">{pickText(d.title, locale)}</h2>
      <p className="mt-2 text-[12px] text-[#414141] xl:px-[18px]">{pickText(d.subtitle, locale)}</p>
      <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-3 xl:gap-y-5">
        {(d.items ?? []).map((it, i) => {
          const Icon = IMPACT_ICONS[i % IMPACT_ICONS.length]!;
          return (
          <li key={i} className="flex min-h-[102px] items-center gap-2 rounded-[10px] border border-[#414141]/20 bg-white px-1.5">
            <span aria-hidden className="flex size-[51px] shrink-0 items-center justify-center text-[#135130]">
              <Icon className="size-[34px]" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[10px] leading-[14px] font-semibold whitespace-nowrap text-[#135130]">{pickText(it.label, locale)}</p>
              <p className="mt-1.5 whitespace-nowrap text-[24px] leading-[33px] font-semibold text-black">
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
            <svg viewBox="0 0 100 100" className="size-[150px] shrink-0 -rotate-90" role="img" aria-label={pickText(d.sourcesLabel, locale)}>
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

/**
 * `stories-figma` (Key Projects placeholder): quote cards with star ratings. Published success stories of the page
 * (GET /public/:slug/success-stories?page=projects) replace the sample cards and open their story page.
 */
export async function SuccessStoriesSection({ slug, locale, data, pageKey }: SectionProps) {
  const td = await getTranslations("public.detail");
  const d = data as { title?: B; viewAll?: Btn; items?: { quote?: B; name?: B; role?: B; photoUrl?: string; href?: string }[] };
  const live = await listPublicSuccessStories(slug, { page: pageKey ?? "projects", limit: 6 }).catch(() => null);
  const items =
    live && live.data.length > 0
      ? live.data.map((x) => ({
          quote: pickText(pair(x.quoteEn, x.quoteMr), locale) ? pair(x.quoteEn, x.quoteMr) : pair(x.summaryEn ?? x.titleEn, x.summaryMr ?? x.titleMr),
          name: { en: x.personName ?? pickText(pair(x.titleEn, x.titleMr), "en"), mr: x.personName ?? pickText(pair(x.titleEn, x.titleMr), "mr") },
          role: pair(x.personRoleEn ?? x.location, x.personRoleMr ?? x.location),
          photoUrl: x.photoId ? publicMediaUrl(slug, x.photoId) : undefined,
          href: detailHref(slug, "success-stories", x.id) as string | undefined,
        }))
      : (d.items ?? []);
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
            {items.map((s, i) => {
              const name = pickText(s.name, locale);
              return (
                <li key={i} className="flex gap-6 rounded-[8px] border border-black/15 p-4 lg:gap-8 lg:px-5">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static design asset
                    <img src={s.photoUrl} alt="" className="size-[92px] shrink-0 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span aria-hidden className="flex size-[92px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[24px] font-bold text-[#135130]">
                      {name.charAt(0)}
                    </span>
                  )}
                  <div className="text-[12px]">
                    <p className="leading-6 text-black">“{pickText(s.quote, locale)}”</p>
                    <p className="mt-2 font-medium text-[#135130]">— {name}</p>
                    <p className="text-[#414141]">{pickText(s.role, locale)}</p>
                    {s.href ? (
                      <Link href={s.href} className="mt-2 inline-flex items-center gap-1 font-semibold text-[#135130] hover:underline">
                        {td("readStory")} <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    ) : (
                      <p className="mt-1 flex gap-1 text-[#135130]" aria-hidden>
                        {Array.from({ length: 5 }).map((_, k) => (
                          <Star key={k} className="size-3.5 fill-[#135130]" />
                        ))}
                      </p>
                    )}
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

/**
 * `cta-banner` (Figma 375:14342): 110px #004a24 band, 135×100 illustration at 29px, 20px title / 16px line at 200px,
 * white "Submit Suggestion" pill and an outlined green "Contact Panchayat" pill with arrows.
 */
export function CtaBannerSection({ slug, locale, data }: SectionProps) {
  const d = data as { title?: B; body?: B; primary?: Btn; secondary?: Btn; imageUrl?: string };
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="flex flex-col items-center gap-4 rounded-[10px] border border-[#414141]/20 bg-[#004a24] px-8 py-5 text-white md:min-h-[110px] md:flex-row md:py-0 md:pr-[42px] md:pl-[29px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
          <img src={d.imageUrl ?? "/images/figma/pages/prj-cta.png"} alt="" width={135} height={100} className="hidden h-[100px] w-[135px] shrink-0 md:block" />
          <div className="md:ml-9">
            <p className="text-[20px] leading-[27px] font-semibold">{pickText(d.title, locale)}</p>
            <p className="mt-[5px] text-[16px] leading-[22px] font-semibold">{pickText(d.body, locale)}</p>
          </div>
          <div className="flex flex-wrap gap-4 md:ml-auto">
            {d.primary?.href && (
              <Link href={resolveHref(d.primary.href, slug)} className="inline-flex items-center gap-2 rounded-full border-[0.9px] border-[#135130] bg-white px-6 py-3 text-[20.25px] leading-[27px] text-[#135130] hover:opacity-90">
                {pickText(d.primary.label, locale)} <ArrowRight className="size-6" aria-hidden />
              </Link>
            )}
            {d.secondary?.href && (
              <Link href={resolveHref(d.secondary.href, slug)} className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white bg-[#135130] px-6 py-3 text-[19px] leading-[26px] font-medium text-white hover:bg-white/10">
                {pickText(d.secondary.label, locale)} <ArrowRight className="size-6" aria-hidden />
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
                <FigmaIcon name={`fac-${icon}`} width={71} />
                {/* Figma 375:14772: 20px labels on up to two lines (62px box), 12px value at the foot. */}
                <p className="mt-3 min-h-[62px] text-[20px] leading-[21px] font-medium text-black">{pickText(it.label, locale)}</p>
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
