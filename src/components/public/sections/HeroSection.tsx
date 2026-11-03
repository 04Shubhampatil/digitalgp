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
 * Figma home hero (375:12878): cream background; a 444px column with the 22px welcome line, the 30px/45px semibold
 * heading and pill buttons (first filled, others outlined) 40px below; the 933×539 village photo on the right.
 */
export async function HeroSection({ slug, locale, data, tenantName }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as HeroData;
  let eyebrow = tenantName ? t("welcomeTo", { name: tenantName }) : "";
  let title = pickText(d.title, locale);
  let subtitle = pickText(d.subtitle, locale);
  // When the editor typed the welcome line as the title, it is the design's eyebrow and the subtitle is the heading.
  if (/^(welcome|स्वागत)/i.test(title) || /स्वागत/.test(title)) {
    eyebrow = title;
    title = subtitle;
    subtitle = "";
  }
  const buttons = (d.actions?.length ? d.actions : d.cta ? [d.cta] : []).filter((b) => b.href && b.label);
  const image = d.backgroundImageId ? publicMediaUrl(slug, d.backgroundImageId) : FIGMA_HERO_IMAGE;

  return (
    <section className="overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[444px_minmax(0,1fr)] lg:gap-0 lg:px-[62px]">
        <div className="flex flex-col gap-10 py-12 lg:py-0">
          <div className="flex flex-col gap-8">
            {eyebrow && <p className="text-[22px] leading-normal font-medium whitespace-nowrap text-black">{eyebrow}</p>}
            <h1 className="max-w-[444px] text-[30px] leading-[45px] font-semibold text-black">{title}</h1>
            {subtitle && <p className="max-w-[444px] text-[15px] leading-[25px] text-[#414141]">{subtitle}</p>}
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
