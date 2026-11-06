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
    // Figma 375:13333: 649×549 card, 623px list box 55px from the top, 93px rows split by 599px rules.
    <div className="h-full rounded-[10px] border border-[#414141]/20 bg-white px-[13px] pt-[11px] pb-[21px]">
      <div className="flex min-h-[34px] flex-wrap items-center justify-between gap-3 pl-[9px] pr-[10px]">
        <h2 className="text-[20px] leading-[27px] font-semibold text-black">{heading}</h2>
        <label className="flex items-center gap-[19px] text-[12px] leading-6 font-medium text-[#414141]">
          {selectLabel}
          <span className="relative inline-flex items-center rounded-[6px] border-[0.6px] border-[#135130] text-[12px] font-normal text-[#135130]">
            <select value={ward} onChange={(e) => setWard(e.target.value)} className="appearance-none bg-transparent py-2 pr-[34px] pl-4 leading-[normal] outline-none">
              <option value="">{allLabel}</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 size-3" aria-hidden />
          </span>
        </label>
      </div>
      <ol className="mt-[10px] rounded-[10px] border border-[#414141]/20 px-3">
        {shown.map((a, i) => {
          return (
            <li key={i} className="border-b border-black last:border-b-0">
              <Row href={href} className="flex min-h-[93px] items-center gap-4 py-[6px]">
                <span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center">
                  <FigmaIcon name={`medal-${(i % 5) + 1}`} width={62} />
                </span>
                <div>
                  <p className="text-[16px] leading-[24px] font-semibold text-black">{a.title}</p>
                  <p className="text-[12px] leading-[24px] font-medium text-[#414141]">{a.body}</p>
                  <p className="text-[12px] leading-[24px] font-medium text-[#414141]">{a.completed}</p>
                </div>
              </Row>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
