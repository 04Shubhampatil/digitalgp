"use client";

import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";

export interface HomeGalleryProps {
  slug: string;
  locale: "en" | "mr";
  data: {
    heading?: Bilingual;
    photos?: { imageId?: string; imageUrl?: string; caption?: Bilingual }[];
    /** "View all" target (defaults to the website's gallery page). */
    viewAll?: { label?: Bilingual; href?: string };
  };
}

const VISIBLE = 3;

/**
 * Figma home "Gallery" (375:12975): centred heading, arrow buttons at the two ends and a row of 280px-tall photos
 * (three across at 1320px). The arrows move the row by one photo and wrap around; clicking a photo opens it full
 * size with previous / next and Escape to close.
 */
export function HomeGallerySection({ slug, locale, data }: HomeGalleryProps) {
  const photos = (data.photos ?? [])
    .map((p) => {
      const src = p.imageId ? (p.imageId.startsWith("/") ? p.imageId : publicMediaUrl(slug, p.imageId)) : p.imageUrl;
      return { src, caption: pickText(p.caption, locale) };
    })
    .filter((p): p is { src: string; caption: string } => !!p.src);
  const [start, setStart] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const count = photos.length;

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") setZoom((z) => (z === null ? z : (z + 1) % count));
      if (e.key === "ArrowLeft") setZoom((z) => (z === null ? z : (z - 1 + count) % count));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom, count]);

  if (count === 0) return null;
  const canSlide = count > 1;
  const step = (dir: 1 | -1) => setStart((s) => (s + dir + count) % count);
  // The visible window wraps around the list, so the arrows always move it.
  const shown = Array.from({ length: Math.min(VISIBLE, count) }, (_, k) => (start + k) % count);
  const galleryHref = data.viewAll?.href ?? `/${slug}/gallery`;
  const current = zoom === null ? null : photos[zoom];

  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">
          <Link href={galleryHref} className="hover:text-primary-alt">
            {pickText(data.heading, locale)}
          </Link>
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!canSlide}
            aria-label={locale === "mr" ? "मागील" : "Previous"}
            className="rounded-full p-1 text-[#8a8a8a] hover:text-black disabled:opacity-40"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!canSlide}
            aria-label={locale === "mr" ? "पुढील" : "Next"}
            className="rounded-full p-1 text-black hover:text-primary-alt disabled:opacity-40"
          >
            <ArrowRight className="size-6" aria-hidden />
          </button>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-3" aria-live="polite">
          {shown.map((idx, k) => {
            const p = photos[idx]!;
            return (
              <li key={`${idx}-${k}`} className={`h-[220px] overflow-hidden rounded-[10px] bg-white sm:h-[280px] ${k > 0 ? "hidden sm:block" : ""}`}>
                <button type="button" onClick={() => setZoom(idx)} className="block size-full cursor-zoom-in" aria-label={p.caption || (locale === "mr" ? "फोटो मोठा पहा" : "View photo")}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- backend media or static design asset */}
                  <img src={p.src} alt={p.caption} className="size-full object-cover transition-transform duration-300 hover:scale-[1.03]" loading="lazy" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {current && zoom !== null && (
        <div role="dialog" aria-modal="true" aria-label={current.caption || "Photo"} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
          <button type="button" onClick={() => setZoom(null)} aria-label={locale === "mr" ? "बंद करा" : "Close"} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="size-6" aria-hidden />
          </button>
          {canSlide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((zoom - 1 + count) % count);
              }}
              aria-label={locale === "mr" ? "मागील" : "Previous"}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <ChevronLeft className="size-8" aria-hidden />
            </button>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- backend media or static design asset */}
            <img src={current.src} alt={current.caption} className="max-h-[80vh] w-auto rounded-[10px] object-contain" />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-white/90">
              <span>{current.caption}</span>
              <span>
                {zoom + 1} / {count} ·{" "}
                <Link href={galleryHref} className="font-semibold underline">
                  {locale === "mr" ? "संपूर्ण दालन पहा" : "Open full gallery"}
                </Link>
              </span>
            </figcaption>
          </figure>
          {canSlide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((zoom + 1) % count);
              }}
              aria-label={locale === "mr" ? "पुढील" : "Next"}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <ChevronRight className="size-8" aria-hidden />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
