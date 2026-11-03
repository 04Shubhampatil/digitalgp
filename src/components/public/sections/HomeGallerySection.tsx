"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";

export interface HomeGalleryProps {
  slug: string;
  locale: "en" | "mr";
  data: { heading?: Bilingual; photos?: { imageId?: string; imageUrl?: string; caption?: Bilingual }[] };
}

/**
 * Figma home "Gallery" (375:12975): centred heading, arrow buttons at the two ends and a row of 280px-tall
 * photos (three across at 1320px). The arrows scroll the row by one photo.
 */
export function HomeGallerySection({ slug, locale, data }: HomeGalleryProps) {
  const row = useRef<HTMLUListElement>(null);
  const photos = (data.photos ?? []).map((p) => ({ src: p.imageId ? publicMediaUrl(slug, p.imageId) : p.imageUrl, caption: pickText(p.caption, locale) })).filter((p) => p.src);
  if (photos.length === 0) return null;
  const step = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 420) + 24), behavior: "smooth" });
  };

  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(data.heading, locale)}</h2>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="rounded-full p-1 text-[#8a8a8a] hover:text-black">
            <ArrowLeft className="size-6" aria-hidden />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="rounded-full p-1 text-black hover:text-primary-alt">
            <ArrowRight className="size-6" aria-hidden />
          </button>
        </div>
        <ul ref={row} className="mt-2 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => (
            <li key={i} className="h-[220px] w-[85%] shrink-0 snap-start overflow-hidden rounded-[10px] bg-white sm:h-[280px] sm:w-[calc((100%-48px)/3)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- backend media or static design asset */}
              <img src={p.src} alt={p.caption} className="size-full object-cover" loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
