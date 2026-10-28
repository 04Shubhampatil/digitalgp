import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";

interface HeroData {
  title?: Bilingual;
  subtitle?: Bilingual;
  backgroundImageId?: string;
  cta?: { label?: Bilingual; href?: string };
  /** All hero buttons from the design; falls back to the single `cta` for older content. */
  actions?: { label?: Bilingual; href?: string }[];
}

/** Placeholder photo from the Figma design; replaced by `backgroundImageId` once the GP uploads one. */
const FIGMA_HERO_IMAGE = "/images/figma/home-hero.png";

/**
 * Figma home hero (375:12281): cream background, orange eyebrow, 32px heading, paragraph and
 * pill buttons (first filled, others outlined) on the left; village photo on the right.
 */
export async function HeroSection({ slug, locale, data, tenantName }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as HeroData;
  const title = pickText(d.title, locale);
  const subtitle = pickText(d.subtitle, locale);
  const buttons = (d.actions?.length ? d.actions : d.cta ? [d.cta] : []).filter((b) => b.href && b.label);
  const image = d.backgroundImageId ? publicMediaUrl(slug, d.backgroundImageId) : FIGMA_HERO_IMAGE;

  return (
    <section className="overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-[62px]">
        <div className="flex flex-col gap-10 py-12 lg:py-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-8">
              {tenantName && <p className="max-w-[431px] text-[22px] leading-snug font-semibold text-[#ea7f14] uppercase">{t("welcomeTo", { name: tenantName })}</p>}
              <h1 className="max-w-[547px] text-[32px] leading-[50px] font-bold text-black">{title}</h1>
            </div>
            {subtitle && <p className="max-w-[491px] text-[15px] leading-[25px] text-[#414141]">{subtitle}</p>}
          </div>
          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {buttons.map((b, i) => (
                <Link
                  key={`${b.href}-${i}`}
                  href={resolveHref(b.href ?? "#", slug)}
                  className={
                    i === 0
                      ? "inline-flex rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-medium whitespace-nowrap text-white hover:opacity-90"
                      : "inline-flex rounded-full border-[0.6px] border-[#135130] px-4 py-2 text-[13.5px] whitespace-nowrap text-[#135130] hover:bg-[#135130]/5"
                  }
                >
                  {pickText(b.label, locale)}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="relative h-[300px] sm:h-[420px] lg:h-[539px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset / backend-served media */}
          <img src={image} alt="" className="absolute inset-0 size-full object-cover object-right" />
        </div>
      </div>
    </section>
  );
}
