"use client";

import { ArrowRight, ChevronDown, ClipboardList, Droplets, Layers, Lightbulb, Route, TreePine, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface WardRow {
  label: string;
  valueText: string;
  /** Bar fill 0–100; derived from "a / b" values when absent. */
  percent?: number;
}
export interface WardView {
  name: string;
  items: WardRow[];
}

/** Row icon + bar colour in the Figma order (roads … ongoing projects). */
const ROWS: { Icon: LucideIcon; bar: string; ring: string; fg: string }[] = [
  { Icon: Route, bar: "#135130", ring: "bg-[#e3efe7]", fg: "text-[#135130]" },
  { Icon: Droplets, bar: "#1a62e0", ring: "bg-[#e2edfa]", fg: "text-[#1a62e0]" },
  { Icon: Lightbulb, bar: "#fbd23a", ring: "bg-[#fdf3d6]", fg: "text-[#e8a50c]" },
  { Icon: Layers, bar: "#6a1b9a", ring: "bg-[#ece3f5]", fg: "text-[#6a1b9a]" },
  { Icon: TreePine, bar: "#1b8a0a", ring: "bg-[#e3f1d4]", fg: "text-[#1b8a0a]" },
  { Icon: ClipboardList, bar: "#e8202a", ring: "bg-[#fde3e4]", fg: "text-[#e8202a]" },
];

function percentOf(r: WardRow): number {
  if (typeof r.percent === "number") return Math.max(0, Math.min(100, r.percent));
  const m = r.valueText.replace(/,/g, "").match(/([\d.]+)\D+([\d.]+)/);
  return m ? Math.max(0, Math.min(100, (Number(m[1]) / Number(m[2])) * 100)) : 0;
}

const WARD_COLOURS = ["#2f9e3f", "#e0a010", "#1a62e0", "#7b2cbf", "#d9480f", "#0b7285", "#c2255c", "#5c940d"];

/**
 * Schematic ward map: one block per ward in the data (names and count follow the backend), with a
 * legend. Clicking a block selects the ward. It is not a survey map; real ward boundaries need map data.
 */
function WardMap({ wards, active, onSelect }: { wards: WardView[]; active: number; onSelect: (i: number) => void }) {
  const cols = Math.min(wards.length, wards.length > 6 ? 4 : wards.length > 2 ? 3 : 2);
  return (
    <div className="relative h-[249px] overflow-hidden rounded-[10px] border border-[#414141] bg-[#1d3b24] p-3">
      <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: wards.length <= cols ? "minmax(0, 140px)" : "1fr", alignContent: "center" }}>
        {wards.map((w, i) => {
          const c = WARD_COLOURS[i % WARD_COLOURS.length]!;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={i === active}
              className="flex items-center justify-center rounded-[14px] px-2 text-center text-[12px] font-semibold text-white transition-opacity"
              style={{ backgroundColor: c, opacity: i === active ? 1 : 0.55, outline: i === active ? "2px solid white" : "none" }}
            >
              {w.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Ward map + "Ward Details" card with ward selector (Figma 375:12497). */
export function WardDetailsCard({ heading, wards, mapSrc, viewAll }: { heading: string; wards: WardView[]; mapSrc?: string; viewAll?: { label: string; href: string } }) {
  const [idx, setIdx] = useState(0);
  const ward = wards[idx] ?? wards[0];
  if (!ward) return null;
  return (
    <div className="rounded-[10px] border border-[#414141]/20 bg-white px-3 py-2">
      {mapSrc ? (
        <div className="relative h-[249px] overflow-hidden rounded-[10px] border border-[#414141]">
          {/* eslint-disable-next-line @next/next/no-img-element -- ward map image supplied by the Gram Panchayat */}
          <img src={mapSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : (
        <WardMap wards={wards} active={idx} onSelect={setIdx} />
      )}
      <div className="relative mt-0 overflow-hidden rounded-[10px] border border-[#414141]/20 bg-white px-3 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] leading-6 font-semibold text-[#135130]">{heading}</h3>
          <label className="relative inline-flex items-center rounded-[2px] border border-[#135130] text-[10px] font-semibold text-[#135130]">
            <span className="sr-only">{heading}</span>
            <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="appearance-none bg-transparent py-1 pr-7 pl-4 outline-none">
              {wards.map((w, i) => (
                <option key={i} value={i}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3" aria-hidden />
          </label>
        </div>
        <ul className="mt-1 flex flex-col gap-[2px]">
          {ward.items.map((r, i) => {
            const s = ROWS[i % ROWS.length]!;
            return (
              <li key={i} className="flex h-[22px] items-center gap-2 text-[10px]">
                <span aria-hidden className={`flex h-[19px] w-[21px] shrink-0 items-center justify-center rounded-full ${s.ring}`}>
                  <s.Icon className={`size-3 ${s.fg}`} />
                </span>
                <span className="w-[112px] shrink-0 font-semibold text-black">{r.label}</span>
                <span className="h-[3px] flex-1 rounded-full bg-[#dcdcdc]" role="progressbar" aria-label={r.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentOf(r))}>
                  <span className="block h-full rounded-full" style={{ width: `${percentOf(r)}%`, backgroundColor: s.bar }} />
                </span>
                <span className="w-[84px] shrink-0 text-right font-semibold text-[#414141]">{r.valueText}</span>
              </li>
            );
          })}
        </ul>
        {viewAll && (
          <div className="mt-3 flex justify-center">
            <Link href={viewAll.href} className="inline-flex items-center gap-1.5 rounded-full border border-[#135130] bg-[#135130] px-9 py-1 text-[10px] font-medium text-white hover:opacity-90">
              {viewAll.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
