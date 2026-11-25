"use client";

import { Expand, Minus, Plus } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

export interface MapFilter {
  /** Icon key of the filter: pins with the same key belong to it. */
  key?: string;
  name: string;
  colour: string;
  icon: ReactNode;
}

export interface MapPin {
  x: number;
  y: number;
  icon: string;
}

const MAX_ZOOM = 3;

/**
 * Figma Infrastructure "Village Infrastructure Map" (375:14963): one card with the map picture (496px), a 240px
 * "Facility Filters" panel over its left edge, 48px zoom / full-screen controls top right and the 81px legend row underneath.
 * The filters are checkboxes (each tinted in its facility colour): with the design picture, ticking some keeps the pins
 * of those facilities bright and dims the rest of the map (and the legend row follows). Zoom scales the map, which can be
 * dragged when zoomed in; full screen uses the browser API.
 */
export function InfraMapClient({
  image,
  alt,
  title,
  filters,
  labels,
  pins,
  size,
}: {
  image: string;
  alt: string;
  title: string;
  filters: MapFilter[];
  labels: { zoomIn: string; zoomOut: string; fullscreen: string; showing?: string };
  /** Pin positions in the picture's own pixels (design picture only); without them the filters only mark the legend. */
  pins?: MapPin[];
  /** Pixel size of the picture the pins refer to. */
  size?: { w: number; h: number };
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // fractions of the map size
  const [dragging, setDragging] = useState(false);
  const zoomRef = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const maskId = useId().replace(/:/g, "");

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const dim = (i: number) => checked.size > 0 && !checked.has(i);

  const clamp = (p: { x: number; y: number }, z: number) => {
    const m = (z - 1) / 2;
    return { x: Math.max(-m, Math.min(m, p.x)), y: Math.max(-m, Math.min(m, p.y)) };
  };
  const zoomBy = (delta: number) => {
    const z = Math.max(1, Math.min(MAX_ZOOM, +(zoomRef.current + delta).toFixed(2)));
    zoomRef.current = z;
    setZoom(z);
    setPan((p) => clamp(p, z));
  };

  // Pins of the ticked categories (all of them while nothing is ticked).
  const activeKeys = new Set([...checked].map((i) => filters[i]?.key).filter((k): k is string => !!k));
  const shown = pins ? pins.filter((p) => checked.size === 0 || activeKeys.has(p.icon)) : [];

  const ctrl = "flex size-12 items-center justify-center bg-white text-black hover:bg-[#f2f2f2] disabled:cursor-default disabled:opacity-40";
  const W = size?.w ?? 1360;
  const H = size?.h ?? 620;
  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.12)]">
      <div ref={box} className="relative h-[300px] overflow-hidden bg-[#1f3a24] sm:h-[420px] md:h-[470px] lg:h-[496px]">
        <div
          ref={mapBox}
          className={`absolute inset-y-0 right-0 left-0 md:left-[240px] ${zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
          style={{ transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})`, transformOrigin: "50% 50%", transition: dragging ? "none" : "transform .25s", touchAction: zoom > 1 ? "none" : undefined }}
          onPointerDown={(e) => {
            if (zoom <= 1) return;
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            const r = mapBox.current?.getBoundingClientRect();
            if (!d || !r) return;
            // The box is scaled, so its rect is already zoomed: divide by the zoom to get fractions of the unscaled size.
            setPan(clamp({ x: d.px + (e.clientX - d.x) / (r.width / zoomRef.current), y: d.py + (e.clientY - d.y) / (r.height / zoomRef.current) }, zoomRef.current));
          }}
          onPointerUp={() => {
            drag.current = null;
            setDragging(false);
          }}
          onPointerLeave={() => {
            drag.current = null;
            setDragging(false);
          }}
        >
          {pins ? (
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="size-full select-none" role="img" aria-label={alt}>
              <defs>
                <mask id={maskId}>
                  <rect width={W} height={H} fill="#fff" />
                  {shown.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y + 10} r={56} fill="#000" />
                  ))}
                </mask>
              </defs>
              <image href={image} width={W} height={H} preserveAspectRatio="none" />
              {checked.size > 0 && (
                <>
                  <rect width={W} height={H} fill="#0b1a10" fillOpacity={0.62} mask={`url(#${maskId})`} style={{ transition: "opacity .2s" }} />
                  {shown.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={34} fill="none" stroke="#fff" strokeWidth={4} strokeOpacity={0.9} />
                  ))}
                </>
              )}
            </svg>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- website media / design picture
            <img src={image} alt={alt} draggable={false} className="size-full object-cover select-none" />
          )}
        </div>
        <fieldset className="absolute top-0 bottom-0 left-0 hidden w-[240px] flex-col overflow-hidden rounded-br-[10px] bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.18)] md:flex">
          <legend className="sr-only">{title}</legend>
          <p aria-hidden className="flex h-[43px] shrink-0 items-center bg-[#135130] px-5 text-[16px] font-bold text-white">
            {title}
          </p>
          <ul className="flex-1 pt-[10px]">
            {filters.map((f, i) => (
              <li key={i}>
                <label className="flex h-[45px] cursor-pointer items-center gap-[13px] pr-5 pl-[26px] text-[14px] font-semibold text-black">
                  <span aria-hidden className="flex size-5 shrink-0 items-center justify-center" style={{ color: f.colour }}>
                    {f.icon}
                  </span>
                  <span className="min-w-0 flex-1">{f.name}</span>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} className="size-[18px] rounded-[4px] border-black/30" style={{ accentColor: f.colour }} />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="absolute top-[19px] right-3 flex flex-col gap-5">
          <div className="flex flex-col overflow-hidden rounded-[8px] shadow-[0_1px_5px_rgba(0,0,0,0.3)]">
            <button type="button" aria-label={labels.zoomIn} onClick={() => zoomBy(0.5)} disabled={zoom >= MAX_ZOOM} className={`${ctrl} border-b border-black/10`}>
              <Plus className="size-6" aria-hidden />
            </button>
            <button type="button" aria-label={labels.zoomOut} onClick={() => zoomBy(-0.5)} disabled={zoom <= 1} className={ctrl}>
              <Minus className="size-6" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            aria-label={labels.fullscreen}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void box.current?.requestFullscreen?.();
            }}
            className={`${ctrl} rounded-[8px] shadow-[0_1px_5px_rgba(0,0,0,0.3)]`}
          >
            <Expand className="size-5" aria-hidden />
          </button>
        </div>
        {pins && checked.size > 0 && (
          <p aria-live="polite" className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[12px] font-medium text-white md:left-[256px]">
            {(labels.showing ?? "{n}").replace("{n}", String(shown.length))}
          </p>
        )}
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 lg:h-[81px] lg:flex-nowrap lg:justify-between lg:px-[38px] lg:py-0">
        {filters.map((f, i) => (
          <li key={i} className={`text-[14px] font-semibold whitespace-nowrap text-black transition-opacity ${dim(i) ? "opacity-30" : ""}`}>
            {/* On phones the filter panel is hidden, so these chips are the filters; on larger screens they mirror the panel. */}
            <button type="button" aria-pressed={checked.has(i)} onClick={() => toggle(i)} className={`flex items-center gap-2.5 rounded-full px-2 py-1 ${checked.has(i) ? "bg-black/[0.06]" : ""}`}>
              <span aria-hidden className="flex size-5 items-center justify-center" style={{ color: f.colour }}>
                {f.icon}
              </span>
              {f.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
