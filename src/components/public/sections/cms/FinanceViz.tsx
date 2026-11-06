"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface VizChart {
  tabKey: string;
  type: "bar" | "line";
  labels: string[];
  series: {
    name: string;
    colour: string;
    /** One colour per bar (single-series bar charts). */ colours?: string[];
    values: number[];
  }[];
}

export interface VizOverview {
  title: string;
  fields: { label: string; value: string; colour?: string }[];
}

export interface VizDownload {
  href: string;
  label: string;
  /** A real uploaded file (plain download link) rather than an internal page. */
  file: boolean;
}

function niceTop(max: number, ticks = 4): number {
  const raw = Math.max(max, 1) / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  return step * Math.ceil(Math.max(max, 1) / step);
}

/* Chart geometry (px at the 1440 design): plot 78.6..875.4 wide, 80L line at 25.7 and the zero line at 343.5. */
const W = 900;
const H = 392;
const L = 78.6;
const R = 875.4;
const T = 25.7;
const B = 343.5;

const GREEN = "#0b5a2c";

/**
 * Figma "Interactive Budget Visualizer" (375:12126): rectangular tabs above a bar chart with dashed grid lines,
 * a value over each bar and the sector names under the axis, beside the "Budget Overview" card with the report button.
 * Values are rupees; the unit (Cr / lakh) is picked per chart.
 */
export function BudgetVisualizerClient({
  tabs,
  charts,
  crLabel,
  lakhLabel,
  compactUnits,
  emptyLabel,
  overview,
  download,
}: {
  tabs: { key: string; name: string }[];
  charts: VizChart[];
  crLabel: string;
  lakhLabel: string;
  /** English "₹ 72L" (unit glued to the number) instead of "₹ 72 लाख". */
  compactUnits: boolean;
  emptyLabel: string;
  overview: VizOverview;
  download?: VizDownload;
}) {
  const first =
    tabs.find((t) => charts.some((c) => c.tabKey === t.key))?.key ??
    tabs[0]?.key ??
    charts[0]?.tabKey ??
    "";
  const [active, setActive] = useState(first);
  const chart =
    charts.find((c) => c.tabKey === active) ??
    (tabs.length === 0 ? charts[0] : undefined);

  let body: React.ReactNode = (
    <p className="py-16 text-center text-[14px] text-[#414141]">{emptyLabel}</p>
  );
  if (chart && chart.labels.length > 0) {
    const maxVal = Math.max(...chart.series.flatMap((s) => s.values), 1);
    const top = niceTop(maxVal);
    const div = top >= 1e7 ? 1e7 : top >= 1e5 ? 1e5 : 1;
    const unit = div === 1e7 ? crLabel : div === 1e5 ? lakhLabel : "";
    const num = (v: number) => {
      const x = v / div;
      return div === 1
        ? x.toLocaleString("en-IN")
        : String(+x.toFixed(x >= 10 ? 0 : 1));
    };
    const fmt = (v: number) =>
      `₹ ${num(v)}${unit ? (compactUnits ? "" : " ") + unit : ""}`;
    const n = chart.labels.length;
    const slot = (R - L) / n;
    const y = (v: number) => B - (v / top) * (B - T);
    const cx = (i: number) => L + slot * i + slot / 2;
    const single = chart.series.length === 1;
    const barW = Math.min(56, (slot * 0.62) / chart.series.length);
    body = (
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={
            chart.series
              .map((s) => s.name)
              .filter(Boolean)
              .join(", ") || undefined
          }
        >
          {[1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={L}
              x2={R}
              y1={y((top / 4) * i)}
              y2={y((top / 4) * i)}
              stroke="#d9d9d9"
              strokeDasharray="4 4"
            />
          ))}
          <line x1={L} x2={L} y1={T} y2={B} stroke="#bfbfbf" />
          <line x1={L} x2={R} y1={B} y2={B} stroke="#cfcfcf" />
          {[0, 1, 2, 3, 4].map((i) => (
            <text
              key={i}
              x={L - 17}
              y={y((top / 4) * i) + 5}
              textAnchor="end"
              fontSize="14"
              fill="#555"
            >
              {fmt((top / 4) * i)}
            </text>
          ))}
          {chart.labels.map((l, i) => (
            <g key={i}>
              <line x1={cx(i)} x2={cx(i)} y1={B} y2={B + 5} stroke="#cfcfcf" />
              <text
                x={cx(i)}
                y={B + 31}
                textAnchor="middle"
                fontSize="14.5"
                fill="#555"
              >
                {l}
              </text>
            </g>
          ))}
          {chart.type === "bar"
            ? chart.series.map((s, si) =>
                s.values.map((v, i) => {
                  const x0 =
                    cx(i) - (barW * chart.series.length) / 2 + si * barW;
                  return (
                    <g key={`${si}-${i}`}>
                      <rect
                        x={x0}
                        y={y(v)}
                        width={barW}
                        height={Math.max(B - y(v), 0)}
                        fill={single ? (s.colours?.[i] ?? s.colour) : s.colour}
                      >
                        <title>{`${s.name ? s.name + ": " : ""}${fmt(v)}`}</title>
                      </rect>
                      <text
                        x={x0 + barW / 2}
                        y={y(v) - 14}
                        textAnchor="middle"
                        fontSize="14.5"
                        fontWeight="700"
                        fill="#111"
                      >
                        {fmt(v)}
                      </text>
                    </g>
                  );
                }),
              )
            : chart.series.map((s, si) => (
                <g key={si}>
                  <polyline
                    fill="none"
                    stroke={s.colour}
                    strokeWidth="3"
                    points={s.values
                      .map((v, i) => `${cx(i)},${y(v)}`)
                      .join(" ")}
                  />
                  {s.values.map((v, i) => (
                    <circle key={i} cx={cx(i)} cy={y(v)} r="5" fill={s.colour}>
                      <title>{`${s.name}: ${fmt(v)}`}</title>
                    </circle>
                  ))}
                </g>
              ))}
        </svg>
        {chart.series.length > 1 && (
          <ul className="mt-1 flex flex-wrap justify-center gap-5 text-[13px] text-black">
            {chart.series.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: s.colour }}
                />
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const linkClass =
    "mt-auto flex h-[57px] items-center justify-center gap-3 rounded-[8px] px-5 text-[16px] font-medium text-white hover:opacity-90";
  const downloadLabel = download && (
    <>
      {download.label} <Download className="size-[22px]" aria-hidden />
    </>
  );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,898fr)_minmax(0,372fr)] lg:gap-x-[26px] lg:pr-[23px]">
      <div className="min-w-0">
        {tabs.length > 0 && (
          <div
            role="tablist"
            className="flex flex-wrap justify-center gap-[10px] lg:justify-end lg:pt-[25px] lg:pr-[2px]"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active === tab.key}
                onClick={() => setActive(tab.key)}
                className={cn(
                  "h-[53px] rounded-[8px] border px-[29px] text-[16px] whitespace-nowrap transition-colors",
                  active === tab.key
                    ? "border-[#0b5a2c] text-white"
                    : "border-black/15 bg-white text-[#222] hover:bg-black/5",
                )}
                style={
                  active === tab.key ? { backgroundColor: GREEN } : undefined
                }
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}
        {body}
      </div>
      <div className="flex flex-col rounded-[10px] border border-black/10 bg-white px-[21px] pb-[31px] lg:mt-6 lg:h-[441px]">
        <p className="flex h-[59px] items-center text-[17.5px] font-bold text-black">
          {overview.title}
        </p>
        <ul className="mb-[27px]">
          {overview.fields.map((f, i) => (
            <li
              key={i}
              className="flex h-[67px] items-center justify-between gap-3 border-b border-black/10 text-[16px] text-[#1a1a1a]"
            >
              <span>{f.label}</span>
              <span
                className="text-[18px] font-bold"
                style={{ color: f.colour }}
              >
                {f.value}
              </span>
            </li>
          ))}
        </ul>
        {download &&
          (download.file ? (
            <a
              href={download.href}
              download
              className={linkClass}
              style={{ backgroundColor: GREEN }}
            >
              {downloadLabel}
            </a>
          ) : (
            <Link
              href={download.href}
              className={linkClass}
              style={{ backgroundColor: GREEN }}
            >
              {downloadLabel}
            </Link>
          ))}
      </div>
    </div>
  );
}
