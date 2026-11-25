"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface LevelTab {
  level: string;
  label: string;
  /** "{n} Schemes Available" split around the number, so the number can be highlighted. */
  before: string;
  /** null when the number does not appear in the message (then `before` holds all of it). */
  n: number | null;
  after: string;
  /** Picture of the level (design icon or uploaded picture); `fallback` is drawn when there is none. */
  icon?: string;
  fallback: React.ReactNode;
}

/** Id of the Featured Schemes list the tabs filter (see SchemeShowcaseSection). */
export const SCHEME_LIST_ID = "scheme-showcase-list";
export const SCHEME_EMPTY_ID = "scheme-showcase-empty";

/**
 * Central / State / District cells (Figma: one white card, three equal cells; the active one has the green underline).
 * Clicking a cell shows only that level's schemes in "Featured Schemes" below (it starts on the first level with schemes).
 */
export function SchemeLevelTabs({ tabs }: { tabs: LevelTab[] }) {
  // The first level that has schemes is shown from the start (the list below hides the others on the server too, so the
  // underline and the list agree from the first paint).
  const [active, setActive] = useState<string | null>(() => (tabs.find((t) => t.n === null || t.n > 0) ?? tabs[0])?.level ?? null);

  function choose(level: string) {
    if (active === level) return;
    const next = level;
    setActive(next);
    const list = document.getElementById(SCHEME_LIST_ID);
    if (!list) return;
    let shown = 0;
    list.querySelectorAll<HTMLElement>(":scope > li[data-level]").forEach((li) => {
      const on = !next || li.dataset.level === next;
      li.style.display = on ? "" : "none";
      if (on) shown++;
    });
    const empty = document.getElementById(SCHEME_EMPTY_ID);
    if (empty) empty.hidden = shown > 0;
  }

  return (
    <ul className="grid overflow-hidden rounded-[16px] bg-white shadow-[0_0_16px_rgba(0,0,0,0.18)] md:grid-cols-3">
      {tabs.map((t, i) => {
        const underlined = active === t.level;
        return (
          <li key={t.level + i} className="relative">
            <button
              type="button"
              aria-pressed={active === t.level}
              onClick={() => choose(t.level)}
              className="relative flex h-[110px] w-full cursor-pointer items-center justify-center gap-[34px] text-left transition-colors hover:bg-[#135130]/[0.04] focus-visible:bg-[#135130]/[0.04] focus-visible:outline-none md:h-[138px]"
            >
              {t.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- static design asset / uploaded picture
                <img src={t.icon} alt="" width={75} height={79} className="h-[79px] w-[75px] shrink-0" />
              ) : (
                t.fallback
              )}
              <span className="block leading-[19px]">
                <span className="block text-[14px] font-bold whitespace-nowrap text-black">{t.label}</span>
                <span className="mt-2 block text-[14px] whitespace-nowrap text-black">
                  {t.before}
                  {t.n !== null && <span className="font-semibold text-[#135130]">{t.n}</span>}
                  {t.after}
                </span>
              </span>
              <span aria-hidden className={cn("absolute bottom-0 left-0 h-[7px] bg-[#135130] transition-[width] duration-200", underlined ? "w-[93%]" : "w-0")} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
