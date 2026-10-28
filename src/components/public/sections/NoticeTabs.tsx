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
}
export interface NoticeTab {
  key: string;
  label: string;
  items: NoticeRow[];
}

/** Tabbed notice list (Figma 375:12300): blue active underline, dated rows, NEW badge, Download pill. */
export function NoticeTabs({ tabs, downloadLabel, viewAllLabel, viewAllHref, emptyLabel }: { tabs: NoticeTab[]; downloadLabel: string; viewAllLabel: string; viewAllHref?: string; emptyLabel: string }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.15)]">
      <div role="tablist" className="flex flex-wrap border-b border-[#e5e7eb]">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={t.key === current.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "border-b-2 px-5 py-3.5 text-[13px] font-medium",
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
            <li key={i} className="flex items-center gap-4 border-b border-[#eceef2] px-5 py-3.5">
              <div className="w-[64px] shrink-0 border-r border-[#d8dce3] pr-3 text-center">
                <p className="text-[13px] font-bold text-[#1e4aa0]">{n.day}</p>
                <p className="text-[11px] text-[#5b6472]">{n.monthYear}</p>
              </div>
              <p className="flex-1 text-[13px] font-medium text-[#1b2430]">
                {n.title}{" "}
                {n.isNew && <span className="ml-1 rounded-[3px] bg-[#ff2d3d] px-1.5 py-0.5 align-middle text-[9px] font-bold text-white">NEW</span>}
              </p>
              {n.href ? (
                <a href={n.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[#c3cbe0] px-3 py-1.5 text-[11px] text-[#1e4aa0] hover:bg-[#eaf0fb]">
                  <Download className="size-3" aria-hidden /> {downloadLabel}
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[#c3cbe0] px-3 py-1.5 text-[11px] text-[#1e4aa0]">
                  <Download className="size-3" aria-hidden /> {downloadLabel}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {viewAllHref && (
        <div className="bg-[#f6f8fb] px-5 py-3 text-right">
          <a href={viewAllHref} className="text-[13px] font-medium text-[#1e4aa0] hover:underline">
            {viewAllLabel} →
          </a>
        </div>
      )}
    </div>
  );
}
