/**
 * UI locale configuration. Content locales (`Locale` in src/types/api.ts) are EN | MR | HI;
 * the UI ships Marathi + English dictionaries first (circular rule 3). Hindi can be added by
 * dropping `hi.json` into messages/ and extending UI_LOCALES.
 */
export const UI_LOCALES = ["mr", "en"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_PUBLIC_LOCALE: UiLocale = "mr";
export const DEFAULT_ADMIN_LOCALE: UiLocale = "en";

/** Cookie that stores the visitor's UI language choice (not the tenant's default). */
export const LOCALE_COOKIE = "dgp_locale";

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

/** Map an API content locale ("EN" | "MR" | "HI") to a UI locale. */
export function fromApiLocale(value: string | null | undefined): UiLocale {
  return value === "EN" ? "en" : "mr";
}
