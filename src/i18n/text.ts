import type { UiLocale } from "./config";
import { marathiFor } from "./mr-fallback";

/** Bilingual content object as stored in section data (src/config/sections.ts). */
export interface Bilingual {
  en?: string | null;
  mr?: string | null;
}

/**
 * Pick the text for the active locale. If it is missing: Marathi falls back to a known translation
 * of the English text, then to the English text; English falls back to Marathi; then `fallback`.
 * Works for both section JSON (`{ en, mr }`) and DTO pairs passed as `{ en: titleEn, mr: titleMr }`.
 */
export function pickText(value: Bilingual | null | undefined, locale: UiLocale, fallback = ""): string {
  if (!value) return fallback;
  const primary = locale === "mr" ? value.mr : value.en;
  const secondary = locale === "mr" ? value.en : value.mr;
  if (primary?.trim()) return primary.trim();
  // Marathi UI with English-only content: use the known translation before showing English.
  if (locale === "mr") return marathiFor(secondary) ?? (secondary?.trim() || fallback);
  return secondary?.trim() || fallback;
}

/** Convenience for DTOs that carry `xxxEn` / `xxxMr` pairs. */
export function pair(en: string | null | undefined, mr: string | null | undefined): Bilingual {
  return { en: en ?? undefined, mr: mr ?? undefined };
}
