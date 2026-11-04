"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------------------------------ heritage carousel

export interface HeritageSlide {
  title: string;
  description: string;
  image?: string;
}

/** Figma "Our Village History and Heritage": three temple cards at a time with prev / next arrows. */
export function HeritageCarousel({
  items,
  prevLabel,
  nextLabel,
}: {
  items: HeritageSlide[];
  prevLabel: string;
  nextLabel: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  const go = (dir: 1 | -1) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (el && first)
      el.scrollBy({ left: dir * (first.offsetWidth + 16), behavior: "smooth" });
  };
  const arrow =
    "absolute top-[118px] z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#135130] shadow-[0_0_8px_rgba(0,0,0,0.18)] disabled:opacity-40";
  return (
    <div className="relative h-full rounded-[10px] border border-black/10 bg-white/70 px-4 py-5 sm:px-[42px]">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={() => go(-1)}
        disabled={edge.start}
        className={cn(arrow, "left-0 sm:left-0")}
      >
        <ChevronLeft className="size-6" aria-hidden />
      </button>
      <ul
        ref={track}
        onScroll={update}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, i) => (
          <li
            key={i}
            className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]"
          >
            {it.image && (
              // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
              <img
                src={it.image}
                alt=""
                loading="lazy"
                className="h-[187px] w-full rounded-[6px] object-cover"
              />
            )}
            <p className="mt-4 text-[16px] leading-6 font-semibold text-black">
              {it.title}
            </p>
            {it.description && (
              <p className="mt-1 text-[14px] leading-6 text-[#414141]">
                {it.description}
              </p>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => go(1)}
        disabled={edge.end}
        className={cn(arrow, "right-0")}
      >
        <ChevronRight className="size-6" aria-hidden />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------------ youth speak

export interface YouthPostCard {
  tab: string;
  type: "blog" | "youtube" | "reel" | "idea";
  typeLabel: string;
  title: string;
  cover?: string;
  /** Resolved link (site path or https URL); cards without one are not links. */
  href?: string;
  external?: boolean;
  author?: string;
  date?: string;
}

const BADGE: Record<YouthPostCard["type"], string> = {
  blog: "bg-[#138808]",
  youtube: "bg-[#e00000]",
  reel: "bg-[#8e24c9]",
  idea: "bg-[#135130]",
};
const PAGE = 4;

/** Figma "Youth Speak": tab chips, four cards with a type badge, a next arrow and "View All Contribution". */
export function YouthSpeakClient({
  tabs,
  posts,
  labels,
}: {
  tabs: { key: string; name: string }[];
  posts: YouthPostCard[];
  labels: {
    all: string;
    viewAll: string;
    showLess: string;
    next: string;
    previous: string;
  };
}) {
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const filtered =
    active === "all" ? posts : posts.filter((p) => p.tab === active);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = showAll
    ? filtered
    : filtered.slice(current * PAGE, current * PAGE + PAGE);
  const chip = (on: boolean) =>
    cn(
      "rounded-full border border-[#135130] px-4 py-1.5 text-[13.5px] font-medium",
      on
        ? "bg-[#135130] text-white"
        : "bg-transparent text-[#135130] hover:bg-[#135130]/5",
    );
  const pick = (key: string) => {
    setActive(key);
    setPage(0);
  };
  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap justify-center gap-x-8 gap-y-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          onClick={() => pick("all")}
          className={chip(active === "all")}
        >
          {labels.all}
        </button>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => pick(t.key)}
            className={chip(active === t.key)}
          >
            {t.name}
          </button>
        ))}
      </div>
      {!showAll && (
        <div className="mt-6 flex justify-end gap-3">
          {current > 0 && (
            <button
              type="button"
              aria-label={labels.previous}
              onClick={() => setPage(current - 1)}
              className="text-[#138808] hover:opacity-70"
            >
              <ArrowRight className="size-5 rotate-180" aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            className="text-[#138808] hover:opacity-70 disabled:opacity-30"
          >
            <ArrowRight className="size-5" aria-hidden />
          </button>
        </div>
      )}
      <ul
        className={cn(
          "grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
          showAll ? "mt-6" : "mt-2",
        )}
      >
        {shown.map((p, i) => {
          const body = (
            <>
              <span className="relative block h-[194px] bg-[#e8e4d9]">
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                  <img
                    src={p.cover}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-[#135130]">
                    <Play className="size-8" aria-hidden />
                  </span>
                )}
                <span
                  className={cn(
                    "absolute bottom-3 left-5 rounded-[3px] px-1.5 text-[16px] leading-6 text-white",
                    BADGE[p.type],
                  )}
                >
                  {p.typeLabel}
                </span>
              </span>
              <span className="block px-[17px] pt-3 pb-4">
                <span className="block text-[16px] leading-6 font-medium text-black">
                  {p.title}
                </span>
                {p.author && (
                  <span className="mt-2 block text-[12px] text-[#414141]">
                    {p.author}
                  </span>
                )}
                {p.date && (
                  <span className="mt-2 block text-[12px] text-[#414141]">
                    {p.date}
                  </span>
                )}
              </span>
            </>
          );
          const cls =
            "block overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.08)]";
          return (
            <li key={`${p.title}-${i}`}>
              {p.href ? (
                <a
                  href={p.href}
                  {...(p.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn(cls, "hover:shadow-md")}
                >
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {filtered.length > PAGE && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
            className="rounded-full bg-[#135130] px-6 py-2.5 text-[14px] font-medium text-white hover:opacity-90"
          >
            {showAll ? labels.showLess : labels.viewAll}
          </button>
        </div>
      )}
    </div>
  );
}
