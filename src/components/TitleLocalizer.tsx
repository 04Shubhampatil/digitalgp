"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

const BRAND_EN = " · DigitalGP";
const BRAND_MR = "स्मार्ट व्हिलेज";

/**
 * Browser tab title in the language of the UI. Page titles are set once, in English, by each page's metadata; in the
 * Marathi UI this swaps a known title (the `titles` messages) and the product name for their Marathi forms and keeps
 * doing so when the page changes. Any other title (a website's own name) is only given the Marathi product name.
 */
export function TitleLocalizer() {
  const locale = useLocale();
  const t = useTranslations("titles");

  useEffect(() => {
    if (locale !== "mr") return;
    const apply = () => {
      const current = document.title;
      if (current !== "DigitalGP" && !current.endsWith(BRAND_EN)) return;
      const base = current === "DigitalGP" ? "" : current.slice(0, -BRAND_EN.length);
      const next = base ? `${t.has(base) ? t(base) : base} · ${BRAND_MR}` : BRAND_MR;
      if (next !== current) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, t]);

  return null;
}
