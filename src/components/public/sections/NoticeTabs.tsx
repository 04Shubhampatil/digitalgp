"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface NoticeRow {
  day: string;
  monthYear: string;
  title: string;
  isNew?: boolean;
  href?: string;
  /** Where the row title goes (the announcements page). */
  titleHref?: string;
}
export interface NoticeTab {
  key: string;
  label: string;
  items: NoticeRow[];
}

/**
 * Tabbed notice list (Figma 375:12300 / home 375:12900): 57px tab bar with 16px labels, 78px dated rows (16px title,
 * 92px date column with a divider), NEW badge, 110×34 Download button, "View All →" strip and a 35px white foot.
 */
export function NoticeTabs({ tabs, downloadLabel, viewAllLabel, viewAllHref, emptyLabel, newLabel }: { tabs: NoticeTab[]; downloadLabel: string; viewAllLabel: string; viewAllHref?: string; emptyLabel: string; newLabel: string }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return (
    <div className="overflow-hidden rounded-[10px] bg-white pb-[35px] shadow-[0_0_20px_rgba(0,0,0,0.2)]">
      <div role="tablist" className="flex flex-wrap border-b border-[#e5e7eb]">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={t.key === current.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "border-b-2 px-[18px] py-[15px] text-[16px] leading-[25px] font-medium",
              t.key === current.key ? "border-[#1e4aa0] bg-[#eaf0fb] text-[#1e4aa0]" : "border-transparent text-[#5b6472] hover:text-[#1e4aa0]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current.items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[#5b6472]">{emptyLabel}</p>
      ) : (
        <ul role="tabpanel">
          {current.items.map((n, i) => (
            <li key={i} className="flex min-h-[78px] items-center gap-[19px] border-b border-[#eceef2] py-[18px] pr-[23px] pl-[18px]">
              <div className="w-[75px] shrink-0 self-start border-r border-[#d8dce3] pr-2 text-center">
                <p className="text-[16px] leading-[21px] font-bold text-[#1e4aa0]">{n.day}</p>
                <p className="text-[13px] leading-[21px] whitespace-nowrap text-[#5b6472]">{n.monthYear}</p>
              </div>
              <p className="flex-1 self-start text-[16px] leading-[21px] font-medium text-[#1b2430]">
                {n.titleHref ? (
                  <a href={n.titleHref} className="hover:text-[#1e4aa0] hover:underline">
                    {n.title}
                  </a>
                ) : (
                  n.title
                )}{" "}
                {n.isNew && <span className="ml-1 rounded-[3px] bg-[#ff2d3d] px-2 py-[3px] align-middle text-[11px] leading-[14px] font-bold text-white">{newLabel}</span>}
              </p>
              {n.href ? (
                <a href={n.href} className="inline-flex h-[34px] w-[110px] shrink-0 items-center justify-center gap-1.5 rounded-[4px] border border-[#c3cbe0] text-[13.5px] font-medium text-[#1e4aa0] hover:bg-[#eaf0fb]">
                  <Download className="size-3" aria-hidden /> {downloadLabel}
                </a>
              ) : (
                <span className="inline-flex h-[34px] w-[110px] shrink-0 items-center justify-center gap-1.5 rounded-[4px] border border-[#c3cbe0] text-[13.5px] font-medium text-[#1e4aa0]">
                  <Download className="size-3" aria-hidden /> {downloadLabel}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {viewAllHref && (
        <div className="bg-[#f6f8fb] px-[23px] py-[13px] text-right">
          <a href={viewAllHref} className="text-[16px] leading-6 font-semibold text-[#1e4aa0] hover:underline">
            {viewAllLabel} →
          </a>
        </div>
      )}
    </div>
  );
}
