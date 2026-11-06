"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

/**
 * Horizontal row that scrolls by one page when the arrows are pressed. The arrows only show when there are more
 * `children` than fit (`perView`); with fewer the row is a plain grid-like list.
 */
export function ScrollRow({
  count,
  perView,
  prevLabel,
  nextLabel,
  className,
  children,
}: {
  count: number;
  perView: number;
  prevLabel: string;
  nextLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const more = count > perView;
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <ul ref={ref} className={`${className ?? ""} overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {children}
      </ul>
      {more && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={prevLabel} className="absolute top-1/2 -left-3 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-[#135130] shadow-md hover:bg-[#135130]/5">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} aria-label={nextLabel} className="absolute top-1/2 -right-3 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-[#135130] shadow-md hover:bg-[#135130]/5">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
