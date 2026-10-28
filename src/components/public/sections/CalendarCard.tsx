"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface CalendarEvent {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  time?: string;
  color?: string;
}

/** Interactive month calendar with the month's events listed underneath (Figma "Interactive Calendar"). */
export function CalendarCard({
  title,
  initial,
  events,
  weekdays,
  monthNames,
  allLabel,
  emptyLabel,
}: {
  title: string;
  /** Month shown first, as an ISO date (the server's "today"). */
  initial: string;
  events: CalendarEvent[];
  weekdays: string[];
  monthNames: string[];
  allLabel: string;
  emptyLabel: string;
}) {
  const start = new Date(initial);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayIso = start.toISOString().slice(0, 10);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const monthEvents = events.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).filter((e) => !selected || e.date === selected).sort((a, b) => a.date.localeCompare(b.date));
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };
  return (
    <div className="rounded-[10px] border border-black/15 bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.08)]">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-black">
        <CalendarDays className="size-5 text-[#135130]" aria-hidden /> {title}
      </h2>
      <div className="mt-4 rounded-[8px] border border-black/15 p-3">
        <div className="flex items-center justify-between text-[12px] font-medium text-black">
          <span>
            {monthNames[month]} {year}
          </span>
          <span className="flex gap-3">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded p-0.5 hover:bg-black/5">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded p-0.5 hover:bg-black/5">
              <ChevronRight className="size-4" />
            </button>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">
          {weekdays.map((w) => (
            <span key={w} className="py-1 text-[#414141]">
              {w}
            </span>
          ))}
          {Array.from({ length: first }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const key = iso(d);
            const has = byDay.has(key);
            const isToday = key === todayIso;
            const isSel = selected === key;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(isSel ? null : key)}
                aria-pressed={isSel}
                className={cn(
                  "mx-auto flex size-7 items-center justify-center rounded-full text-[12px]",
                  isToday ? "bg-[#135130] font-semibold text-white" : isSel ? "border border-[#135130] text-[#135130]" : has ? "font-semibold text-[#135130] ring-1 ring-[#135130]/40" : "text-black hover:bg-black/5",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-[11px]">
        {monthEvents.length === 0 && <li className="text-[#414141]">{emptyLabel}</li>}
        {monthEvents.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.color ?? "#135130" }} />
            <span className="w-12 shrink-0 text-[#414141]">
              {monthNames[Number(e.date.slice(5, 7)) - 1]?.slice(0, 3)} {Number(e.date.slice(8, 10))}
            </span>
            <span className="flex-1 font-medium text-black">{e.title}</span>
            {e.time && <span className="text-[#414141]">{e.time}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[12px] font-medium text-[#135130]">{allLabel} →</p>
    </div>
  );
}
