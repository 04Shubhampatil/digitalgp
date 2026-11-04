"use client";

import { HandHeart, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { SELECT_EVENT } from "../MailtoForm";

/** Figma "Become a Volunteer" icon circles: green, purple, orange, blue (repeating). */
const TONES: { icon: LucideIcon; fg: string; bg: string }[] = [
  { icon: UserRound, fg: "#1f7a2e", bg: "#e7f3e8" },
  { icon: Users, fg: "#7b2cbf", bg: "#f1e8fb" },
  { icon: UsersRound, fg: "#f26b1d", bg: "#fde9dc" },
  { icon: HandHeart, fg: "#1a62e0", bg: "#e6effc" },
];

/**
 * Volunteer category cards with a radio circle top-right. Choosing one preselects the category in the
 * registration form (via SELECT_EVENT) and scrolls to the form.
 */
export function VolunteerCardsClient({ items, field }: { items: { title: string; description: string; icon?: string }[]; field: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  function choose(title: string) {
    setPicked(title);
    window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: { field, value: title } }));
    document.getElementById("volunteer-registration")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <ul role="radiogroup" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c, i) => {
        const tone = TONES[i % TONES.length]!;
        const on = picked === c.title;
        return (
          <li key={i}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(c.title)}
              className={`relative flex h-full w-full flex-col items-center rounded-[10px] bg-white px-6 pt-6 pb-7 text-center shadow-[0_0_10px_rgba(0,0,0,0.14)] transition hover:shadow-md ${on ? "ring-2 ring-[#135130]" : ""}`}
            >
              <span aria-hidden className={`absolute top-5 right-5 flex size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-[#135130]" : "border-[#9a9a9a]"}`}>
                {on && <span className="size-2.5 rounded-full bg-[#135130]" />}
              </span>
              <span className="flex size-[88px] items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: tone.bg, color: tone.fg }}>
                {c.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                  <img src={c.icon} alt="" className="size-full object-cover" />
                ) : (
                  <tone.icon aria-hidden className="size-11" fill="currentColor" strokeWidth={1.5} />
                )}
              </span>
              <span className="mt-4 text-[18px] font-semibold text-black">{c.title}</span>
              {c.description && <span className="mt-3 text-[16px] leading-7 text-[#414141]">{c.description}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
