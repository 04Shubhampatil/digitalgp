"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isUiLocale } from "./config";

/** Server action used by the language switcher. Cookie lives one year. */
export async function setUiLocale(locale: string): Promise<void> {
  if (!isUiLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
}
