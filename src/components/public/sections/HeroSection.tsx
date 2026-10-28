import Link from "next/link";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

interface HeroData {
  title?: Bilingual;
  subtitle?: Bilingual;
  backgroundImageId?: string;
  cta?: { label?: Bilingual; href?: string };
  /** All hero buttons from the design; falls back to the single `cta` for older content. */
  actions?: { label?: Bilingual; href?: string }[];
}

/** Figma home hero: eyebrow + headline + CTA pills on the left, village photo on the right. */
export function HeroSection({ slug, locale, data }: SectionProps) {
  const d = data as HeroData;
  const title = pickText(d.title, locale);
  const subtitle = pickText(d.subtitle, locale);
  const buttons = (d.actions?.length ? d.actions : d.cta ? [d.cta] : []).filter((b) => b.href && b.label);
  const image = d.backgroundImageId ? publicMediaUrl(slug, d.backgroundImageId) : null;

  return (
    <section className="relative isolate overflow-hidden bg-primary-deep text-white">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served media, no remote-pattern config yet
        <img src={image} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-60" />
      )}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-20 sm:px-6 md:py-28">
        <h1 className="max-w-3xl text-3xl leading-tight font-bold md:text-5xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-base text-white/85 md:text-lg">{subtitle}</p>}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {buttons.map((b, i) => (
              <Link
                key={`${b.href}-${i}`}
                href={b.href ?? "#"}
                className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-cream"
              >
                {pickText(b.label, locale)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
