"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const chip = (active: boolean) =>
  cn("rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors", active ? "border-[#135130] bg-[#135130] text-white" : "border-black/20 bg-white text-black hover:bg-black/5");

export interface GalleryPhoto {
  src: string;
  title: string;
  category: string;
  date?: string;
}

const PAGE_SIZE = 4;
/** Figma gallery category pills: green outline, filled when active. */
const galleryChip = (active: boolean) =>
  cn("rounded-full border px-4 py-1.5 text-[15px] font-semibold transition-colors", active ? "border-[#135130] bg-[#135130] text-white" : "border-[#135130] bg-transparent text-[#135130] hover:bg-[#135130]/5");

/**
 * Figma Photo Gallery (375:11547): centred category pills, then a paged carousel of four photos with
 * dots under it. Each card shows the caption, the date and an image badge; the photo opens full size.
 */
export function PhotoGalleryClient({ categories, photos, allLabel, pageLabel }: { categories: { key: string; name: string }[]; photos: GalleryPhoto[]; allLabel: string; /** Dot label with "{n}" for the page number. */ pageLabel?: string }) {
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(0);
  const shown = active === "all" ? photos : photos.filter((p) => p.category === active);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  function pick(key: string) {
    setActive(key);
    setPage(0);
  }
  return (
    <div>
      {categories.length > 0 && (
        <div role="tablist" aria-label="Categories" className="mb-12 flex flex-wrap justify-center gap-x-8 gap-y-3">
          <button type="button" role="tab" aria-selected={active === "all"} onClick={() => pick("all")} className={galleryChip(active === "all")}>
            {allLabel}
          </button>
          {categories.map((c) => (
            <button key={c.key} type="button" role="tab" aria-selected={active === c.key} onClick={() => pick(c.key)} className={galleryChip(active === c.key)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {slice.map((p, i) => (
          <li key={`${p.src}-${current}-${i}`}>
            <a href={p.src} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-[10px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
              <img src={p.src} alt={p.title} loading="lazy" className="h-[193px] w-full rounded-[10px] object-cover transition-transform group-hover:scale-[1.02]" />
              <span className="flex items-center gap-3 px-4 py-4">
                <span className="min-w-0 flex-1">
                  {p.title && <span className="block truncate text-[16px] text-black">{p.title}</span>}
                  {p.date && <span className="mt-1 block text-[12px] text-[#414141]">{p.date}</span>}
                </span>
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f3e8] text-[#135130]">
                  <ImageIcon className="size-[18px]" />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-6 flex justify-center gap-[33px]">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={pageLabel ? pageLabel.replace("{n}", String(i + 1)) : String(i + 1)}
              aria-current={i === current}
              className={cn("size-3 rounded-full", i === current ? "bg-[#135130]" : "bg-[#d9d9d9] hover:bg-[#bdbdbd]")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface Comparison {
  before: string;
  after: string;
  heading: string;
}

/** Then & Now: drag the handle (or use the slider) to reveal the "after" photo over the "before" photo. */
export function ThenNowClient({ comparisons, beforeLabel, afterLabel, wide }: { comparisons: Comparison[]; beforeLabel: string; afterLabel: string; /** Figma Gallery look: full-width 354px frame, labels at the bottom, round handle; drag anywhere. */ wide?: boolean }) {
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(50);
  const c = comparisons[index];
  if (!c) return null;
  if (wide) {
    return (
      <div>
        <div className="relative h-[240px] w-full overflow-hidden rounded-[20px] bg-black select-none sm:h-[354px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
          <img src={c.after} alt={afterLabel} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
            <img src={c.before} alt={beforeLabel} className="size-full object-cover" />
          </div>
          <span className="absolute bottom-8 left-8 rounded-[6px] bg-[#1b1b1b]/90 px-5 py-1.5 text-[14px] text-white">{beforeLabel}</span>
          <span className="absolute right-8 bottom-8 rounded-[6px] bg-[#135130] px-5 py-1.5 text-[14px] text-white">{afterLabel}</span>
          <div aria-hidden className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/80" style={{ left: `${pos}%` }} />
          <span aria-hidden className="absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[12px] text-black shadow" style={{ left: `${pos}%` }}>
            ‹ ›
          </span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={`${beforeLabel} / ${afterLabel}`} className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
        </div>
        {c.heading && <p className="mt-3 text-center text-[14px] font-medium text-black">{c.heading}</p>}
        {comparisons.length > 1 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {comparisons.map((x, i) => (
              <button key={i} type="button" onClick={() => { setIndex(i); setPos(50); }} aria-current={i === index} className={chip(i === index)}>
                {x.heading || i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="relative mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-[10px] bg-black select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
        <img src={c.after} alt={afterLabel} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
          <img src={c.before} alt={beforeLabel} className="size-full object-cover" />
        </div>
        <span className="absolute top-3 left-3 rounded bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">{beforeLabel}</span>
        <span className="absolute top-3 right-3 rounded bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">{afterLabel}</span>
        <div aria-hidden className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={`${beforeLabel} / ${afterLabel}`} className="mx-auto mt-3 block w-full max-w-4xl accent-[#135130]" />
      <p className="mt-2 text-center text-[14px] font-medium text-black">{c.heading}</p>
      {comparisons.length > 1 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {comparisons.map((x, i) => (
            <button key={i} type="button" onClick={() => { setIndex(i); setPos(50); }} aria-current={i === index} className={chip(i === index)}>
              {x.heading || i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface BudgetChartData {
  tabKey: string;
  type: "bar" | "line";
  labels: string[];
  series: { name: string; colour: string; values: number[] }[];
}

function niceTop(max: number, ticks = 4): number {
  const raw = Math.max(max, 1) / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  return step * Math.ceil(Math.max(max, 1) / step);
}

/** Tabbed bar / line chart for the budget section. Values are in rupees; one unit (Cr / lakh) per chart. */
export function BudgetChartClient({ tabs, charts, crLabel, lakhLabel, emptyLabel, plain = false }: { tabs: { key: string; name: string }[]; charts: BudgetChartData[]; crLabel: string; lakhLabel: string; emptyLabel: string; /** Plain counts instead of rupee amounts. */ plain?: boolean }) {
  const first = tabs.find((t) => charts.some((c) => c.tabKey === t.key))?.key ?? tabs[0]?.key ?? charts[0]?.tabKey ?? "";
  const [active, setActive] = useState(first);
  const chart = charts.find((c) => c.tabKey === active) ?? (tabs.length === 0 ? charts[0] : undefined);
  const W = 640;
  const H = 260;
  const L = 56;
  const B = 30;
  const T = 12;

  let body: React.ReactNode = <p className="py-16 text-center text-[13px] text-[#414141]">{emptyLabel}</p>;
  if (chart && chart.labels.length > 0) {
    const maxVal = Math.max(...chart.series.flatMap((s) => s.values), 1);
    const top = niceTop(maxVal);
    const div = plain ? 1 : top >= 1e7 ? 1e7 : top >= 1e5 ? 1e5 : 1;
    const suffix = div === 1e7 ? crLabel : div === 1e5 ? lakhLabel : "";
    const fmt = (v: number) => `${plain ? "" : "₹"}${div === 1 ? v.toLocaleString("en-IN") : +(v / div).toFixed(2)}${suffix ? " " + suffix : ""}`;
    const n = chart.labels.length;
    const plotW = W - L - 8;
    const plotH = H - B - T;
    const slot = plotW / n;
    const y = (v: number) => T + plotH - (v / top) * plotH;
    const x = (i: number) => L + slot * i + slot / 2;
    const barW = Math.min(36, (slot * 0.7) / chart.series.length);
    body = (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
          {[0, 1, 2, 3, 4].map((i) => {
            const v = (top / 4) * i;
            return (
              <g key={i}>
                <line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke="#00000018" />
                <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#414141">
                  {fmt(v)}
                </text>
              </g>
            );
          })}
          {chart.labels.map((l, i) => (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#414141">
              {l}
            </text>
          ))}
          {chart.type === "bar"
            ? chart.series.map((s, si) =>
                s.values.map((v, i) => (
                  <rect key={`${si}-${i}`} x={x(i) - (barW * chart.series.length) / 2 + si * barW} y={y(v)} width={barW - 2} height={Math.max(plotH - (y(v) - T), 0)} rx="3" fill={s.colour}>
                    <title>{`${s.name}: ${fmt(v)}`}</title>
                  </rect>
                )),
              )
            : chart.series.map((s, si) => (
                <g key={si}>
                  <polyline fill="none" stroke={s.colour} strokeWidth="2.5" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
                  {s.values.map((v, i) => (
                    <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={s.colour}>
                      <title>{`${s.name}: ${fmt(v)}`}</title>
                    </circle>
                  ))}
                </g>
              ))}
        </svg>
        {chart.series.length > 1 && (
          <ul className="mt-2 flex flex-wrap justify-center gap-4 text-[12px] text-black">
            {chart.series.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-sm" style={{ backgroundColor: s.colour }} />
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      {tabs.length > 0 && (
        // Figma Budget Visualizer: rectangular tabs (8px radius), centred above the chart.
        <div role="tablist" className="mb-4 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "min-h-12 rounded-[8px] border px-6 py-2.5 text-[15px] font-medium transition-colors",
                active === tab.key ? "border-[#135130] bg-[#135130] text-white" : "border-black/15 bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:bg-black/5",
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}
      {body}
    </div>
  );
}
