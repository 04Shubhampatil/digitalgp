import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getGrievanceStats, getSchemeStats, getServiceStats } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { TopStatsSection } from "./common";
import { BudgetChartClient, ThenNowClient, type BudgetChartData } from "./client";
import { Band, Icon, LinkButton, cardClass, list, mediaUrl, tx, type B } from "./kit";

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

// ------------------------------------------------------------------------------------ Schemes

/** `category-strip`: scheme categories as a row of icon chips. */
export function CategoryStripSection({ locale, data }: SectionProps) {
  const items = list<{ icon?: string; label?: B; active?: boolean }>((data as { items?: unknown }).items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <Band tone="cream">
      <ul className="flex flex-wrap justify-center gap-3">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-2 rounded-full border border-[#135130]/30 bg-white px-4 py-2 text-[13px] font-medium text-[#135130]">
            <Icon name={c.icon} className="size-4" />
            {tx(c.label, locale)}
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** `quick-actions`: cards with an icon, a line of text and a button. */
export function QuickActionsSection({ slug, locale, data }: SectionProps) {
  const items = list<{ icon?: string; title?: B; description?: B; buttonText?: B; buttonLink?: string; active?: boolean }>((data as { items?: unknown }).items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <Band tone="cream">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {items.map((c, i) => (
          <li key={i} className={`${cardClass} flex flex-col`}>
            <span className="flex size-11 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={c.icon} />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-black">{tx(c.title, locale)}</p>
            {tx(c.description, locale) && <p className="mt-1 text-[12px] text-[#414141]">{tx(c.description, locale)}</p>}
            {c.buttonLink && (
              <div className="mt-auto pt-3">
                <LinkButton href={resolveHref(c.buttonLink, slug)} external={/^https?:\/\//.test(c.buttonLink)}>
                  {tx(c.buttonText, locale)} <ArrowRight className="size-3.5" aria-hidden />
                </LinkButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Band>
  );
}

const SHADES = ["#d6ecd9", "#a9d8b0", "#6fbf7d", "#3a9a50", "#1e7a37", "#135130"];

/** `coverage-map`: how many households each ward has reached, as shaded ward blocks (or a map picture) with a table. */
export async function CoverageMapSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; mapImageId?: string; wards?: unknown };
  const wards = list<{ wardNo?: string; households?: number; beneficiaries?: number; colour?: string }>(d.wards);
  if (wards.length === 0) return null;
  const max = Math.max(...wards.map((w) => w.households ?? 0), 1);
  const shade = (n: number) => SHADES[Math.min(SHADES.length - 1, Math.floor((n / max) * SHADES.length - 0.0001))] ?? SHADES[0]!;
  const picture = mediaUrl(slug, d.mapImageId);
  return (
    <Band heading={tx(d.heading, locale) || t("coverageMap")} subheading={t("coverageMapSub")}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className={`${cardClass} overflow-hidden !p-0`}>
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
            <img src={picture} alt="" loading="lazy" className="h-full max-h-[420px] w-full object-cover" />
          ) : (
            <ul className="grid h-full min-h-[260px] gap-2 bg-[#1d3b24] p-3" style={{ gridTemplateColumns: `repeat(${Math.min(wards.length, 4)}, minmax(0, 1fr))` }}>
              {wards.map((w, i) => (
                <li key={i} className="flex flex-col items-center justify-center rounded-[12px] px-2 py-3 text-center" style={{ backgroundColor: w.colour ?? shade(w.households ?? 0), color: (w.households ?? 0) / max > 0.4 ? "#fff" : "#0b3a1b" }}>
                  <span className="text-[13px] font-semibold">{t("ward", { no: w.wardNo ?? "" })}</span>
                  <span className="text-[18px] font-bold">{(w.households ?? 0).toLocaleString(locale === "mr" ? "mr-IN" : "en-IN")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] tracking-wide text-[#414141] uppercase">
              <tr>
                <th className="py-1.5 font-semibold">{t("wardCol")}</th>
                <th className="py-1.5 text-right font-semibold">{t("householdsCol")}</th>
                <th className="py-1.5 text-right font-semibold">{t("beneficiariesCol")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {wards.map((w, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium text-black">{t("ward", { no: w.wardNo ?? "" })}</td>
                  <td className="py-2 text-right">{(w.households ?? 0).toLocaleString(locale === "mr" ? "mr-IN" : "en-IN")}</td>
                  <td className="py-2 text-right">{(w.beneficiaries ?? 0).toLocaleString(locale === "mr" ? "mr-IN" : "en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Projects

/** `before-after-gallery`: before / after sliders for finished works. */
export async function BeforeAfterGallerySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const items = list<{ beforeImageId?: string; afterImageId?: string; title?: B; description?: B; order?: number }>((data as { items?: unknown }).items)
    .sort(byOrder)
    .filter((c) => c.beforeImageId && c.afterImageId)
    .map((c) => ({ before: mediaUrl(slug, c.beforeImageId) ?? "", after: mediaUrl(slug, c.afterImageId) ?? "", heading: [tx(c.title, locale), tx(c.description, locale)].filter(Boolean).join(" — ") }));
  if (items.length === 0) return null;
  return (
    <Band heading={(await getTranslations("public.cms"))("beforeAfter")} tone="cream">
      <ThenNowClient comparisons={items} beforeLabel={t("before")} afterLabel={t("after")} />
    </Band>
  );
}

const STATUS_STYLE: Record<string, string> = { open: "bg-[#fde3e4] text-[#b42318]", "in-progress": "bg-[#fdf3d6] text-[#9a6700]", resolved: "bg-[#e3efe7] text-[#135130]" };

/** `village-resolution-tracker`: village commitments with their status. */
export async function ResolutionTrackerSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{ title?: B; status?: string; date?: string; wardNo?: string; updateNote?: B }>(d.items);
  if (items.length === 0) return null;
  const count = (s: string) => items.filter((i) => i.status === s).length;
  return (
    <Band heading={tx(d.heading, locale) || t("resolutionTracker")} subheading={t("resolutionSummary", { resolved: count("resolved"), progress: count("in-progress"), open: count("open") })}>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className={`${cardClass} flex items-start justify-between gap-3 !p-4`}>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-black">{tx(it.title, locale)}</p>
              {tx(it.updateNote, locale) && <p className="mt-1 text-[12px] text-[#414141]">{tx(it.updateNote, locale)}</p>}
              <p className="mt-1 text-[11px] text-[#414141]">{[it.wardNo && t("ward", { no: it.wardNo }), it.date].filter(Boolean).join(" · ")}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_STYLE[it.status ?? "open"]}`}>{t(`status_${(it.status ?? "open").replace("-", "_")}`)}</span>
          </li>
        ))}
      </ul>
    </Band>
  );
}

const THEMES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "#e2edfa", fg: "#1a62e0" },
  orange: { bg: "#fdebd8", fg: "#d9480f" },
  green: { bg: "#e3efe7", fg: "#135130" },
  purple: { bg: "#ece3f5", fg: "#6a1b9a" },
};

/** `impact-dashboard`: key figures in coloured cards. */
export async function ImpactDashboardSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{ icon?: string; title?: B; value?: string; description?: B; theme?: string }>(d.items);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("impactDashboard")} tone="cream">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => {
          const th = THEMES[it.theme ?? "green"] ?? THEMES.green!;
          return (
            <li key={i} className="flex items-center gap-3 rounded-[10px] p-4" style={{ backgroundColor: th.bg }}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white" style={{ color: th.fg }}>
                <Icon name={it.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-[22px] leading-7 font-bold" style={{ color: th.fg }}>
                  {it.value}
                </span>
                <span className="block text-[13px] font-semibold text-black">{tx(it.title, locale)}</span>
                {tx(it.description, locale) && <span className="block text-[11px] text-[#414141]">{tx(it.description, locale)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `development-suggestions`: call to action to send an idea. */
export function DevelopmentSuggestionsSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; description?: B; imageId?: string; buttonText?: B; buttonLink?: string };
  const img = mediaUrl(slug, d.imageId);
  return (
    <Band tone="white">
      <div className="flex flex-col items-center gap-6 rounded-[14px] bg-[#135130] p-8 text-center text-white md:flex-row md:text-left">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={img} alt="" loading="lazy" className="size-28 shrink-0 rounded-full object-cover" />
        )}
        <div className="flex-1">
          <h2 className="text-[24px] font-semibold">{tx(d.heading, locale)}</h2>
          {tx(d.description, locale) && <p className="mt-1 text-[14px] opacity-90">{tx(d.description, locale)}</p>}
        </div>
        {d.buttonLink && (
          <Link href={resolveHref(d.buttonLink, slug)} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#135130] hover:opacity-90">
            {tx(d.buttonText, locale)} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </Band>
  );
}

/** `financial-overview` (Projects page, new shape): amounts by head as bars with their share. */
export function FinancialItemsView({ locale, data }: { locale: SectionProps["locale"]; data: Record<string, unknown> }) {
  const d = data as { heading?: B; subtitle?: B; currency?: string; items?: unknown; note?: B };
  const items = list<{ label?: B; amount?: string; colour?: string }>(d.items).map((i) => ({ ...i, n: Number(i.amount) || 0 }));
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.n, 0) || 1;
  const sym = !d.currency || d.currency === "INR" ? "₹" : `${d.currency} `;
  const unit = total >= 1e7 ? 1e7 : total >= 1e5 ? 1e5 : 1;
  const suffix = unit === 1e7 ? (locale === "mr" ? " कोटी" : " Cr") : unit === 1e5 ? (locale === "mr" ? " लाख" : " L") : "";
  const money = (n: number) => `${sym}${unit === 1 ? n.toLocaleString("en-IN") : (n / unit).toFixed(2)}${suffix}`;
  return (
    <Band heading={tx(d.heading, locale)} subheading={tx(d.subtitle, locale) || undefined}>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-black">{tx(it.label, locale)}</span>
              <span className="text-[#414141]">
                {money(it.n)} · {((it.n / total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-black/10">
              <div className="h-full rounded-full" style={{ width: `${(it.n / total) * 100}%`, backgroundColor: it.colour ?? "#135130" }} />
            </div>
          </li>
        ))}
      </ul>
      {tx(d.note, locale) && <p className="mt-4 text-[12px] text-[#414141]">{tx(d.note, locale)}</p>}
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Grievance

/** `monthly-report`: complaint figures computed by the backend (GET /public/:slug/stats/grievances). */
export async function MonthlyReportSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; cardLabels?: { total?: B; resolved?: B; pending?: B; resolutionRate?: B }; categoryColours?: { category?: string; colour?: string }[] };
  const stats = await getGrievanceStats(slug);
  if (!stats) return null;
  const num = (n: number) => n.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN");
  const change = stats.receivedChangePercent;
  const cards = [
    { label: tx(d.cardLabels?.total, locale) || t("reportTotal"), value: num(stats.total), note: change === null ? "" : `${change > 0 ? "+" : ""}${change}% ${t("fromLastMonth")}` },
    { label: tx(d.cardLabels?.resolved, locale) || t("reportResolved"), value: num(stats.resolved), note: "" },
    { label: tx(d.cardLabels?.pending, locale) || t("reportPending"), value: num(stats.pending), note: "" },
    { label: tx(d.cardLabels?.resolutionRate, locale) || t("reportRate"), value: stats.resolutionRate === null ? "—" : `${stats.resolutionRate}%`, note: "" },
  ];
  const series: BudgetChartData["series"] = [
    { name: t("received"), colour: "#1a62e0", values: stats.monthly.map((m) => m.received) },
    { name: t("resolvedSeries"), colour: "#2f9e3f", values: stats.monthly.map((m) => m.resolved) },
    { name: t("pendingSeries"), colour: "#f5871f", values: stats.monthly.map((m) => m.pending) },
  ];
  const colours = new Map(list<{ category?: string; colour?: string }>(d.categoryColours).map((c) => [c.category ?? "", c.colour ?? "#6b7280"]));
  const palette = ["#1a62e0", "#2f9e3f", "#f5871f", "#7b2cbf", "#6b7280", "#0b7285"];
  return (
    <Band heading={tx(d.heading, locale) || t("monthlyReport")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <li key={i} className={cardClass}>
            <p className="text-[12px] text-[#414141]">{c.label}</p>
            <p className="text-[26px] leading-8 font-bold text-black">{c.value}</p>
            {c.note && <p className="text-[11px] font-medium text-[#135130]">{c.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={cardClass}>
          <p className="mb-2 text-[14px] font-semibold text-black">{t("monthlyTrend")}</p>
          <BudgetChartClient
            tabs={[]}
            plain
            charts={[{ tabKey: "m", type: "bar", labels: stats.monthly.map((m) => m.month.slice(2)), series }]}
            crLabel=""
            lakhLabel=""
            emptyLabel={t("noChart")}
          />
        </div>
        <div className={cardClass}>
          <p className="mb-3 text-[14px] font-semibold text-black">{t("byCategory")}</p>
          {stats.byCategory.length === 0 ? (
            <p className="text-[13px] text-[#414141]">{t("noChart")}</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.byCategory.map((c, i) => (
                <li key={i} className="text-[12px]">
                  <div className="flex justify-between">
                    <span className="font-medium text-black">{c.category}</span>
                    <span className="text-[#414141]">{c.sharePercent}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-black/10">
                    <div className="h-full rounded-full" style={{ width: `${c.sharePercent}%`, backgroundColor: colours.get(c.category) ?? palette[i % palette.length] }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ About

/** `leaders-profile-grid`: leaders with photo, designation, a short bio and a phone number. */
export async function LeadersProfileGridSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{ photoId?: string; name?: B; designation?: B; bio?: B; phone?: string; wardNo?: string }>(d.items);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("leaders")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => {
          const photo = mediaUrl(slug, p.photoId);
          return (
            <li key={i} className={`${cardClass} text-center`}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={photo} alt="" loading="lazy" className="mx-auto size-28 rounded-full object-cover" />
              ) : (
                <span className="mx-auto flex size-28 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name="users" className="size-10" />
                </span>
              )}
              <p className="mt-3 text-[15px] font-semibold text-black">{tx(p.name, locale)}</p>
              <p className="text-[12px] font-medium text-[#135130]">{[tx(p.designation, locale), p.wardNo && t("ward", { no: p.wardNo })].filter(Boolean).join(" · ")}</p>
              {tx(p.bio, locale) && <p className="mt-2 text-[12px] leading-5 text-[#414141]">{tx(p.bio, locale)}</p>}
              {p.phone && (
                <a href={`tel:${p.phone}`} className="mt-2 inline-block text-[12px] font-medium text-[#135130] hover:underline">
                  {p.phone}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `roles-cards`: who is responsible for what. */
export async function RolesCardsSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{ icon?: string; title?: B; responsibilities?: unknown }>(d.items);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("roles")}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r, i) => (
          <li key={i} className={cardClass}>
            <span className="flex size-11 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={r.icon} />
            </span>
            <p className="mt-3 text-[16px] font-semibold text-black">{tx(r.title, locale)}</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-[#414141]">
              {list<B>(r.responsibilities).map((x, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[#135130]" />
                  {tx(x, locale)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** `emergency-services`: emergency numbers, tap to call. */
export async function EmergencyServicesSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { heading?: B; items?: unknown };
  const items = list<{ title?: B; number?: string; category?: string; icon?: string; active?: boolean }>(d.items).filter((i) => i.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale) || t("emergency")} tone="cream">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {items.map((e, i) => (
          <li key={i}>
            <a href={`tel:${(e.number ?? "").replace(/\s/g, "")}`} className={`${cardClass} flex items-center gap-3 !p-4 hover:shadow-md`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fde3e4] text-[#b42318]">
                <Icon name={e.icon ?? "phone"} />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-black">{tx(e.title, locale)}</span>
                <span className="block text-[18px] font-bold text-[#b42318]">{e.number}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Band>
  );
}


interface LiveItem {
  icon?: string;
  title?: B;
  description?: B;
  value?: string;
  background?: string;
  /** Field of the statistics endpoint that supplies the value; the sample `value` is shown while it is null. */
  live?: string;
  format?: "number" | "money" | "percent";
}

function money(rupees: number, locale: SectionProps["locale"]): string {
  const cr = locale === "mr" ? "कोटी" : "Cr";
  const lakh = locale === "mr" ? "लाख" : "L";
  if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} ${cr}`;
  if (rupees >= 1e5) return `₹${(rupees / 1e5).toFixed(2)} ${lakh}`;
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

/**
 * `live-stats` (design placeholder): statistic cards whose figures come from the public statistics
 * endpoints. A figure the backend cannot compute yet (null) keeps its sample value.
 */
export async function LiveStatsSection(props: SectionProps) {
  const { slug, locale, data } = props;
  const d = data as { source?: "schemes" | "services" | "grievances"; items?: unknown; variant?: string };
  const stats =
    (d.source === "schemes" ? await getSchemeStats(slug) : d.source === "services" ? await getServiceStats(slug) : d.source === "grievances" ? await getGrievanceStats(slug) : null) as Record<string, unknown> | null;
  const items = list<LiveItem>(d.items).map((it) => {
    const raw = it.live && stats ? stats[it.live] : null;
    let value = it.value;
    if (raw !== null && raw !== undefined && raw !== "") {
      const n = Number(raw);
      if (it.format === "money" && Number.isFinite(n)) value = money(n, locale);
      else if (it.format === "percent" && Number.isFinite(n)) value = `${n}%`;
      else if (Number.isFinite(n)) value = n.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN");
    }
    return { icon: it.icon, title: it.title, description: it.description, value, background: it.background, visible: true };
  });
  return <TopStatsSection {...props} data={{ ...d, items }} />;
}
