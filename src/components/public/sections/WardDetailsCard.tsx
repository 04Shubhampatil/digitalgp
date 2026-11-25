"use client";

import { ArrowRight, ChevronDown, ClipboardList, Droplets, Layers, Lightbulb, Minus, Plus, Route, TreePine, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { projectGeometries, type WardGeometry } from "@/lib/geo";
import { WARD_MAP_H, WARD_MAP_W, WARD_SHAPES, shapePath } from "./ward-shapes";

export interface WardMapLabels {
  zoomIn: string;
  zoomOut: string;
  /** Tag shown while the ward figures are samples. */
  sampleData: string;
  /** Button that goes back from one ward to the whole map. */
  allWards: string;
}

export interface WardRow {
  label: string;
  valueText: string;
  /** Bar fill 0–100; derived from "a / b" values when absent. */
  percent?: number;
}
export interface WardView {
  name: string;
  items: WardRow[];
  wardNo?: string;
  colour?: string;
  geometry?: WardGeometry;
  /** Picture of this ward's map (fallback when there is no boundary data). */
  mapImage?: string;
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

/** Row style by what the row measures (so a ward without roads still shows the pipeline icon on "Water Pipeline"). */
const ROW_KEYWORDS: RegExp[] = [/road|रस्ते|रस्ता/i, /water|pipe|पाणी|जल/i, /light|दिवे|दिवा/i, /drain|गटार|नाली/i, /plant|tree|वृक्ष|झाड/i, /project|प्रकल्प/i];
function rowStyle(label: string, i: number) {
  const hit = ROW_KEYWORDS.findIndex((re) => re.test(label));
  return ROWS[hit >= 0 ? hit : i % ROWS.length]!;
}

function percentOf(r: WardRow): number {
  if (typeof r.percent === "number") return Math.max(0, Math.min(100, r.percent));
  const m = r.valueText.replace(/,/g, "").match(/([\d.]+)\D+([\d.]+)/);
  return m ? Math.max(0, Math.min(100, (Number(m[1]) / Number(m[2])) * 100)) : 0;
}

const WARD_COLOURS = ["#2f9e3f", "#e0a010", "#1a62e0", "#7b2cbf", "#d9480f", "#0b7285", "#c2255c", "#5c940d"];

const MAX_ZOOM = 3;

/**
 * A map layer that zooms with the + / − buttons and moves by dragging when zoomed in (the design's controls, top left).
 * `target` (centre as fractions of the map, and a zoom) moves the map to a ward whenever `targetKey` changes; no target
 * shows the whole map again.
 */
function ZoomableFrame({ labels, className, style, target, targetKey, sample, extra, children }: { labels: WardMapLabels; className?: string; style?: React.CSSProperties; target?: { fx: number; fy: number; z: number } | null; targetKey?: number; sample?: boolean; extra?: React.ReactNode; children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // fractions of the frame size
  const [dragging, setDragging] = useState(false);
  const zoomRef = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const clamp = (p: { x: number; y: number }, z: number) => {
    const m = (z - 1) / 2;
    return { x: Math.max(-m, Math.min(m, p.x)), y: Math.max(-m, Math.min(m, p.y)) };
  };
  const zoomBy = (delta: number) => {
    // Latest zoom from a ref, so two quick clicks are two steps.
    const z = Math.max(1, Math.min(MAX_ZOOM, +(zoomRef.current + delta).toFixed(1)));
    zoomRef.current = z;
    setZoom(z);
    setPan((p) => clamp(p, z));
  };

  // Choosing a ward zooms the map to it; going back to all wards shows the whole map.
  const first = useRef(true);
  /* eslint-disable react-hooks/set-state-in-effect -- the map follows the chosen ward (an external choice made elsewhere on the card) */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (target) {
      zoomRef.current = target.z;
      setZoom(target.z);
      setPan(clamp({ x: -(target.fx - 0.5) * target.z, y: -(target.fy - 0.5) * target.z }, target.z));
    } else {
      zoomRef.current = 1;
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new choice moves the map
  }, [targetKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div ref={box} className={cn("relative overflow-hidden rounded-[10px] border border-[#414141] bg-[#1d3b24]", className)} style={style}>
      <div
        className={cn("absolute inset-0", zoom > 1 && (dragging ? "cursor-grabbing" : "cursor-grab"))}
        style={{ transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})`, transformOrigin: "50% 50%", transition: dragging ? "none" : "transform .25s", touchAction: zoom > 1 ? "none" : undefined }}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const r = box.current?.getBoundingClientRect();
          if (!d || !r) return;
          const dx = (e.clientX - d.x) / r.width;
          const dy = (e.clientY - d.y) / r.height;
          if (Math.abs(dx) + Math.abs(dy) > 0.01) d.moved = true;
          setPan(clamp({ x: d.px + dx, y: d.py + dy }, zoomRef.current));
        }}
        onPointerUp={() => {
          setDragging(false);
          // A drag must not count as a click on the ward under the pointer.
          window.setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          if (drag.current) {
            setDragging(false);
            drag.current = null;
          }
        }}
        onClickCapture={(e) => {
          if (drag.current?.moved) e.stopPropagation();
        }}
      >
        {children}
      </div>
      <div className="absolute top-2 left-2 flex w-[26px] flex-col overflow-hidden rounded-[6px] bg-white shadow-[0_0_6px_rgba(0,0,0,0.25)]">
        <button type="button" aria-label={labels.zoomIn} disabled={zoom >= MAX_ZOOM} onClick={() => zoomBy(0.5)} className="flex h-[24px] items-center justify-center text-[#222] hover:bg-black/5 disabled:opacity-35">
          <Plus className="size-4" strokeWidth={2.6} aria-hidden />
        </button>
        <span aria-hidden className="mx-1 h-px bg-black/10" />
        <button type="button" aria-label={labels.zoomOut} disabled={zoom <= 1} onClick={() => zoomBy(-0.5)} className="flex h-[24px] items-center justify-center text-[#222] hover:bg-black/5 disabled:opacity-35">
          <Minus className="size-4" strokeWidth={2.6} aria-hidden />
        </button>
      </div>
      {sample && <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-medium text-white">{labels.sampleData}</span>}
      {extra}
    </div>
  );
}

/** Fill of the pill that carries a ward's name on the Figma map (a darker shade of the ward's colour). */
const PILL_COLOURS = ["#04831a", "#a96f00", "#095999", "#660f99"];

/**
 * The Figma ward map (picture without its baked-in controls) as a live map. All wards show as in the design; choosing a
 * ward (a click on it, its legend entry or the Ward selector) zooms the map to that ward and dims the others, and the
 * figures below change to that ward's. "All wards" goes back to the whole map.
 */
function SchematicWardMap({ wards, active, focused, onSelect, onReset, labels, sample }: { wards: WardView[]; active: number; focused: boolean; onSelect: (i: number) => void; onReset: () => void; labels: WardMapLabels; sample?: boolean }) {
  const shape = WARD_SHAPES[active];
  let target: { fx: number; fy: number; z: number } | null = null;
  if (focused && shape) {
    const xs = shape.points.map((p) => p[0]);
    const ys = shape.points.map((p) => p[1]);
    const bw = (Math.max(...xs) - Math.min(...xs)) / WARD_MAP_W;
    const bh = (Math.max(...ys) - Math.min(...ys)) / WARD_MAP_H;
    target = { fx: (Math.max(...xs) + Math.min(...xs)) / 2 / WARD_MAP_W, fy: (Math.max(...ys) + Math.min(...ys)) / 2 / WARD_MAP_H, z: Math.max(1.4, Math.min(2.4, 0.78 / Math.max(bw, bh))) };
  }
  return (
    <ZoomableFrame
      labels={labels}
      sample={sample}
      style={{ aspectRatio: `${WARD_MAP_W} / ${WARD_MAP_H}` }}
      className="w-full"
      target={target}
      targetKey={focused ? active + 1 : 0}
      extra={
        focused ? (
          <button type="button" onClick={onReset} className="absolute top-2 right-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#135130] shadow-[0_0_6px_rgba(0,0,0,0.25)] hover:bg-[#f2f2f2]" style={sample ? { top: 30 } : undefined}>
            {labels.allWards}
          </button>
        ) : null
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the design's map picture */}
      <img src="/images/figma/ward-map-figma.jpg" alt="" draggable={false} className="absolute inset-0 size-full object-cover select-none" />
      <svg viewBox={`0 0 ${WARD_MAP_W} ${WARD_MAP_H}`} className="absolute inset-0 size-full" role="group" aria-label="Ward map">
        {WARD_SHAPES.map((s, i) => {
          const w = wards[i];
          const on = i === active;
          const path = shapePath(s.points);
          if (!w) {
            // No ward for this outline: the picture's own colour is covered.
            return <path key={i} d={path} fill="#142b19" fillOpacity={0.9} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />;
          }
          const name = w.name;
          const pillW = Math.max(150, name.length * 25 + 52);
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={name}
              aria-pressed={focused && on}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(i)}
            >
              {/* Others dim while one ward is chosen; the chosen ward gets a white outline. */}
              <path d={path} fill={focused && !on ? "#0b1a10" : "#ffffff"} fillOpacity={focused && !on ? 0.58 : 0} stroke={focused && on ? "#ffffff" : "none"} strokeWidth={7} strokeLinejoin="round" style={{ transition: "fill-opacity .25s" }} className={cn(!focused && "hover:[fill-opacity:0.14]")} />
              {/* The ward's own name, in a pill like the design's (covers the picture's "Ward n" label). */}
              <rect x={s.label[0] - pillW / 2} y={s.label[1] - 27} width={pillW} height={54} rx={27} fill={PILL_COLOURS[i % PILL_COLOURS.length]} fillOpacity={focused && !on ? 0.6 : 1} pointerEvents="none" />
              <text x={s.label[0]} y={s.label[1] + 1} textAnchor="middle" dominantBaseline="middle" fontSize={34} fontWeight={700} fill="#ffffff" pointerEvents="none">
                {name}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="absolute bottom-2 left-2 hidden space-y-1 rounded-[7px] bg-white px-2.5 py-2 sm:block text-[10px] leading-[13px] font-semibold text-[#222] shadow-[0_0_6px_rgba(0,0,0,0.25)]">
        {wards.slice(0, WARD_SHAPES.length).map((w, i) => (
          <li key={i}>
            <button type="button" onClick={() => onSelect(i)} aria-pressed={focused && i === active} className={cn("flex items-center gap-2", focused && i === active && "underline")}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: w.colour ?? WARD_COLOURS[i % WARD_COLOURS.length] }} />
              {w.name}
            </button>
          </li>
        ))}
      </ul>
    </ZoomableFrame>
  );
}

/**
 * Schematic ward map: one block per ward in the data (names and count follow the backend), with a
 * legend. Clicking a block selects the ward. It is not a survey map; real ward boundaries need map data.
 */
function WardMap({ wards, active, onSelect, labels }: { wards: WardView[]; active: number; onSelect: (i: number) => void; labels: WardMapLabels }) {
  const projected = projectGeometries(
    wards.map((x) => x.geometry),
    600,
    420,
  );
  if (projected && projected.shapes.some(Boolean)) {
    return (
      <ZoomableFrame labels={labels} className="max-h-[300px] w-full" style={{ aspectRatio: "600 / 420" }}>
        <svg viewBox="0 0 600 420" role="group" aria-label="Ward map" className="absolute inset-0 size-full">
          {wards.map((x, i) => {
            const s = projected.shapes[i];
            if (!s) return null;
            const c = x.colour ?? WARD_COLOURS[i % WARD_COLOURS.length]!;
            return (
              <g key={i} onClick={() => onSelect(i)} className="cursor-pointer">
                <path d={s.d} fill={c} fillOpacity={i === active ? 0.95 : 0.6} stroke="#ffffff" strokeWidth={i === active ? 3 : 1.5} fillRule="evenodd" role="button" tabIndex={0} aria-label={x.name} aria-pressed={i === active} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(i)} />
                <text x={s.label[0]} y={s.label[1]} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="600" fill="#ffffff" stroke="#00000066" strokeWidth="0.6" pointerEvents="none">
                  {x.name}
                </text>
              </g>
            );
          })}
        </svg>
      </ZoomableFrame>
    );
  }
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
export function WardDetailsCard({ heading, wards, mapSrc, viewAll, labels, sample }: { heading: string; wards: WardView[]; mapSrc?: string; viewAll?: { label: string; href: string }; labels: WardMapLabels; sample?: boolean }) {
  const [idx, setIdx] = useState(0);
  // Once a ward is chosen (map, legend or selector) the map shows that ward alone, zoomed in; "All wards" undoes it.
  const [focused, setFocused] = useState(false);
  const choose = (i: number) => {
    setIdx(i);
    setFocused(true);
  };
  const ward = wards[idx] ?? wards[0];
  if (!ward) return null;
  const hasGeometry = wards.some((w) => w.geometry);
  const picture = ward.mapImage ?? mapSrc;
  return (
    <div className="rounded-[10px] border border-[#414141]/20 bg-white px-3 py-2">
      {picture ? (
        // A map picture supplied by the Gram Panchayat: it zooms with the buttons too.
        <ZoomableFrame labels={labels} sample={sample} className="h-[249px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- ward map image supplied by the Gram Panchayat */}
          <img src={picture} alt="" draggable={false} className="absolute inset-0 size-full object-cover object-top select-none" loading="lazy" />
        </ZoomableFrame>
      ) : hasGeometry || wards.length > WARD_SHAPES.length ? (
        <WardMap wards={wards} active={idx} onSelect={setIdx} labels={labels} />
      ) : (
        <SchematicWardMap wards={wards} active={idx} focused={focused} onSelect={choose} onReset={() => setFocused(false)} labels={labels} sample={sample} />
      )}
      <div className="relative mt-0 overflow-hidden rounded-[10px] border border-[#414141]/20 bg-white px-3 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] leading-6 font-semibold text-[#135130]">{heading}</h3>
          <label className="relative inline-flex items-center rounded-[2px] border border-[#135130] text-[10px] font-semibold text-[#135130]">
            <span className="sr-only">{heading}</span>
            <select value={idx} onChange={(e) => choose(Number(e.target.value))} className="appearance-none bg-transparent py-1 pr-7 pl-4 outline-none">
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
            const s = rowStyle(r.label, i);
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
