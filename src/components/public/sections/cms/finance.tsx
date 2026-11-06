import { ArrowRight, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "../index";
import { formatMoney } from "./data";
import { BudgetVisualizerClient, type VizChart } from "./FinanceViz";
import { Icon, list, mediaUrl, readableText, tx, type B } from "./kit";

/**
 * Finance page (Figma 375:12126, "7. Financial Information & Budget"): Sources of Income, Where Your Money Goes,
 * Interactive Budget Visualizer and Plans, Reports & Documents. Measurements are the 1440px design's.
 */

interface Category {
  name?: B;
  amount?: string;
  percentage?: number;
  colour?: string;
  icon?: string;
}

interface InfoCard {
  enabled?: boolean;
  icon?: string;
  title?: B;
  description?: B;
  buttonText?: B;
  buttonLink?: string;
}

const GREEN = "#0b5a2c";

/** Income colours in the Figma legend order (the schema stores a colour only for expenditure). */
const INCOME_COLOURS = [
  "#0e7339",
  "#2a6fc4",
  "#f55e26",
  "#256ec3",
  "#8268c0",
  "#ecb128",
  "#ec4899",
  "#64748b",
];

/** "₹1.80 Cr" → "₹ 1.80 Cr" (the design puts a space after the rupee sign). */
const rs = (
  rupees: number,
  locale: SectionProps["locale"],
  unit: "auto" | "cr" | "lakh",
) => formatMoney(rupees, locale, unit).replace("₹", "₹ ");

const blockUnit = (biggest: number): "cr" | "lakh" | "auto" =>
  biggest >= 1e7 ? "cr" : biggest >= 1e5 ? "lakh" : "auto";
const sumAmount = (cats: Category[]) =>
  cats.reduce((s, c) => s + (Number(c.amount) || 0), 0);

/** Icon for an expenditure head (the schema has no icon field), guessed from its English name. */
const EXP_ICONS: [RegExp, string][] = [
  [/infra|road|build/i, "building"],
  [/sanit|clean|waste/i, "sanitation"],
  [/educat|school/i, "book"],
  [/water/i, "water"],
  [/health|nutri/i, "heart"],
  [/agri|farm|liveli/i, "wheat"],
];
const expIcon = (c: Category) =>
  c.icon ??
  EXP_ICONS.find(([re]) => re.test(c.name?.en ?? ""))?.[1] ??
  "landmark";

/** Green information card (Government Support / Our Focus): round icon, heading, text, dark-green button. */
function InfoCardBlock({
  slug,
  locale,
  card,
  height,
}: {
  slug: string;
  locale: SectionProps["locale"];
  card?: InfoCard;
  height: string;
}) {
  if (!card || card.enabled === false || !tx(card.title, locale)) return null;
  return (
    <aside
      className={`flex flex-col items-center rounded-[10px] border border-black/10 bg-[#f4f8f4] px-5 pt-8 pb-[30px] text-center ${height}`}
    >
      <span className="flex size-[94px] shrink-0 items-center justify-center rounded-full bg-[#e3eee4] text-[#0b5a2c]">
        <Icon name={card.icon} className="size-[46px]" />
      </span>
      <p
        className="mt-[23px] text-[20px] leading-7 font-bold"
        style={{ color: GREEN }}
      >
        {tx(card.title, locale)}
      </p>
      {tx(card.description, locale) && (
        <p className="mt-3 max-w-[215px] text-[16px] leading-8 text-balance text-black">
          {tx(card.description, locale)}
        </p>
      )}
      {card.buttonLink && (
        <div className="mt-6 lg:mt-auto">
          <Link
            href={resolveHref(card.buttonLink, slug)}
            className="inline-flex h-[47px] items-center gap-3 rounded-[8px] px-[22px] text-[16px] font-medium whitespace-nowrap text-white hover:opacity-90"
            style={{ backgroundColor: GREEN }}
          >
            {tx(card.buttonText, locale) || "→"}{" "}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      )}
    </aside>
  );
}

/** Donut (SVG): segments clockwise from the top, each share written inside it, white centre with label and total. */
function Donut({
  segments,
  label,
  value,
  size,
}: {
  segments: { value: number; colour: string; pct: number }[];
  label: string;
  value: string;
  size: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const Ro = 100;
  const ri = 47;
  const pt = (a: number, rad: number) =>
    [100 + rad * Math.sin(a), 100 - rad * Math.cos(a)] as const;
  const arcs = segments.reduce<
    {
      d: string;
      colour: string;
      pct: number;
      mid: number;
      share: number;
      end: number;
    }[]
  >((acc, sg) => {
    const start = acc.length > 0 ? acc[acc.length - 1]!.end : 0;
    const share = sg.value / total;
    const end = start + share * 2 * Math.PI;
    // A single 100% segment cannot be drawn as one arc; stop just short of the full circle.
    const stop = Math.min(end, start + 2 * Math.PI - 1e-4);
    const large = stop - start > Math.PI ? 1 : 0;
    const [x1, y1] = pt(start, Ro);
    const [x2, y2] = pt(stop, Ro);
    const [x3, y3] = pt(stop, ri);
    const [x4, y4] = pt(start, ri);
    const d = `M${x1} ${y1}A${Ro} ${Ro} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${large} 0 ${x4} ${y4}Z`;
    return [
      ...acc,
      { d, colour: sg.colour, pct: sg.pct, mid: (start + end) / 2, share, end },
    ];
  }, []);
  // Neighbouring thin slices alternate between an inner and an outer radius so their labels do not collide.
  let thin = 0;
  return (
    <div className={`relative mx-auto aspect-square w-full ${size}`}>
      <svg
        viewBox="0 0 200 200"
        className="size-full"
        role="img"
        aria-label={`${label} ${value}`}
      >
        {arcs.map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill={a.colour}
            stroke="#fff"
            strokeWidth="0.8"
          />
        ))}
        {arcs
          .filter((a) => a.share >= 0.02)
          .map((a, i) => {
            const isThin = a.share < 0.05;
            const rad = isThin ? (thin++ % 2 === 0 ? 60 : 87) : (Ro + ri) / 2;
            const [x, y] = pt(a.mid, rad);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isThin ? 9 : 11}
                fontWeight="700"
                fill="#fff"
              >
                {a.pct}%
              </text>
            );
          })}
      </svg>
      <div className="absolute inset-[26.5%] flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-[17px] leading-6 font-medium text-[#333]">
          {label}
        </span>
        <span className="text-[28px] leading-9 font-bold whitespace-nowrap text-black">
          {value}
        </span>
      </div>
    </div>
  );
}

/** `income-sources`: legend box, donut with the total in the middle and the information card, in one white panel. */
export async function IncomeSourcesSection({
  slug,
  locale,
  data,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    enabled?: boolean;
    heading?: B;
    subtitle?: B;
    backgroundColour?: string;
    categories?: unknown;
    supportCard?: InfoCard;
  };
  const categories = list<Category>(d.categories);
  if (d.enabled === false || categories.length === 0) return null;
  const total = sumAmount(categories);
  const unit = blockUnit(total);
  const coloured = categories.map((c, i) => ({
    ...c,
    colour: c.colour ?? INCOME_COLOURS[i % INCOME_COLOURS.length]!,
  }));
  return (
    <section style={{ backgroundColor: d.backgroundColour || "#fdf9f2" }}>
      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-8 lg:px-[60px] lg:pt-[24px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">
          {tx(d.heading, locale)}
        </h2>
        {tx(d.subtitle, locale) && (
          <p className="mt-2 text-center text-[20px] leading-[30px] text-black">
            {tx(d.subtitle, locale)}
          </p>
        )}
        <div className="mt-[22px] grid items-center gap-6 rounded-[10px] border border-black/20 bg-white p-4 lg:grid-cols-[minmax(0,506fr)_minmax(0,350fr)_minmax(0,291fr)] lg:gap-x-[59px] lg:py-[12.5px] lg:pr-[23px] lg:pl-[30px]">
          <ul className="flex flex-col justify-center gap-[36px] rounded-[10px] border border-black/10 bg-white px-5 py-8 lg:pr-[27px] lg:pl-[22px]">
            {coloured.map((c, i) => (
              <li
                key={i}
                className="flex items-center gap-[15px] text-[17px] leading-6 text-[#222]"
              >
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.colour }}
                />
                <span className="min-w-0 flex-1">{tx(c.name, locale)}</span>
                <span className="shrink-0">
                  {rs(Number(c.amount) || 0, locale, unit)} ({c.percentage ?? 0}
                  %)
                </span>
              </li>
            ))}
          </ul>
          <Donut
            segments={coloured.map((c) => ({
              value: Number(c.amount) || 0,
              colour: c.colour,
              pct: c.percentage ?? 0,
            }))}
            label={t("totalIncome")}
            value={rs(total, locale, unit)}
            size="max-w-[350px]"
          />
          <InfoCardBlock
            slug={slug}
            locale={locale}
            card={d.supportCard}
            height="lg:h-[385px]"
          />
        </div>
      </div>
    </section>
  );
}

/** `expenditure`: donut, category rows (icon, amount, share, bar in the GP's colour) and an optional side card, in one white panel. */
export async function ExpenditureSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    subtitle?: B;
    backgroundColour?: string;
    categories?: unknown;
    sideCard?: InfoCard;
  };
  const categories = list<Category>(d.categories);
  if (categories.length === 0) return null;
  const total = sumAmount(categories);
  const unit = blockUnit(total);
  // Bars are drawn relative to the largest head, between a short stub and ~55% of the track (Figma).
  const maxPct = Math.max(...categories.map((c) => c.percentage ?? 0), 1);
  return (
    <section
      style={{
        backgroundColor: d.backgroundColour || "#fdfbf6",
        color: readableText(d.backgroundColour),
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 pt-8 text-center sm:px-8 lg:px-[60px] lg:pt-[50px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">
          {tx(d.heading, locale)}
        </h2>
        {tx(d.subtitle, locale) && (
          <p className="mt-2 text-[20px] leading-[30px]">
            {tx(d.subtitle, locale)}
          </p>
        )}
        <div className="mt-[30px] grid items-center gap-6 rounded-[10px] border border-black/20 bg-white p-4 text-left text-black lg:h-[488px] lg:grid-cols-[minmax(0,399fr)_minmax(0,572fr)_minmax(0,318fr)] lg:gap-x-0 lg:py-0 lg:pr-[22px] lg:pl-[9px]">
          <div className="lg:pr-[13px]">
            <Donut
              segments={categories.map((c) => ({
                value: Number(c.amount) || 0,
                colour: c.colour ?? "#135130",
                pct: c.percentage ?? 0,
              }))}
              label={t("totalExpenditure")}
              value={rs(total, locale, unit)}
              size="max-w-[386px]"
            />
          </div>
          <ul className="space-y-[13px] lg:self-start lg:pt-[35px]">
            {categories.map((c, i) => {
              const colour = c.colour ?? "#135130";
              const pct = Math.max(0, Math.min(100, c.percentage ?? 0));
              return (
                <li key={i} className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${colour}22`, color: colour }}
                  >
                    <Icon name={expIcon(c)} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1 pt-[9px]">
                    <span className="flex items-baseline text-[16px] leading-6">
                      <span className="min-w-0 flex-1 text-black">
                        {tx(c.name, locale)}
                      </span>
                      <span className="shrink-0 text-right font-bold text-black">
                        {rs(Number(c.amount) || 0, locale, unit)}
                      </span>
                      <span className="w-[74px] shrink-0 text-right text-[#414141]">
                        {pct}%
                      </span>
                    </span>
                    <span
                      className="mt-3 block h-1 overflow-hidden rounded-full bg-[#e6e7ea]"
                      role="img"
                      aria-label={`${tx(c.name, locale)} ${pct}%`}
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${10 + (pct / maxPct) * 45}%`,
                          backgroundColor: colour,
                        }}
                      />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="lg:pl-[41px]">
            <InfoCardBlock
              slug={slug}
              locale={locale}
              card={d.sideCard}
              height="lg:h-[432px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * `budget-visualizer`: tabs + bar chart (values in rupees), the budget overview card and the report download. The
 * overview totals come from the page's own income and expenditure sections: `dynamic` fields are total income, then
 * total expenditure; `auto` fields are the surplus, and the budget utilisation when their suffix is "%".
 */
export async function BudgetVisualizerSection({
  slug,
  locale,
  data,
  siblings,
}: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    enabled?: boolean;
    heading?: B;
    subtitle?: B;
    backgroundColour?: string;
    tabs?: { tabKey?: string; name?: B; enabled?: boolean }[];
    overviewCard?: {
      title?: B;
      fields?: {
        label?: B;
        valueType?: "dynamic" | "auto";
        prefixSuffix?: string;
        colour?: string;
      }[];
    };
    barChart?: { label?: B; value?: string; colour?: string }[];
    charts?: {
      tabKey?: string;
      type?: "bar" | "line";
      labels?: string[];
      series?: {
        name?: B;
        colour?: string;
        colours?: string[];
        values?: number[];
      }[];
    }[];
    downloadReport?: {
      enabled?: boolean;
      buttonText?: B;
      fileId?: string;
      fallbackLink?: string;
    };
  };
  const bars = list<{ label?: B; value?: string; colour?: string }>(d.barChart);
  const tabs = list<{ tabKey?: string; name?: B; enabled?: boolean }>(
    d.tabs,
  ).filter((x) => x.enabled !== false);
  // One chart per tab (`charts`). The older single bar series (values in ₹ lakh) becomes one bar chart.
  const charts: VizChart[] = list<NonNullable<typeof d.charts>[number]>(
    d.charts,
  )
    .filter((c) => c.tabKey)
    .map((c) => ({
      tabKey: c.tabKey!,
      type: c.type === "line" ? "line" : "bar",
      labels: list<string>(c.labels),
      series: list<{
        name?: B;
        colour?: string;
        colours?: string[];
        values?: number[];
      }>(c.series).map((s) => ({
        name: tx(s.name, locale),
        colour: s.colour ?? "#135130",
        colours: Array.isArray(s.colours) ? s.colours : undefined,
        values: list<number>(s.values).map(Number),
      })),
    }));
  if (charts.length === 0 && bars.length > 0) {
    charts.push({
      tabKey: "legacy",
      type: "bar",
      labels: bars.map((b) => tx(b.label, locale)),
      series: [
        {
          name: "",
          colour: "#135130",
          values: bars.map((b) => (Number(b.value) || 0) * 1e5),
        },
      ],
    });
  }
  if (d.enabled === false || charts.length === 0) return null;
  const chartTabs = tabs
    .filter((x) => x.tabKey)
    .map((x) => ({ key: x.tabKey!, name: tx(x.name, locale) }));
  const expenditure = list<Category>(
    (siblings?.["expenditure"] as { categories?: unknown } | undefined)
      ?.categories,
  );
  // A single bar series that lines up with the expenditure heads borrows their colours when it has none of its own.
  for (const c of charts) {
    const s = c.series[0];
    if (
      c.series.length === 1 &&
      s &&
      !s.colours &&
      c.type === "bar" &&
      expenditure.length === c.labels.length
    )
      s.colours = expenditure.map((e) => e.colour ?? s.colour);
  }
  const income = sumAmount(
    list<Category>(
      (siblings?.["income-sources"] as { categories?: unknown } | undefined)
        ?.categories,
    ),
  );
  const spent = sumAmount(expenditure);
  const known = income > 0 && spent > 0;
  const unit = blockUnit(Math.max(income, spent));
  let dynamicIndex = 0;
  const fields = list<{
    label?: B;
    valueType?: string;
    prefixSuffix?: string;
    colour?: string;
  }>(d.overviewCard?.fields).map((f) => {
    let value = "—";
    if (known) {
      if (f.valueType === "dynamic")
        value = rs(dynamicIndex++ === 0 ? income : spent, locale, unit);
      else if (f.prefixSuffix === "%")
        value = `${((spent / income) * 100).toFixed(1)}%`;
      else value = rs(Math.abs(income - spent), locale, unit);
    }
    return { label: tx(f.label, locale), value, colour: f.colour };
  });
  const dr = d.downloadReport;
  const file = mediaUrl(slug, dr?.enabled === false ? undefined : dr?.fileId);
  // Without an uploaded report the button opens the downloads page instead of doing nothing.
  const fallback =
    dr?.enabled === false
      ? undefined
      : (dr?.fallbackLink ?? "page:announcements#deadlines-downloads");
  const download = file
    ? {
        href: file,
        file: true,
        label: tx(dr?.buttonText, locale) || t("download"),
      }
    : fallback
      ? {
          href: resolveHref(fallback, slug),
          file: false,
          label: tx(dr?.buttonText, locale) || t("download"),
        }
      : undefined;
  return (
    <section
      style={{
        backgroundColor: d.backgroundColour || "#fefcf9",
        color: readableText(d.backgroundColour),
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 pt-8 text-center sm:px-8 lg:px-[60px] lg:pt-[76px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">
          {tx(d.heading, locale)}
        </h2>
        {tx(d.subtitle, locale) && (
          <p className="mt-2 text-[20px] leading-[30px]">
            {tx(d.subtitle, locale)}
          </p>
        )}
        <div className="mt-[25px] rounded-[10px] border border-black/20 bg-white p-4 text-left text-black lg:h-[505px] lg:p-0">
          <BudgetVisualizerClient
            tabs={chartTabs}
            charts={charts}
            crLabel={locale === "mr" ? "कोटी" : "Cr"}
            lakhLabel={locale === "mr" ? "लाख" : "L"}
            compactUnits={locale !== "mr"}
            emptyLabel={t("noChart")}
            overview={{ title: tx(d.overviewCard?.title, locale), fields }}
            download={download}
          />
        </div>
      </div>
    </section>
  );
}

/** Red PDF document icon (Figma Finance "Plans, Reports & Documents"). */
function PdfIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 2.5V8h5" />
      <path
        d="M8.6 17c1.8-.8 3.2-3 3.6-5.6.2-1.2-.7-1.6-1-.7-.5 1.8 1 4 3.4 4.8.9.3 1.5 0 1.3-.5-.4-.8-3.2-.4-6.3 2z"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/**
 * `documents`: one white panel with five document cards (red PDF icon, title, "PDF • size", "Download ⤓"). An entry
 * without a file yet links "Download" to `fallbackLink` (e.g. the Notices page) instead of nowhere.
 */
export async function DocumentsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    subtitle?: B;
    description?: B;
    backgroundColour?: string;
    items?: unknown;
    fallbackLink?: string;
  };
  const items = list<{
    title?: B;
    fileId?: string;
    buttonText?: B;
    size?: string;
    format?: string;
  }>(d.items);
  if (items.length === 0) return null;
  return (
    <section
      style={{
        backgroundColor: d.backgroundColour || "#fefdfc",
        color: readableText(d.backgroundColour),
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-8 text-center sm:px-8 lg:px-[60px] lg:pt-[29px] lg:pb-[27px]">
        <h2 className="text-[30px] leading-[45px] font-semibold">
          {tx(d.heading, locale)}
        </h2>
        {tx(d.subtitle, locale) && (
          <p className="mt-2 text-[20px] leading-[30px]">
            {tx(d.subtitle, locale)}
          </p>
        )}
        {tx(d.description, locale) && (
          <p className="mt-1 text-[14px] opacity-80">
            {tx(d.description, locale)}
          </p>
        )}
        <ul className="mt-[17px] grid gap-4 rounded-[10px] border border-[#414141]/20 bg-white p-4 text-left text-black sm:grid-cols-2 lg:grid-cols-5 lg:gap-[17px] lg:px-[23px] lg:pt-6 lg:pb-[28px]">
          {items.map((it, i) => {
            const file = mediaUrl(slug, it.fileId);
            const href =
              file ??
              (d.fallbackLink ? resolveHref(d.fallbackLink, slug) : undefined);
            const label = (
              <>
                {tx(it.buttonText, locale) || t("download")}{" "}
                <Download className="size-5" aria-hidden />
              </>
            );
            const linkClass =
              "inline-flex items-center gap-3 text-[14px] font-bold hover:underline";
            return (
              <li
                key={i}
                className="flex min-h-[147px] flex-col rounded-[10px] border border-black/10 bg-white px-[15px] pt-[18px] pb-[18px] shadow-[0_0_6px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-start gap-[13px]">
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#fdedec] text-[#e0301e]"
                  >
                    <PdfIcon />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-[14px] leading-[21px] font-bold"
                      style={{ color: GREEN }}
                    >
                      {tx(it.title, locale)}
                    </p>
                    <p className="mt-[7px] text-[15px] leading-5 text-[#2b2b2b]">
                      {[it.format ?? "PDF", it.size]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </div>
                {href && (
                  <div className="mt-auto flex justify-center pt-4">
                    {file ? (
                      <a
                        href={file}
                        download
                        className={linkClass}
                        style={{ color: GREEN }}
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className={linkClass}
                        style={{ color: GREEN }}
                      >
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
