"use client";

import { Expand, Minus, Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export interface MapFilter {
  name: string;
  colour: string;
  icon: ReactNode;
}

/**
 * Figma Infrastructure "Village Infrastructure Map": the map picture with a "Facility Filters" panel over its
 * left edge, zoom / full-screen controls top right and the legend row underneath, all in one card.
 * The filters are checkboxes: ticking some highlights those facilities in the legend (the picture's markers are
 * part of the image, so they cannot be hidden individually). Zoom scales the picture; full screen uses the browser API.
 */
export function InfraMapClient({ image, alt, title, filters, labels }: { image: string; alt: string; title: string; filters: MapFilter[]; labels: { zoomIn: string; zoomOut: string; fullscreen: string } }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const dim = (i: number) => checked.size > 0 && !checked.has(i);
  const ctrl = "flex size-10 items-center justify-center bg-white text-black hover:bg-[#f2f2f2] disabled:opacity-40";
  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.06)]">
      <div ref={box} className="relative h-[300px] overflow-hidden bg-[#1f3a24] sm:h-[420px] lg:h-[496px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- website media / design picture */}
        <img src={image} alt={alt} className="size-full object-cover transition-transform duration-300" style={{ transform: `scale(${zoom})` }} />
        <fieldset className="absolute top-0 bottom-0 left-0 hidden w-[240px] flex-col overflow-auto rounded-r-[8px] bg-white shadow-[2px_0_10px_rgba(0,0,0,0.15)] md:flex">
          <legend className="sr-only">{title}</legend>
          <p aria-hidden className="bg-[#135130] px-4 py-3 text-[15px] font-semibold text-white">
            {title}
          </p>
          <ul className="flex flex-1 flex-col justify-around px-4 py-3">
            {filters.map((f, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[13px] font-medium text-black">
                  <span aria-hidden className="flex size-5 shrink-0 items-center justify-center" style={{ color: f.colour }}>
                    {f.icon}
                  </span>
                  <span className="min-w-0 flex-1">{f.name}</span>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} className="size-4 rounded-[3px] border-black/30 accent-[#135130]" />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="absolute top-4 right-4 flex flex-col gap-4">
          <div className="flex flex-col overflow-hidden rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            <button type="button" aria-label={labels.zoomIn} onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} disabled={zoom >= 2.5} className={`${ctrl} border-b border-black/10`}>
              <Plus className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label={labels.zoomOut} onClick={() => setZoom((z) => Math.max(1, z - 0.25))} disabled={zoom <= 1} className={ctrl}>
              <Minus className="size-5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            aria-label={labels.fullscreen}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void box.current?.requestFullscreen?.();
            }}
            className={`${ctrl} rounded-[4px] shadow-[0_1px_4px_rgba(0,0,0,0.3)]`}
          >
            <Expand className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 lg:justify-between lg:px-8">
        {filters.map((f, i) => (
          <li key={i} className={`flex items-center gap-2.5 text-[13px] font-semibold text-black transition-opacity ${dim(i) ? "opacity-30" : ""}`}>
            <span aria-hidden className="flex size-5 items-center justify-center" style={{ color: f.colour }}>
              {f.icon}
            </span>
            {f.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
