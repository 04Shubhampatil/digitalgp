"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Footer slot (buttons). */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "figma";
  /** Figma header variant: icon tile before the title and an inset divider instead of a full-width rule. */
  icon?: ReactNode;
  closeLabel?: string;
}

const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", figma: "max-w-[590px]" };

/** Modal built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", closeLabel = "Close", icon }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40",
        sizes[size],
      )}
    >
      <div className={cn("flex items-start justify-between gap-4", icon ? "px-6 pt-8 sm:px-[47px]" : "border-b border-line px-6 py-4")}>
        <div className="flex items-start gap-4">
          {icon && <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f6ee] text-[#034f3c]">{icon}</span>}
          <div>
            <h2 className={cn("font-bold", icon ? "text-[22px] leading-7 text-ink-strong" : "text-lg")}>{title}</h2>
            {description && <p className={cn("mt-0.5 text-muted", icon ? "text-[13px]" : "text-sm")}>{description}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="rounded p-1 text-muted hover:bg-surface-soft hover:text-ink">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {icon && <div aria-hidden className="mx-6 mt-5 h-px bg-line sm:mx-[47px]" />}
      <div className={cn("max-h-[70vh] overflow-y-auto px-6 py-5", !!icon && "sm:px-[47px] sm:py-7")}>{children}</div>
      {footer && <div className={cn("flex justify-end gap-3 border-t border-line px-6 py-4", !!icon && "sm:px-[47px] sm:py-7")}>{footer}</div>}
    </dialog>
  );
}
