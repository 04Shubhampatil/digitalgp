import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import { AchievementsCard } from "./HomeFeed";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;

/** `achievements`: "Top Five Achievements of the Ward" (Figma 375:13333). */
export async function AchievementsSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { heading?: B; wards?: B[]; items?: { title?: B; body?: B; completed?: B; ward?: B }[] };
  const items = (d.items ?? []).map((a) => ({ title: pickText(a.title, locale), body: pickText(a.body, locale), completed: pickText(a.completed, locale), ward: pickText(a.ward, locale) || undefined }));
  if (items.length === 0) return null;
  return <AchievementsCard heading={pickText(d.heading, locale)} selectLabel={t("selectWard")} allLabel={t("allWards")} wards={(d.wards ?? []).map((w) => pickText(w, locale))} items={items} />;
}

const CHIP: Record<string, string> = {
  completed: "bg-[#dcefdc] text-[#135130]",
  event: "bg-[#dce9ff] text-[#1a62e0]",
  ongoing: "bg-[#fff0dc] text-[#f5871f]",
};

/** `whats-new`: "What's New This Week?" list with thumbnails and status chips (Figma 375:13391). */
export async function WhatsNewSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { heading?: B; viewAll?: { label?: B; href?: string }; items?: { title?: B; date?: B; status?: "completed" | "event" | "ongoing"; imageUrl?: string }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-black/15 bg-white p-3">
      <div className="flex items-center justify-between px-2 py-1.5">
        <h2 className="text-[20px] leading-[27px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        {d.viewAll?.href && (
          <Link href={resolveHref(d.viewAll.href, slug)} className="rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[13.5px] text-[#135130] hover:bg-[#135130]/5">
            {pickText(d.viewAll.label, locale) || t("viewAll")}
          </Link>
        )}
      </div>
      <ul className="mt-2 rounded-[10px] border border-black/15">
        {items.map((n, i) => (
          <li key={i} className="flex items-center gap-4 border-b border-black px-3 py-3 last:border-b-0">
            {n.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- static design asset / backend media
              <img src={n.imageUrl} alt="" width={92} height={68} className="h-[68px] w-[92px] shrink-0 rounded-[10px] object-cover" loading="lazy" />
            )}
            <div>
              <p className="text-[16px] leading-[24px] font-semibold text-black">{pickText(n.title, locale)}</p>
              <p className="mt-2 flex items-center gap-4 text-[12px] text-black">
                {pickText(n.date, locale)}
                {n.status && <span className={`rounded-full px-3 py-1 text-[12px] ${CHIP[n.status]}`}>{t(`status.${n.status}`)}</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
