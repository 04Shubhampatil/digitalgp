import type { PublicTenantDto } from "@/types/api";

/** The website the Figma design was drawn for: its placeholder text is already about the right village. */
export const DESIGN_SLUG = "savardari";

export type Pair = { from: RegExp; to: string };

/**
 * The design's placeholder text is written about Savardari (Khed taluka, Pune). On any other website that text would
 * name the wrong village, so each design name is swapped for the website's own: the Gram Panchayat, its taluka and
 * its district. Returns null for the design's own website (nothing to swap) or when there is nothing to swap in.
 * Marathi names get a guard so "खेडे" (village) is never read as "खेड" (Khed).
 */
export function designNames(tenant: Pick<PublicTenantDto, "slug" | "nameEn" | "nameMr" | "area"> | null | undefined): Pair[] | null {
  if (!tenant || tenant.slug === DESIGN_SLUG) return null;
  const pairs: Pair[] = [];
  const add = (from: RegExp, to: string | undefined) => {
    if (to && to.trim()) pairs.push({ from, to: to.trim() });
  };
  const MR_END = "(?![\u0900-\u0903\u093A-\u094F])";
  add(/\bSavardari\b/g, tenant.nameEn);
  add(new RegExp(`सवरदरी${MR_END}`, "g"), tenant.nameMr);
  // Marathi forms continue with a suffix ("सवरदरीचे"), so those are swapped too.
  add(/सवरदरी(?=[ऀ-ॿ])/g, tenant.nameMr);
  add(/\bKhed\b/g, tenant.area?.taluka?.nameEn);
  add(new RegExp(`खेड${MR_END}`, "g"), tenant.area?.taluka?.nameMr);
  add(/\bPune\b/g, tenant.area?.district?.nameEn);
  add(new RegExp(`पुणे${MR_END}`, "g"), tenant.area?.district?.nameMr);
  return pairs.length ? pairs : null;
}

/** Deep copy of section data with every string passed through the name swaps; other values are untouched. */
export function localizeDesign<T>(value: T, pairs: Pair[] | null): T {
  if (!pairs) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return pairs.reduce((s, p) => s.replace(p.from, p.to), v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
