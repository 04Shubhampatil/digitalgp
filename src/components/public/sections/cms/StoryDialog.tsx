"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

/**
 * "Read Story" for a story that has no story page yet (placeholder content): opens the whole story — photo,
 * title and text — in a modal dialog instead of linking back to the same block.
 */
export function StoryDialog({
  label,
  title,
  text,
  image,
  closeLabel,
  className,
  children,
}: {
  label: string;
  title: string;
  text: string;
  image?: string;
  closeLabel: string;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className}>
        {label}
        {children}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself, outside the card) closes it.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-[12px] bg-white p-0 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop:bg-black/50"
      >
        <div className="relative">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
            <img src={image} alt="" className="h-[280px] w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={closeLabel}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="px-7 pt-6 pb-8">
          <h3 className="text-[22px] leading-[30px] font-semibold text-[#135130]">{title}</h3>
          <p className="mt-3 text-[16px] leading-[28px] whitespace-pre-line text-[#414141]">{text}</p>
        </div>
      </dialog>
    </>
  );
}
