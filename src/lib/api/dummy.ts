import type { PublicTenantDto } from "@/types/api";

/**
 * DUMMY DATA SWITCH (for work without a database).
 *
 * With DATA_SOURCE=dummy, public reads are answered locally instead of by the backend:
 *   - the website itself resolves to a fixture (so pages render),
 *   - page content is "not published", so Figma placeholders fill the sections (src/content).
 *
 * Live is the default. Leave DATA_SOURCE unset in any environment connected to the real backend.
 * This file only affects server-side reads; the browser never sees DATA_SOURCE.
 */
export function isDummyMode(): boolean {
  return process.env.DATA_SOURCE === "dummy";
}

/** Website fixture for any slug, taken from the Savardari design. */
export function dummyTenant(slug: string): PublicTenantDto {
  return {
    id: `dummy-${slug}`,
    slug,
    nameEn: "Savardari",
    nameMr: "सवरदरी",
    defaultLocale: "MR",
    settings: {
      contact: {
        address: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501",
        phone: "+919767694340",
        email: "savardarigrampanchayat@gmail.com",
      },
      social: {},
      branding: { tagline: { en: "Building a Sustainable, Transparent & Digital Village" } },
      seo: {},
    },
  };
}

export interface DummyRead {
  value?: unknown;
  error?: "NOT_FOUND";
  status?: number;
  message?: string;
}

/** Answer a public read in dummy mode; null means "not handled, use the network". */
export function dummyRead(path: string): DummyRead | null {
  if (!isDummyMode() || !path.startsWith("/public/")) return null;
  const parts = path.split("/").filter(Boolean); // ["public", slug, ...rest]
  if (parts.length === 2) return { value: dummyTenant(decodeURIComponent(parts[1] ?? "")) };
  return { error: "NOT_FOUND", status: 404, message: "dummy mode: no published content for this request" };
}
