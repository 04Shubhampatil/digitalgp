"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setUiLocale } from "@/i18n/actions";
import { UI_LOCALES, type UiLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";

const LABEL_KEY: Record<UiLocale, "marathi" | "english"> = { mr: "marathi", en: "english" };

/** मराठी | English segmented toggle (Figma "Language Switcher" component). */
export function LanguageSwitcher({ className }: { className?: string }) {
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

  return (
    <div role="group" aria-label={t("language")} className={cn("inline-flex overflow-hidden rounded-[4px] border border-line-strong", className)}>
      {UI_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(code)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold leading-[18px] transition-colors",
              active ? "bg-primary-alt text-white" : "bg-surface text-ink/50 hover:text-ink",
            )}
          >
            {t(LABEL_KEY[code])}
          </button>
        );
      })}
    </div>
  );
}
