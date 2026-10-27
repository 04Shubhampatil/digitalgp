import type { UiLocale } from "./config";

/** Bilingual content object as stored in section data (src/config/sections.ts). */
export interface Bilingual {
  en?: string | null;
  mr?: string | null;
}

/**
 * Pick the text for the active locale, falling back to the other language, then to `fallback`.
 * Works for both section JSON (`{ en, mr }`) and DTO pairs passed as `{ en: titleEn, mr: titleMr }`.
 */
export function pickText(value: Bilingual | null | undefined, locale: UiLocale, fallback = ""): string {
  if (!value) return fallback;
  const primary = locale === "mr" ? value.mr : value.en;
  const secondary = locale === "mr" ? value.en : value.mr;
  return primary?.trim() || secondary?.trim() || fallback;
}

/** Convenience for DTOs that carry `xxxEn` / `xxxMr` pairs. */
export function pair(en: string | null | undefined, mr: string | null | undefined): Bilingual {
  return { en: en ?? undefined, mr: mr ?? undefined };
}
