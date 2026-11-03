"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FigmaIcon } from "@/components/ui/FigmaIcon";

export interface AchievementView {
  title: string;
  body: string;
  completed: string;
  ward?: string;
}

/** "Top Five Achievements of the Ward" card with a ward selector (Figma 375:13333). */
/** A row that is a link when a target exists, else a plain block. */
function Row({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={`${className} hover:bg-[#f4faf6]`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function AchievementsCard({ heading, selectLabel, allLabel, wards, items, href }: { heading: string; selectLabel: string; allLabel: string; wards: string[]; items: AchievementView[]; /** Where an achievement row leads (the progress page). */ href?: string }) {
  const [ward, setWard] = useState("");
  const shown = items.filter((a) => !ward || !a.ward || a.ward === ward).slice(0, 5);
  return (
    <div className="rounded-[10px] border border-black/15 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1.5">
        <h2 className="text-[20px] leading-[27px] font-semibold text-black">{heading}</h2>
        <label className="flex items-center gap-3 text-[12px] text-[#414141]">
          {selectLabel}
          <span className="relative inline-flex items-center rounded-[4px] border border-[#135130] text-[12px] font-medium text-[#135130]">
            <select value={ward} onChange={(e) => setWard(e.target.value)} className="appearance-none bg-transparent py-1.5 pr-8 pl-3 outline-none">
              <option value="">{allLabel}</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-4" aria-hidden />
          </span>
        </label>
      </div>
      <ol className="mt-2 rounded-[10px] border border-black/15">
        {shown.map((a, i) => {
          return (
            <li key={i} className="border-b border-black last:border-b-0">
              <Row href={href} className="flex items-center gap-5 px-5 py-4">
                <FigmaIcon name={`medal-${(i % 5) + 1}`} width={62} />
                <div>
                  <p className="text-[18px] leading-[24px] font-semibold text-black">{a.title}</p>
                  <p className="text-[13px] leading-[24px] text-[#414141]">{a.body}</p>
                  <p className="text-[12px] leading-[24px] text-[#414141]">{a.completed}</p>
                </div>
              </Row>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
