"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface ProjectCard {
  stage: string;
  name: string;
  location?: string;
  year?: string;
  budget?: string;
  outcome?: string;
  families?: string;
  imageUrl?: string;
  href?: string;
}
export interface TabDef {
  key: string;
  label: string;
}
export interface ProjectLabels {
  year: string;
  budget: string;
  outcome: string;
  families: string;
  details: string;
  stageLabel: Record<string, string>;
  empty: string;
}

/** Key projects: stage tabs + project cards (Figma "3. Key Projects"). */
export function ProjectTabs({ tabs, items, labels }: { tabs: TabDef[]; items: ProjectCard[]; labels: ProjectLabels }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const shown = items.filter((p) => p.stage === active);
  return (
    <div>
      <div role="tablist" className="flex flex-wrap justify-end gap-8 text-[14px]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn("border-b-2 pb-1 font-medium", t.key === active ? "border-[#135130] text-black" : "border-transparent text-[#414141] hover:text-black")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 rounded-[10px] border border-black/10 bg-white p-8 text-center text-sm text-[#414141]">{labels.empty}</p>
      ) : (
        <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <li key={i} className="overflow-hidden rounded-[10px] border border-black/20 bg-white">
              <div className="relative h-[205px] bg-[#e8e4d9]">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- backend-served media / static design asset
                  <img src={p.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                )}
                <span className="absolute top-[23px] right-[11px] rounded-full bg-[#138808] px-2.5 py-0.5 text-[12px] text-white">{labels.stageLabel[p.stage] ?? p.stage}</span>
              </div>
              <div className="px-[46px] pt-3 pb-7">
                <h3 className="text-[16px] leading-[19px] text-black">{p.name}</h3>
                {p.location && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#138808]">
                    <MapPin className="size-4" aria-hidden /> {p.location}
                  </p>
                )}
                <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-[14px] text-[#414141]">
                  {p.year && (
                    <>
                      <dt>{labels.year}</dt>
                      <dd className="font-semibold">{p.year}</dd>
                    </>
                  )}
                  {p.budget && (
                    <>
                      <dt>{labels.budget}</dt>
                      <dd className="font-semibold">{p.budget}</dd>
                    </>
                  )}
                  {p.outcome && (
                    <>
                      <dt>{labels.outcome}</dt>
                      <dd className="font-semibold">{p.outcome}</dd>
                    </>
                  )}
                  {p.families && (
                    <>
                      <dt>{labels.families}</dt>
                      <dd className="font-semibold">{p.families}</dd>
                    </>
                  )}
                </dl>
                <div className="mt-5 flex justify-center">
                  {p.href ? (
                    <Link href={p.href} className="rounded-full border-[0.6px] border-[#135130] px-[30px] py-2 text-[13.5px] text-[#135130] hover:bg-[#135130]/5">
                      {labels.details}
                    </Link>
                  ) : (
                    <span className="rounded-full border-[0.6px] border-[#135130] px-[30px] py-2 text-[13.5px] text-[#135130]">{labels.details}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface BeforeAfterItem {
  label: string;
  height?: number;
  beforeUrl: string;
  afterUrl: string;
}

/** Draggable before/after comparison tile. */
function Compare({ item, before, after }: { item: BeforeAfterItem; before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div>
      <div className="relative overflow-hidden rounded-[10px] bg-[#e8e4d9]" style={{ height: item.height ?? 190 }}>
        {/* eslint-disable @next/next/no-img-element -- static design assets */}
        <img src={item.afterUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <img src={item.beforeUrl} alt="" className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} loading="lazy" />
        {/* eslint-enable @next/next/no-img-element */}
        <span className="absolute top-3 left-2 rounded-full bg-white px-1.5 py-px text-[8px] text-black">{before}</span>
        <span className="absolute top-3 right-2 rounded-full bg-[#138808] px-1.5 py-px text-[8px] text-white">{after}</span>
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }}>
          <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] text-[#135130] shadow">◂▸</span>
        </span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={item.label} className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
      </div>
      <p className="mt-3 text-center text-[14px] text-black">{item.label}</p>
    </div>
  );
}

export function BeforeAfterGrid({ items, before, after }: { items: BeforeAfterItem[]; before: string; after: string }) {
  return (
    <ul className={items.length === 1 ? "grid gap-5" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-4"}>
      {items.map((it, i) => (
        <li key={i}>
          <Compare item={it} before={before} after={after} />
        </li>
      ))}
    </ul>
  );
}

export interface MediaCard {
  category?: string;
  title: string;
  meta?: string;
  imageUrl?: string;
  /** "photo" shows a camera badge, "play" a play button over the picture. */
  kind?: "photo" | "play" | "none";
}

/** Category tabs + media/blog cards (Gallery photos & videos, Youth Speak blogs). */
export function MediaTabs({ tabs, items, emptyLabel }: { tabs: TabDef[]; items: MediaCard[]; emptyLabel: string }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const shown = items.filter((m) => active === tabs[0]?.key || !m.category || m.category === active);
  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" className="mb-6 flex flex-wrap justify-center gap-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === active}
              onClick={() => setActive(t.key)}
              className={cn("rounded-full border px-4 py-1.5 text-[13.5px]", t.key === active ? "border-[#135130] bg-[#135130] text-white" : "border-[#135130] text-[#135130] hover:bg-[#135130]/5")}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="rounded-[10px] border border-black/10 bg-white p-8 text-center text-sm text-[#414141]">{emptyLabel}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((m, i) => (
            <li key={i} className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.2)]">
              <div className="relative h-[194px] bg-[#e8e4d9]">
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset / backend media
                  <img src={m.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                )}
                {m.kind === "play" && (
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-[#135130]">▶</span>
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2 px-[17px] py-4">
                <div>
                  <p className="text-[14px] leading-5 font-medium text-black">{m.title}</p>
                  {m.meta && <p className="mt-2 text-[12px] text-[#414141]">{m.meta}</p>}
                </div>
                {m.kind === "photo" && (
                  <span aria-hidden className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]">
                    ▣
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
