import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

interface QuickStatsData {
  items?: { label?: Bilingual; value?: string; icon?: string }[];
}

/** Figma stats strip: rounded chips under the hero (population, households, literacy …). */
export function QuickStatsSection({ locale, data }: SectionProps) {
  const items = (data as QuickStatsData).items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-sm sm:grid-cols-4 lg:grid-cols-8">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center bg-surface px-3 py-4 text-center">
            <dd className="text-xl font-bold text-ink">{item.value}</dd>
            <dt className="mt-1 text-[11px] text-muted">{pickText(item.label, locale)}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
