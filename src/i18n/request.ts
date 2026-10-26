import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_PUBLIC_LOCALE, LOCALE_COOKIE, isUiLocale, type UiLocale } from "./config";

/**
 * next-intl request config (no locale prefix in the URL — the first path segment belongs to the
 * tenant). The locale comes from the `dgp_locale` cookie, otherwise the public default (Marathi).
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  const locale: UiLocale = isUiLocale(fromCookie) ? fromCookie : DEFAULT_PUBLIC_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
