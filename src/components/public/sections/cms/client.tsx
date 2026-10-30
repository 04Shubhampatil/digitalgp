"use client";

import { ExternalLink, Play } from "lucide-react";
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

/** Photo gallery with category filter chips; each photo opens full size in a new tab. */
export function PhotoGalleryClient({ categories, photos, allLabel }: { categories: { key: string; name: string }[]; photos: GalleryPhoto[]; allLabel: string }) {
  const [active, setActive] = useState("all");
  const shown = active === "all" ? photos : photos.filter((p) => p.category === active);
  return (
    <div>
      {categories.length > 0 && (
        <div role="tablist" aria-label="Categories" className="mb-5 flex flex-wrap gap-2">
          <button type="button" role="tab" aria-selected={active === "all"} onClick={() => setActive("all")} className={chip(active === "all")}>
            {allLabel}
          </button>
          {categories.map((c) => (
            <button key={c.key} type="button" role="tab" aria-selected={active === c.key} onClick={() => setActive(c.key)} className={chip(active === c.key)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p, i) => (
          <li key={`${p.src}-${i}`}>
            <a href={p.src} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.07)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
              <img src={p.src} alt={p.title} loading="lazy" className="h-44 w-full object-cover transition-transform group-hover:scale-105" />
              {(p.title || p.date) && (
                <span className="block px-3 py-2">
                  {p.title && <span className="block truncate text-[13px] font-medium text-black">{p.title}</span>}
                  {p.date && <span className="block text-[11px] text-[#414141]">{p.date}</span>}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface YouthPost {
  tab: string;
  type: "blog" | "youtube" | "reel" | "idea";
  typeLabel: string;
  title: string;
  cover?: string;
  url?: string;
}

/** Youth Speak: tab chips (All + each tab) and the matching posts. */
export function YouthPostsClient({ tabs, posts, allLabel, openLabel }: { tabs: { key: string; name: string }[]; posts: YouthPost[]; allLabel: string; openLabel: string }) {
  const [active, setActive] = useState("all");
  const shown = active === "all" ? posts : posts.filter((p) => p.tab === active);
  return (
    <div>
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        <button type="button" role="tab" aria-selected={active === "all"} onClick={() => setActive("all")} className={chip(active === "all")}>
          {allLabel}
        </button>
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={active === t.key} onClick={() => setActive(t.key)} className={chip(active === t.key)}>
            {t.name}
          </button>
        ))}
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((p, i) => (
          <li key={i} className="flex flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.07)]">
            <div className="relative">
              {p.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={p.cover} alt="" loading="lazy" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-[#135130]/10 text-[#135130]">
                  <Play className="size-8" aria-hidden />
                </div>
              )}
              <span className="absolute top-2 left-2 rounded bg-[#135130] px-2 py-0.5 text-[11px] font-semibold text-white">{p.typeLabel}</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-[14px] font-semibold text-black">{p.title}</p>
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-3 text-[12px] font-medium text-[#135130] hover:underline">
                  {openLabel} <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface Comparison {
  before: string;
  after: string;
  heading: string;
}

/** Then & Now: drag the handle (or use the slider) to reveal the "after" photo over the "before" photo. */
export function ThenNowClient({ comparisons, beforeLabel, afterLabel }: { comparisons: Comparison[]; beforeLabel: string; afterLabel: string }) {
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(50);
  const c = comparisons[index];
  if (!c) return null;
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
        <div role="tablist" className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key} onClick={() => setActive(tab.key)} className={chip(active === tab.key)}>
              {tab.name}
            </button>
          ))}
        </div>
      )}
      {body}
    </div>
  );
}
