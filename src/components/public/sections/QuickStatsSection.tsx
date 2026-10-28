import { FigmaIcon, statIconName } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

interface QuickStatsData {
  items?: { label?: Bilingual; value?: string; icon?: string }[];
}

/** Figma stats strip (375:12316): white rounded card overlapping the hero with the design's round icons. */
export function QuickStatsSection({ locale, data }: SectionProps) {
  const items = (data as QuickStatsData).items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[69px] lg:px-[62px]">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[20px] bg-white px-6 py-6 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:grid-cols-4 lg:flex lg:justify-around lg:gap-4 lg:px-8">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <FigmaIcon name={item.icon ?? statIconName(item.label?.en, i)} width={56} />
            <dd className="mt-2 text-[22px] leading-[31px] font-bold text-black">{item.value}</dd>
            <dt className="max-w-[110px] text-[12px] leading-[19px] text-black">{pickText(item.label, locale)}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
