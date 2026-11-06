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
const TONES: Record<Tone, { text: string; border: string; icon: string }> = {
  orange: { text: "text-[#ff9933]", border: "border-[#ff9933]", icon: "/images/figma/pages/home-about-ic-vision.png" },
  navy: { text: "text-[#000080]", border: "border-[#000080]", icon: "/images/figma/pages/home-about-ic-industry.png" },
  green: { text: "text-[#138808]", border: "border-[#138808]", icon: "/images/figma/pages/home-about-ic-nature.png" },
};

/** Static Figma photos used until the Gram Panchayat uploads its own gallery. */
const PHOTOS = {
  // Figma crops the road photo to the temple and lane (375:13460), without the welcome board on the left.
  road: "/images/figma/pages/home-about-road.png",
  aerial: "/images/figma/about-aerial.png",
  map: "/images/figma/about-map.png",
  pin: "/images/figma/pages/home-about-pin.png",
  maps: "/images/figma/pages/home-about-maps.png",
};

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
  const address = pickText(d.address, locale);
  // The design always shows "Open in Maps"; without a configured link it searches the address on Google Maps.
  const mapHref = d.mapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");

  return (
    <section className="bg-cream py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-[18px] px-4 sm:px-8 lg:px-[60px]">
        <div className="max-w-[1094px] text-center">
          <h2 className="text-[30px] leading-[45px] font-semibold text-black">
            {(() => {
              // The village name is green (Figma "About Savardari"); keep it in place when the heading already contains it.
              const heading = pickText(d.heading, locale);
              if (!tenantName) return heading;
              const at = heading.indexOf(tenantName);
              if (at < 0)
                return (
                  <>
                    {heading} <span className="text-[#138808]">{tenantName}</span>
                  </>
                );
              return (
                <>
                  {heading.slice(0, at)}
                  <span className="text-[#138808]">{tenantName}</span>
                  {heading.slice(at + tenantName.length)}
                </>
              );
            })()}
          </h2>
          {pickText(d.subheading, locale) && <p className="mt-4 text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>}
        </div>

        {/* Figma 375:13049: 427px card column, 21px gap, then the 873px photo area with the 805×782 collage centred in it. */}
        <div className="grid w-full items-center gap-[21px] lg:grid-cols-[427px_minmax(0,1fr)]">
          <ul className="flex flex-col gap-5">
            {cards.map((c, i) => {
              const tone = TONES[c.tone ?? "green"];
              return (
                <li key={i} className="flex flex-col gap-[9px] rounded-[15px] bg-white px-[17px] py-4 shadow-[0_0_23px_2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static design icon */}
                    <img src={tone.icon} alt="" width={64} height={64} className="size-16 shrink-0" />
                    <h3 className={`border-b border-dashed py-2.5 text-[18px] leading-[22px] font-semibold whitespace-nowrap ${tone.text} ${tone.border}`}>{pickText(c.title, locale)}</h3>
                  </div>
                  {/* Figma: the first card's paragraph is left-aligned, the other two are centred. */}
                  <p className={`text-[13px] leading-[22px] text-black ${i === 0 ? "text-left" : "text-center"}`}>{pickText(c.body, locale)}</p>
                </li>
              );
            })}
          </ul>

          <div className="grid gap-4 lg:px-[34px] lg:py-[22px]">
            {/* eslint-disable @next/next/no-img-element -- static design assets */}
            <div className="h-[260px] overflow-hidden rounded-[10px] bg-white sm:h-[383px]">
              <img src={PHOTOS.road} alt="" className="size-full object-cover" loading="lazy" />
            </div>
            <div className="grid gap-4 sm:grid-cols-[390fr_393fr] lg:gap-[22px]">
              <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-white sm:h-[383px]">
                {/* Figma 375:13445: photo at full width, 181% high, shifted up 44%. */}
                <img src={PHOTOS.aerial} alt="" className="absolute top-[-44.42%] left-0 h-[181.23%] w-full max-w-none" loading="lazy" />
              </div>
              <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-[#ff9933] sm:h-[383px]">
                <img src={PHOTOS.map} alt="" className="absolute top-[-3.13%] left-[-41.87%] h-[103.13%] w-[193.13%] max-w-none object-cover" loading="lazy" />
                {mapHref && (
                  <a href={mapHref} target="_blank" rel="noopener" className="absolute top-3.5 right-[19px] inline-flex h-[30px] w-[147px] items-center gap-[7px] rounded-full bg-[#d9d9d9] pl-[19px] text-[11.5px] leading-[20.7px] font-medium text-black">
                    <img src={PHOTOS.maps} alt="" width={24} height={24} className="size-6" /> {t("openInMaps")}
                  </a>
                )}
                {address && (
                  <div className="absolute inset-x-0 bottom-0 flex h-[100px] items-start justify-center rounded-t-[15px] bg-[rgba(252,247,238,0.88)] pt-[22px] pr-[43px]">
                    <div className="flex w-[281px] items-center gap-4">
                      <img src={PHOTOS.pin} alt="" width={24} height={35} className="h-[35px] w-6 shrink-0 mx-[9px]" />
                      <p className="text-[11.5px] leading-[20.7px] font-medium text-black">{address}</p>
                    </div>
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
