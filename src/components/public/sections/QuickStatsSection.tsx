import { ClipboardList, Droplet, HardHat, House, School, Sprout, Users, type LucideIcon } from "lucide-react";
import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

interface QuickStatsData {
  items?: { label?: Bilingual; value?: string; icon?: string }[];
}

/** Icon + circle colours in the Figma order (population … ongoing projects). */
const STYLES: { Icon: LucideIcon; ring: string; fg: string }[] = [
  { Icon: Users, ring: "bg-[#e3f1d4]", fg: "text-[#5a9a1f]" },
  { Icon: House, ring: "bg-[#fdeedd]", fg: "text-[#e8890c]" },
  { Icon: Sprout, ring: "bg-[#e3f1d4]", fg: "text-[#3f8f26]" },
  { Icon: Sprout, ring: "bg-[#e3f1d4]", fg: "text-[#3f8f26]" },
  { Icon: ClipboardList, ring: "bg-[#e2edfa]", fg: "text-[#2a6fc4]" },
  { Icon: School, ring: "bg-[#fdeedd]", fg: "text-[#e8890c]" },
  { Icon: Droplet, ring: "bg-[#e2edfa]", fg: "text-[#2a6fc4]" },
  { Icon: HardHat, ring: "bg-[#ece3f5]", fg: "text-[#7a4cb0]" },
];

/** Figma stats strip (375:12316): white rounded card overlapping the hero with coloured icon circles. */
export function QuickStatsSection({ locale, data }: SectionProps) {
  const items = (data as QuickStatsData).items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[69px] lg:px-[62px]">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[20px] bg-white px-6 py-6 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:grid-cols-4 lg:flex lg:justify-around lg:gap-4 lg:px-8">
        {items.map((item, i) => {
          const s = STYLES[i % STYLES.length]!;
          return (
            <div key={i} className="flex flex-col items-center text-center">
              <span aria-hidden className={`flex size-[52px] items-center justify-center rounded-full ${s.ring}`}>
                <s.Icon className={`size-6 ${s.fg}`} />
              </span>
              <dd className="mt-2 text-[22px] leading-[31px] font-bold text-black">{item.value}</dd>
              <dt className="text-[12px] leading-[19px] text-black">{pickText(item.label, locale)}</dt>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
