import { Factory, Landmark, MapPin, Sprout } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";

type Tone = "orange" | "navy" | "green";

interface AboutCardsData {
  heading?: Bilingual;
  subheading?: Bilingual;
  cards?: { title?: Bilingual; body?: Bilingual; tone?: Tone }[];
  address?: Bilingual;
  mapUrl?: string;
  readMore?: { label?: Bilingual; href?: string };
}

/** Colours and icons per card tone (Figma: #ff9933, #000080, #138808 with matching icon circles). */
const TONES: Record<Tone, { text: string; border: string; circle: string; Icon: typeof Landmark }> = {
  orange: { text: "text-[#ff9933]", border: "border-[#ff9933]", circle: "bg-[#ff9933]/15 text-[#ff9933]", Icon: Landmark },
  navy: { text: "text-[#000080]", border: "border-[#000080]", circle: "bg-[#000080]/10 text-[#000080]", Icon: Factory },
  green: { text: "text-[#138808]", border: "border-[#138808]", circle: "bg-[#138808]/10 text-[#138808]", Icon: Sprout },
};

/** Static Figma photos used until the Gram Panchayat uploads its own gallery. */
const PHOTOS = { road: "/images/figma/about-road.png", aerial: "/images/figma/about-aerial.png", map: "/images/figma/about-map.png" };

/**
 * Home "About the village" block (Figma 375:12383 + 375:12671): centred heading with the village
 * name in green, three icon cards on the left, photo + map composition on the right, Read More pill.
 * Frontend-only placeholder section: the backend `welcome` section has no card structure yet.
 */
export async function AboutCardsSection({ slug, locale, data, tenantName }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as AboutCardsData;
  const cards = d.cards ?? [];
  if (cards.length === 0) return null;
  const readMoreLabel = pickText(d.readMore?.label, locale);

  return (
    <section className="bg-cream py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-[18px] px-4 sm:px-8 lg:px-[60px]">
        <div className="max-w-[1094px] text-center">
          <h2 className="text-[30px] leading-[45px] font-semibold text-black">
            {pickText(d.heading, locale)} {tenantName && <span className="text-[#138808]">{tenantName}</span>}
          </h2>
          {pickText(d.subheading, locale) && <p className="mt-4 text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>}
        </div>

        <div className="grid w-full gap-[21px] lg:grid-cols-[427px_minmax(0,1fr)]">
          <ul className="flex flex-col gap-5">
            {cards.map((c, i) => {
              const tone = TONES[c.tone ?? "green"];
              return (
                <li key={i} className="flex flex-col gap-[9px] rounded-[15px] bg-white px-[17px] py-4 shadow-[0_0_23px_2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-center gap-4">
                    <span aria-hidden className={`flex size-16 shrink-0 items-center justify-center rounded-full ${tone.circle}`}>
                      <tone.Icon className="size-7" />
                    </span>
                    <h3 className={`border-b border-dashed py-2.5 text-[18px] leading-[22px] font-semibold whitespace-nowrap ${tone.text} ${tone.border}`}>{pickText(c.title, locale)}</h3>
                  </div>
                  <p className="text-center text-[13px] leading-[22px] text-black">{pickText(c.body, locale)}</p>
                </li>
              );
            })}
          </ul>

          <div className="grid gap-5">
            {/* eslint-disable @next/next/no-img-element -- static design assets */}
            <div className="h-[260px] overflow-hidden rounded-[10px] bg-white sm:h-[383px]">
              <img src={PHOTOS.road} alt="" className="size-full object-cover" loading="lazy" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-[260px] overflow-hidden rounded-[10px] bg-white sm:h-[383px]">
                <img src={PHOTOS.aerial} alt="" className="size-full object-cover" loading="lazy" />
              </div>
              <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-[#ff9933] sm:h-[383px]">
                <img src={PHOTOS.map} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                {d.mapUrl && (
                  <a href={d.mapUrl} target="_blank" rel="noopener" className="absolute top-3.5 right-4 inline-flex items-center gap-1.5 rounded-full bg-[#d9d9d9] px-4 py-1.5 text-[11.5px] font-medium text-black">
                    <MapPin className="size-4 text-[#ea4335]" aria-hidden /> {t("openInMaps")}
                  </a>
                )}
                {pickText(d.address, locale) && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 rounded-t-[15px] bg-cream/90 px-5 py-6">
                    <MapPin className="size-8 shrink-0 text-[#ea4335]" aria-hidden />
                    <p className="text-[11.5px] leading-5 font-medium text-black">{pickText(d.address, locale)}</p>
                  </div>
                )}
              </div>
            </div>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>

        {readMoreLabel && d.readMore?.href && (
          <Link href={resolveHref(d.readMore.href, slug)} className="mt-2 inline-flex rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90">
            {readMoreLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
