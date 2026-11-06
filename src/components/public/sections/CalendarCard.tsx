"use client";

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface CalendarEvent {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  time?: string;
  color?: string;
  /** Venue (announcement `eventLocation`). */
  location?: string;
  /** Announcement page of a published event. */
  href?: string;
}

/** "July" stays whole, longer month names are cut to three letters so the date column stays one line. */
const shortMonth = (m: string) => (m.length <= 5 ? m : m.slice(0, 3));

/** Interactive month calendar with the month's events listed underneath (Figma "Interactive Calendar"). */
export function CalendarCard({
  title,
  initial,
  events,
  weekdays,
  monthNames,
  allLabel,
  emptyLabel,
  figma,
}: {
  title: string;
  /** Month shown first, as an ISO date (the server's "today"). */
  initial: string;
  events: CalendarEvent[];
  weekdays: string[];
  monthNames: string[];
  allLabel: string;
  emptyLabel: string;
  /** Figma "Interactive Calendar" look (Announcements): header picture, month menu, 48px day cells, event box. */
  figma?: { iconUrl?: string; id?: string; prevLabel: string; nextLabel: string };
}) {
  const start = new Date(initial);
  // Open on the current month when it has events, else on the nearest month that does (the design shows a busy month).
  const startMonth = start.toISOString().slice(0, 7);
  const nearest = events.some((e) => e.date.startsWith(startMonth))
    ? start
    : (() => {
        const sorted = events.map((e) => e.date).sort();
        const next = sorted.find((d) => d >= startMonth) ?? sorted[sorted.length - 1];
        return next ? new Date(`${next.slice(0, 7)}-01T00:00:00`) : start;
      })();
  const [year, setYear] = useState(nearest.getFullYear());
  const [month, setMonth] = useState(nearest.getMonth());
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
  const goNextMonthWithEvents = () => {
    const cur = `${year}-${String(month + 1).padStart(2, "0")}`;
    const sorted = events.map((e) => e.date.slice(0, 7)).sort();
    const next = sorted.find((m) => m > cur) ?? sorted[0];
    if (next) {
      setYear(Number(next.slice(0, 4)));
      setMonth(Number(next.slice(5, 7)) - 1);
      setSelected(null);
    }
  };
  if (figma) {
    const rows = Math.ceil((first + days) / 7);
    const cells = Array.from({ length: rows * 7 }, (_, i) => i - first + 1);
    return (
      <div id={figma.id} className="flex scroll-mt-[180px] flex-col rounded-[10px] border border-[#414141]/20 bg-white px-[18px] pt-[22px] pb-[30px]">
        <h2 className="flex items-center gap-[11px] text-[20px] leading-6 font-semibold text-black">
          {figma.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static design asset
            <img src={figma.iconUrl} alt="" width={40} height={40} className="-ml-[2px] size-10 shrink-0" />
          ) : (
            <CalendarDays className="size-8 text-[#135130]" aria-hidden />
          )}
          {title}
        </h2>
        <div className="mt-[14px] flex h-14 items-center justify-between rounded-t-[10px] border border-[#414141]/20 pr-[10px] pl-4">
          <label className="relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-1 text-[16px] font-medium text-[#414141] hover:bg-black/5">
            <span className="whitespace-nowrap">
              {monthNames[month]} {year}
            </span>
            <svg aria-hidden viewBox="0 0 10 5" className="h-[5px] w-[10px]" fill="currentColor">
              <path d="M0 0h10L5 5z" />
            </svg>
            <select
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setSelected(null);
              }}
              aria-label={`${monthNames[month]} ${year}`}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <span className="flex">
            <button type="button" onClick={() => shift(-1)} aria-label={figma.prevLabel} className="flex size-12 items-center justify-center rounded-full text-[#414141] hover:bg-black/5">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => shift(1)} aria-label={figma.nextLabel} className="flex size-12 items-center justify-center rounded-full text-[#414141] hover:bg-black/5">
              <ChevronRight className="size-6" />
            </button>
          </span>
        </div>
        <div className="-mt-px grid grid-cols-7 rounded-b-[10px] border border-[#414141]/20 px-3 text-center text-[16px] text-[#222]">
          {weekdays.map((w, i) => (
            <span key={i} className="flex h-12 items-center justify-center">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d < 1 || d > days) return <span key={i} className="h-12" />;
            const key = iso(d);
            const has = byDay.has(key);
            const isToday = key === todayIso;
            const isSel = selected === key;
            return (
              <span key={i} className="flex h-12 items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSelected(isSel ? null : key)}
                  aria-pressed={isSel}
                  className={cn("flex size-10 items-center justify-center rounded-full", isToday ? "bg-[#135130] text-white" : isSel ? "border border-[#135130] text-[#135130]" : has ? "border border-[#135130]/60 font-semibold text-[#135130]" : "hover:bg-black/5")}
                >
                  {d}
                </button>
              </span>
            );
          })}
        </div>
        <div className="mt-px flex flex-1 flex-col rounded-[10px] border border-[#414141]/20 bg-white px-[10px] pt-2 pb-2">
          <ul className="text-[12px] leading-6 font-semibold">
            {monthEvents.length === 0 && <li className="py-1 font-normal text-[#414141]">{emptyLabel}</li>}
            {monthEvents.map((e, i) => (
              <li key={i} className="flex h-[27px] items-center gap-2">
                <span aria-hidden className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: e.color ?? "#135130" }} />
                <span className="w-[62px] shrink-0 whitespace-nowrap text-[#414141]">
                  {shortMonth(monthNames[Number(e.date.slice(5, 7)) - 1] ?? "")} {Number(e.date.slice(8, 10))}
                </span>
                {e.href ? (
                  <Link href={e.href} className="min-w-0 flex-1 truncate text-black hover:text-[#135130] hover:underline" title={e.title}>
                    {e.title}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-black" title={e.title}>
                    {e.title}
                  </span>
                )}
                {e.time && <span className="shrink-0 whitespace-nowrap text-[#414141]">{e.time}</span>}
              </li>
            ))}
          </ul>
          {/* No separate calendar page exists: "View Full Calendar" moves to the next month that has events. */}
          <button type="button" onClick={goNextMonthWithEvents} className="mx-auto mt-auto flex h-10 items-center gap-1 pt-2 text-[13.5px] font-medium text-[#135130] hover:underline">
            {allLabel} <ArrowRight className="size-6 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
    );
  }
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
          {weekdays.map((w, i) => (
            <span key={i} className="py-1 text-[#414141]">
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
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: e.color ?? "#135130" }} />
            <span className="w-12 shrink-0 text-[#414141]">
              {monthNames[Number(e.date.slice(5, 7)) - 1]?.slice(0, 3)} {Number(e.date.slice(8, 10))}
            </span>
            <span className="min-w-0 flex-1">
              {e.href ? (
                <Link href={e.href} className="font-medium text-black hover:text-[#135130] hover:underline">
                  {e.title}
                </Link>
              ) : (
                <span className="font-medium text-black">{e.title}</span>
              )}
              {(e.location || (e.href && e.time)) && <span className="block text-[10px] text-[#414141]">{[e.href ? e.time : "", e.location].filter(Boolean).join(" · ")}</span>}
            </span>
            {e.time && !e.href && <span className="text-[#414141]">{e.time}</span>}
          </li>
        ))}
      </ul>
      {/* No separate calendar page exists: "View Full Calendar" moves to the next month that has events. */}
      <button
        type="button"
        onClick={() => {
          const cur = `${year}-${String(month + 1).padStart(2, "0")}`;
          const sorted = events.map((e) => e.date.slice(0, 7)).sort();
          const next = sorted.find((m) => m > cur) ?? sorted[0];
          if (next) {
            setYear(Number(next.slice(0, 4)));
            setMonth(Number(next.slice(5, 7)) - 1);
            setSelected(null);
          }
        }}
        className="mt-4 block w-full text-center text-[12px] font-medium text-[#135130] hover:underline"
      >
        {allLabel} →
      </button>
    </div>
  );
}
