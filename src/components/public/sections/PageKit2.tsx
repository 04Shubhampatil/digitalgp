import { ArrowRight, Brush, Cog, Droplets, FileText, Hammer, Handshake, Layers, Megaphone, Briefcase, Scissors, Ellipsis, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { MediaTabs, type MediaCard } from "./KitClient";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

/** More reusable inner-page blocks (Employment, Education, Gallery …), driven by section `data`. */

/** Icon + colour per Employment stat card (document, briefcase, handshake, megaphone). */
const STAT_ICONS: { Icon: LucideIcon; fg: string; ring: string }[] = [
  { Icon: FileText, fg: "text-[#135130]", ring: "bg-[#e9f4e9]" },
  { Icon: Briefcase, fg: "text-[#5b2a9a]", ring: "bg-[#efe6f8]" },
  { Icon: Handshake, fg: "text-[#1a62e0]", ring: "bg-[#e2edfa]" },
  { Icon: Megaphone, fg: "text-[#f5871f]", ring: "bg-[#fdeedd]" },
];

/** `stat-cards`: large number cards with a round icon (Employment "Active job openings" …). */
export function StatCardsSection({ locale, data }: SectionProps) {
  const d = data as { items?: { value?: string; label?: B; caption?: B }[] };
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(d.items ?? []).map((it, i) => {
            const { Icon, fg, ring } = STAT_ICONS[i % STAT_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[288px] flex-col items-center rounded-[10px] bg-white px-6 pt-[21px] pb-6 text-center shadow-[0_0_14px_rgba(0,0,0,0.2)]">
                <span aria-hidden className={`flex size-[91px] items-center justify-center rounded-full ${ring} ${fg}`}>
                  <Icon className="size-10" strokeWidth={1.7} />
                </span>
                <p className="mt-3 text-[45px] leading-[54px] font-bold text-[#135130]">{it.value}</p>
                <p className="mt-2 text-[20px] leading-[27px] font-semibold text-black">{pickText(it.label, locale)}</p>
                <p className="mt-1 text-[16px] text-[#414141]">{pickText(it.caption, locale)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const TILE_ICONS: LucideIcon[] = [Zap, Droplets, Hammer, Scissors, Cog, Layers, Brush, Ellipsis];

/** `tile-grid`: heading + 4-column grid of icon tiles with a count caption, optional action. */
export function TileGridSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; subheading?: B; items?: { label?: B; caption?: B }[]; action?: Btn };
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <p className="mt-1 text-center text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>
        <ul className="mx-auto mt-6 grid max-w-[760px] grid-cols-2 gap-4 sm:grid-cols-4">
          {(d.items ?? []).map((it, i) => {
            const Icon = TILE_ICONS[i % TILE_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[201px] flex-col items-center rounded-[10px] border border-black/15 bg-white px-3 py-6 text-center shadow-[0_0_10px_rgba(0,0,0,0.12)]">
                <span aria-hidden className="flex size-[85px] items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]">
                  <Icon className="size-9" />
                </span>
                <p className="mt-4 text-[18px] leading-[34px] font-bold text-black">{pickText(it.label, locale)}</p>
                <p className="text-[14px] text-[#414141]">{pickText(it.caption, locale)}</p>
              </li>
            );
          })}
        </ul>
        {d.action?.href && (
          <div className="mt-6 flex justify-center">
            <Link href={resolveHref(d.action.href, slug)} className="inline-flex rounded-full border border-[#135130] bg-[#135130] px-5 py-2.5 text-[14.6px] font-semibold text-white hover:opacity-90">
              {pickText(d.action.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

const LINK_ICONS = ["edu-scholarship", "edu-skill", "edu-exams", "edu-internship", "edu-clubs"];

/** `link-cards`: icon + title + description + "Explore Now" cards (Education schemes & opportunities). */
export function LinkCardsSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; items?: { title?: B; body?: B; cta?: B; href?: string }[] };
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {(d.items ?? []).map((it, i) => {
            const icon = LINK_ICONS[i % LINK_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[286px] flex-col rounded-[10px] bg-white px-6 py-6 shadow-[0_0_14px_rgba(0,0,0,0.2)]">
                <FigmaIcon name={icon} width={64} />
                <h3 className="mt-6 text-[18px] leading-[22px] font-bold text-black">{pickText(it.title, locale)}</h3>
                <p className="mt-3 text-[14px] leading-[22px] text-[#414141]">{pickText(it.body, locale)}</p>
                <Link href={resolveHref(it.href ?? "#", slug)} className="mt-auto inline-flex items-center gap-2 pt-4 text-[16px] font-medium text-[#135130] hover:underline">
                  {pickText(it.cta, locale)} <ArrowRight className="size-5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** `media-cards`: heading + category tabs + photo / video / blog cards. */
export async function MediaCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    heading?: B;
    tabs?: { key: string; label: B }[];
    items?: { category?: string; title?: B; meta?: B; imageUrl?: string; kind?: "photo" | "play" | "none" }[];
    action?: Btn;
  };
  const tabs = (d.tabs ?? []).map((x) => ({ key: x.key, label: pickText(x.label, locale) }));
  const items: MediaCard[] = (d.items ?? []).map((m) => ({ category: m.category, title: pickText(m.title, locale), meta: pickText(m.meta, locale) || undefined, imageUrl: m.imageUrl, kind: m.kind }));
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {pickText(d.heading, locale) && <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>}
        <MediaTabs tabs={tabs} items={items} emptyLabel={t("noContent")} />
        {d.action?.href && (
          <div className="mt-8 flex justify-center">
            <Link href={resolveHref(d.action.href, slug)} className="inline-flex rounded-full border-[0.6px] border-[#135130] px-6 py-2 text-[14px] text-[#135130] hover:bg-[#135130]/5">
              {pickText(d.action.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/** `video-feature`: large thumbnail with play button on the left, description and button on the right. */
export function VideoFeatureSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; title?: B; body?: B; duration?: B; published?: B; imageUrl?: string; action?: Btn };
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <div className="grid items-center gap-8 lg:grid-cols-[691px_minmax(0,1fr)]">
          <div className="relative h-[240px] overflow-hidden rounded-[10px] bg-[#e8e4d9]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
            <img src={d.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
            <span aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full border-4 border-white/70 bg-black/30 text-white">▶</span>
            </span>
          </div>
          <div>
            <h3 className="text-[24px] leading-[27px] font-bold text-black">{pickText(d.title, locale)}</h3>
            <p className="mt-4 max-w-[384px] text-[15px] leading-[23px] text-[#414141]">{pickText(d.body, locale)}</p>
            <p className="mt-6 flex flex-wrap gap-8 text-[14px] text-[#414141]">
              <span>{pickText(d.duration, locale)}</span>
              <span>{pickText(d.published, locale)}</span>
            </p>
            {d.action?.href && (
              <Link href={resolveHref(d.action.href, slug)} className="mt-6 inline-flex items-center gap-3 rounded-[8px] bg-[#135130] px-6 py-2.5 text-[15px] font-medium text-white shadow hover:opacity-90">
                {pickText(d.action.label, locale)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
