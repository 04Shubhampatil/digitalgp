"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setUiLocale } from "@/i18n/actions";
import { UI_LOCALES, type UiLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";

const LABEL_KEY: Record<UiLocale, "marathi" | "english"> = { mr: "marathi", en: "english" };

/**
 * मराठी | English toggle. `segmented` (default) is the admin box from the Figma "Language Switcher" component;
 * `pill` is the public green strip's pair of rounded pills (active: white with green text, inactive: white outline).
 */
export function LanguageSwitcher({ className, variant = "segmented" }: { className?: string; variant?: "segmented" | "pill" }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: UiLocale) {
    if (next === locale) return;
    startTransition(async () => {
      await setUiLocale(next);
      router.refresh();
    });
  }

  const pill = variant === "pill";
  // The public strip lists English first, like the design.
  const codes = pill ? [...UI_LOCALES].sort((a) => (a === "en" ? -1 : 1)) : UI_LOCALES;

  return (
    <div role="group" aria-label={t("language")} className={cn(pill ? "inline-flex items-center gap-3" : "inline-flex overflow-hidden rounded-[4px] border border-line-strong", className)}>
      {codes.map((code) => {
        const active = code === locale;
        const label = pill ? t(code === "en" ? "english" : "marathiLatin") : t(LABEL_KEY[code]);
        // Optical centring: Noto Sans places Latin ink ~0.5px and Devanagari ink ~2px above the middle of its line box,
        // so each label gets a little top padding (it moves the text down by half of it inside the centred flex box).
        const nudge = /[ऀ-ॿ]/.test(label) ? "pt-[4px]" : "pt-[1px]";
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(code)}
            className={cn(
              pill
                ? cn("inline-flex h-[24px] min-w-[72px] items-center justify-center rounded-full border px-[18px] text-[12px] leading-none transition-colors", nudge)
                : "px-3 py-1.5 text-xs font-semibold leading-[18px] transition-colors",
              pill
                ? active
                  ? "border-[0.5px] border-primary-alt bg-white font-semibold text-primary-alt"
                  : "border-[0.5px] border-white bg-transparent text-white hover:bg-white/10"
                : active
                  ? "bg-primary-alt text-white"
                  : "bg-surface text-ink/50 hover:text-ink",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
