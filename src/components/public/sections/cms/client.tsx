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
