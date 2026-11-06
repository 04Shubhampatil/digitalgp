import { FigmaIcon, statIconName } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

interface QuickStatsData {
  /** "compact" (Key Projects 375:13869): 49px icon beside a 20px value with the label under it. */
  variant?: "compact";
  items?: { label?: Bilingual; value?: string; icon?: string; unit?: Bilingual; visible?: boolean }[];
}

/** Figma stats strip (375:12316): white rounded card overlapping the hero with the design's round icons. */
export function QuickStatsSection({ locale, data, pageKey }: SectionProps) {
  // `visible: false` hides a tile without deleting it; the icon keeps the tile's original position.
  const items = ((data as QuickStatsData).items ?? []).map((item, i) => ({ item, i })).filter(({ item }) => item.visible !== false);
  if (items.length === 0) return null;
  if ((data as QuickStatsData).variant === "compact") {
    return (
      <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[69px] lg:px-[62px]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[16px] bg-white px-6 py-6 shadow-[0_0_16px_rgba(0,0,0,0.25)] sm:grid-cols-4 lg:flex lg:h-[138px] lg:items-center lg:justify-between lg:gap-2 lg:py-0 lg:pr-3 lg:pl-6">
          {items.map(({ item, i }) => {
            const unit = pickText(item.unit, locale);
            const label = pickText(item.label, locale);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <FigmaIcon name={item.icon ?? statIconName(item.label?.en, i)} width={49} className="shrink-0" />
                <div className="flex flex-col gap-[7px] p-2">
                  <dd className="text-[20px] leading-[27px] text-black">
                    {item.value}
                    {unit && <span className="ml-1 text-[14px]">{unit}</span>}
                  </dd>
                  {/* Figma wraps the three-word labels ("Hectares / Agriculture Area", "Govt. Schemes / Implemented"). */}
                  <dt className={`text-[12px] leading-4 text-black ${label.split(/\s+/).length >= 3 ? "max-w-[100px]" : "whitespace-nowrap"}`}>{label}</dt>
                </div>
              </div>
            );
          })}
        </dl>
      </section>
    );
  }
  return (
    // Home (375:12978): the 138px card overlaps the hero by 69px and the next section starts at the hero's bottom edge,
    // so its cream band runs behind the card's lower half (no white strip).
    <section className={`relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[69px] lg:px-[62px] ${pageKey === "home" ? "lg:-mb-[69px]" : ""}`}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[16px] bg-white px-6 py-6 shadow-[0_0_16px_rgba(0,0,0,0.25)] sm:grid-cols-4 lg:flex lg:justify-around lg:gap-4 lg:px-8 lg:pt-[11px] lg:pb-[22px]">
        {items.map(({ item, i }) => {
          const unit = pickText(item.unit, locale);
          return (
            <div key={i} className="flex flex-col items-center text-center">
              <FigmaIcon name={item.icon ?? statIconName(item.label?.en, i)} width={52} />
              <dd className="mt-[3px] text-[23px] leading-[31px] font-semibold text-black">
                {item.value}
                {/* `unit` follows the value, e.g. "1,243 Hectares" or "91 %". */}
                {unit && <span className="ml-1 text-[15px] font-semibold">{unit}</span>}
              </dd>
              {/* The design keeps every label on one line. */}
              <dt className="text-[13.8px] leading-[19px] whitespace-nowrap text-black">{pickText(item.label, locale)}</dt>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
