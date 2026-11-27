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
  if (locale === "mr") return marathiFor(secondary) ?? marathiDate(secondary) ?? (secondary?.trim() || fallback);
  return secondary?.trim() || fallback;
}

/** Convenience for DTOs that carry `xxxEn` / `xxxMr` pairs. */
export function pair(en: string | null | undefined, mr: string | null | undefined): Bilingual {
  return { en: en ?? undefined, mr: mr ?? undefined };
}

const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const mrDate = new Intl.DateTimeFormat("mr-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * A date written as English text in stored content ("05 Nov 2025", "May 10, 2024") in Marathi, e.g. "५ नोव्हेंबर, २०२५".
 * Returns null for anything that is not a plain day / month / year date, so other text is never touched.
 */
export function marathiDate(text: string | null | undefined): string | null {
  const s = (text ?? "").trim();
  const dmy = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(s);
  const mdy = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  const [day, mon, year] = dmy ? [dmy[1]!, dmy[2]!, dmy[3]!] : mdy ? [mdy[2]!, mdy[1]!, mdy[3]!] : [];
  if (!day || !mon || !year) return null;
  const m = MONTH_INDEX[mon.slice(0, 3).toLowerCase()];
  if (m === undefined) return null;
  const d = new Date(Date.UTC(Number(year), m, Number(day)));
  if (d.getUTCMonth() !== m || d.getUTCDate() !== Number(day)) return null;
  return mrDate.format(d);
}

/** English date text shown in the Marathi UI becomes a Marathi date; everything else is returned unchanged. */
export function localizeDate(text: string | undefined, locale: UiLocale): string {
  if (!text) return "";
  return locale === "mr" ? (marathiDate(text) ?? text) : text;
}
