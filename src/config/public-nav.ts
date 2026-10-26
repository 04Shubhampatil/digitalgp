import type { PageKey } from "@/config/pages";

/**
 * Frontend-only metadata for the shared page registry (src/config/pages.ts):
 * route segment and the grouped navigation shown in the Figma public navbar
 * (Home · About Us · Development · Citizen Services · Community · Media).
 * Labels come from the `public.*` i18n namespace keyed by pageKey.
 */
export const PAGE_PATH: Record<PageKey, string> = {
  home: "",
  about: "about",
  projects: "projects",
  schemes: "schemes",
  announcements: "announcements",
  infrastructure: "infrastructure",
  finance: "finance",
  services: "services",
  culture: "culture",
  employment: "employment",
  education: "education",
  grievance: "grievance",
  environment: "environment",
  gallery: "gallery",
  contact: "contact",
  progress: "progress",
};

export interface PublicNavGroup {
  /** i18n key under `public.nav.*`; `null` = top-level link to the single page. */
  labelKey: "development" | "citizenServices" | "community" | "media" | null;
  pages: PageKey[];
}

export const PUBLIC_NAV: PublicNavGroup[] = [
  { labelKey: null, pages: ["home"] },
  { labelKey: null, pages: ["about"] },
  { labelKey: "development", pages: ["projects", "schemes", "infrastructure", "finance", "progress"] },
  { labelKey: "citizenServices", pages: ["services", "grievance"] },
  { labelKey: "community", pages: ["culture", "employment", "education", "environment"] },
  { labelKey: "media", pages: ["announcements", "gallery", "contact"] },
];

export function pageHref(slug: string, pageKey: PageKey): string {
  const seg = PAGE_PATH[pageKey];
  return seg ? `/${slug}/${seg}` : `/${slug}`;
}
