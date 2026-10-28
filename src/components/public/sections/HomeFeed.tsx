"use client";

import { ChevronDown, Trophy } from "lucide-react";
import { useState } from "react";

export interface AchievementView {
  title: string;
  body: string;
  completed: string;
  ward?: string;
}

const MEDAL = [
  { ring: "bg-[#fff1d6]", fg: "text-[#f5a500]" },
  { ring: "bg-[#e8eef6]", fg: "text-[#2a5d9f]" },
  { ring: "bg-[#fde7da]", fg: "text-[#d9531e]" },
  { ring: "bg-[#e5f4e2]", fg: "text-[#138808]" },
  { ring: "bg-[#efe6f8]", fg: "text-[#6a1b9a]" },
];

/** "Top Five Achievements of the Ward" card with a ward selector (Figma 375:13333). */
export function AchievementsCard({ heading, selectLabel, allLabel, wards, items }: { heading: string; selectLabel: string; allLabel: string; wards: string[]; items: AchievementView[] }) {
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
          const m = MEDAL[i % MEDAL.length]!;
          return (
            <li key={i} className="flex items-center gap-5 border-b border-black px-5 py-4 last:border-b-0">
              <span aria-hidden className={`flex size-[62px] shrink-0 flex-col items-center justify-center rounded-full ${m.ring} ${m.fg}`}>
                {i < 3 ? (
                  <>
                    <Trophy className="size-6 fill-current" />
                    <span className="text-[14px] leading-none font-bold">{i + 1}</span>
                  </>
                ) : (
                  <span className="text-[30px] leading-none font-bold">{i + 1}</span>
                )}
              </span>
              <div>
                <p className="text-[18px] leading-[24px] font-semibold text-black">{a.title}</p>
                <p className="text-[13px] leading-[24px] text-[#414141]">{a.body}</p>
                <p className="text-[12px] leading-[24px] text-[#414141]">{a.completed}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
