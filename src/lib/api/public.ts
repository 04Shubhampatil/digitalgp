import type {
  PublicAnnouncementCategoryDto,
  PublicAnnouncementDto,
  PublicSchemeCoverageDto,
  PublicSuccessStoryDto,
  PublicGrievanceLookupItemDto,
  PublicGrievanceReceiptDto,
  PublicGrievanceStatusDto,
  PublicPageDto,
  PublicProjectDto,
  PublicSchemeDto,
  PublicTenantDto,
  PublicGrievanceStatsDto,
  PublicSchemeStatsDto,
  PublicServiceStatsDto,
} from "@/types/api";
import { API_BASE, apiFetch, apiFetchPage, type QueryValue } from "./client";

/**
 * Public, unauthenticated reads (published content only). Safe to call from Server Components
 * without cookies. Responses are cached briefly and tagged so the admin can revalidate later.
 */
const PUBLIC_REVALIDATE = 60;

export function getPublicTenant(slug: string): Promise<PublicTenantDto> {
  return apiFetch<PublicTenantDto>(`/public/${encodeURIComponent(slug)}`, {
    next: { revalidate: PUBLIC_REVALIDATE, tags: [`tenant:${slug}`] },
  });
}

export function getPublicPage(slug: string, pageKey: string): Promise<PublicPageDto> {
  return apiFetch<PublicPageDto>(`/public/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageKey)}`, {
    next: { revalidate: PUBLIC_REVALIDATE, tags: [`tenant:${slug}`, `page:${slug}:${pageKey}`] },
  });
}

export function listPublicAnnouncements(slug: string, query: Record<string, QueryValue> = {}) {
  return apiFetchPage<PublicAnnouncementDto>(`/public/${encodeURIComponent(slug)}/announcements`, { query });
}

/** URL for an image/document that belongs to the website (served by the backend). */
export function publicMediaUrl(slug: string, mediaId: string): string {
  return `${API_BASE}/public/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`;
}

export function listPublicSchemes(slug: string, query: Record<string, QueryValue> = {}) {
  return apiFetchPage<PublicSchemeDto>(`/public/${encodeURIComponent(slug)}/schemes`, { query });
}

export function listPublicProjects(slug: string, query: Record<string, QueryValue> = {}) {
  return apiFetchPage<PublicProjectDto>(`/public/${encodeURIComponent(slug)}/projects`, { query });
}

export interface GrievanceFormSettings {
  captchaEnabled: boolean;
  allowFileUpload: boolean;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  heading: { en?: string; mr?: string } | null;
  description: { en?: string; mr?: string } | null;
  successMessage: { en?: string; mr?: string } | null;
  submitButtonText: { en?: string; mr?: string } | null;
}

/** GET /public/:slug/grievance-form — what the complaint form must adapt to (CAPTCHA, uploads). */
export function getGrievanceFormSettings(slug: string) {
  return apiFetch<GrievanceFormSettings>(`/public/${encodeURIComponent(slug)}/grievance-form`);
}

/** POST /public/:slug/grievance-attachments — one file; returns only its id. */
export function uploadGrievanceAttachment(slug: string, file: File, turnstileToken?: string) {
  const body = new FormData();
  body.set("file", file);
  body.set("website", "");
  if (turnstileToken) body.set("turnstileToken", turnstileToken);
  return apiFetch<{ id: string }>(`/public/${encodeURIComponent(slug)}/grievance-attachments`, { method: "POST", body });
}

export interface SubmitGrievanceInput {
  attachmentIds?: string[];
  turnstileToken?: string;
  category: string;
  citizenName: string;
  citizenPhone?: string | null;
  citizenEmail?: string | null;
  description: string;
  complaintType?: string | null;
  subject?: string | null;
  location?: string | null;
}

export function submitGrievance(slug: string, body: SubmitGrievanceInput) {
  return apiFetch<PublicGrievanceReceiptDto>(`/public/${encodeURIComponent(slug)}/grievances`, { method: "POST", body });
}

export function trackGrievance(slug: string, trackingCode: string) {
  return apiFetch<PublicGrievanceStatusDto>(`/public/${encodeURIComponent(slug)}/grievances/${encodeURIComponent(trackingCode.trim().toUpperCase())}`);
}

/** Contact-page forms (POST /public/:slug/feedback and /public/:slug/volunteers). */
export function submitContactForm(slug: string, kind: "feedback" | "volunteers", body: Record<string, string | null>) {
  return apiFetch<{ message: string }>(`/public/${encodeURIComponent(slug)}/${kind}`, { method: "POST", body });
}

async function publicStats<T>(slug: string, kind: "grievances" | "schemes" | "services"): Promise<T | null> {
  try {
    return await apiFetch<T>(`/public/${encodeURIComponent(slug)}/stats/${kind}`, { next: { revalidate: 60, tags: [`tenant:${slug}`] } });
  } catch {
    return null;
  }
}
/** Computed statistics (numbers only). Null when the endpoint fails; individual figures can be null too. */
export const getGrievanceStats = (slug: string) => publicStats<PublicGrievanceStatsDto>(slug, "grievances");
export const getSchemeStats = (slug: string) => publicStats<PublicSchemeStatsDto>(slug, "schemes");
export const getServiceStats = (slug: string) => publicStats<PublicServiceStatsDto>(slug, "services");

export interface PublicWeatherDto {
  source: "live" | "manual";
  location?: string | { en?: string; mr?: string } | null;
  current?: { temperature?: string; humidity?: string; wind?: string; feelsLike?: string; condition?: string | { en?: string; mr?: string } } | null;
  forecast?: { date?: string; icon?: string; maxTemp?: string; minTemp?: string }[];
  fetchedAt?: string;
}

/** GET /public/:slug/weather — live data when a provider is configured, else the manual Home section. Null when unavailable. */
export async function getPublicWeather(slug: string): Promise<PublicWeatherDto | null> {
  try {
    return await apiFetch<PublicWeatherDto>(`/public/${encodeURIComponent(slug)}/weather`, { next: { revalidate: 300, tags: [`tenant:${slug}`] } });
  } catch {
    return null;
  }
}

/** GET /public/:slug/grievances?phone= — the citizen's complaints of the last 12 months (minimal fields; 429 when rate limited). */
export function lookupGrievancesByPhone(slug: string, phone: string) {
  return apiFetch<PublicGrievanceLookupItemDto[]>(`/public/${encodeURIComponent(slug)}/grievances`, { query: { phone: phone.trim() } });
}

export interface SubmitTreeAdoptionInput {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  treeCount: number;
  species?: string | null;
  preferredLocation?: string | null;
  message?: string | null;
  /** Honeypot: always empty from real visitors. */
  website: string;
  turnstileToken?: string;
}

/** POST /public/:slug/tree-adoptions — open only while Environment › tree-adoption is published and enabled (else 404/403). */
export function submitTreeAdoption(slug: string, body: SubmitTreeAdoptionInput) {
  return apiFetch<{ message: string }>(`/public/${encodeURIComponent(slug)}/tree-adoptions`, { method: "POST", body });
}

// ---------------------------------------------------------------------------
// Detail pages, success stories, announcement categories and scheme coverage (docs/api-contract.md,
// "Public-site backend needs"). Published records only; cached like the other public reads.
// ---------------------------------------------------------------------------

const pub = (slug: string) => `/public/${encodeURIComponent(slug)}`;
const cached = (slug: string) => ({ next: { revalidate: PUBLIC_REVALIDATE, tags: [`tenant:${slug}`] } });

/** GET /public/:slug/projects/:projectId */
export function getPublicProject(slug: string, projectId: string) {
  return apiFetch<PublicProjectDto>(`${pub(slug)}/projects/${encodeURIComponent(projectId)}`, cached(slug));
}

/** GET /public/:slug/schemes/:schemeId */
export function getPublicScheme(slug: string, schemeId: string) {
  return apiFetch<PublicSchemeDto>(`${pub(slug)}/schemes/${encodeURIComponent(schemeId)}`, cached(slug));
}

/** GET /public/:slug/announcements/:announcementId */
export function getPublicAnnouncement(slug: string, announcementId: string) {
  return apiFetch<PublicAnnouncementDto>(`${pub(slug)}/announcements/${encodeURIComponent(announcementId)}`, cached(slug));
}

/** GET /public/:slug/announcements/categories?page= — categories of live announcements with counts. */
export function listPublicAnnouncementCategories(slug: string, page?: string) {
  return apiFetch<PublicAnnouncementCategoryDto[]>(`${pub(slug)}/announcements/categories`, { ...cached(slug), query: { page } });
}

/** GET /public/:slug/success-stories?page=&projectId=&schemeId=&limit&cursor */
export function listPublicSuccessStories(slug: string, query: Record<string, QueryValue> = {}) {
  return apiFetchPage<PublicSuccessStoryDto>(`${pub(slug)}/success-stories`, { query });
}

/** GET /public/:slug/success-stories/:storyId */
export function getPublicSuccessStory(slug: string, storyId: string) {
  return apiFetch<PublicSuccessStoryDto>(`${pub(slug)}/success-stories/${encodeURIComponent(storyId)}`, cached(slug));
}

/** GET /public/:slug/schemes/coverage?schemeId= — per-ward households / beneficiaries (all schemes without an id). */
export function getPublicSchemeCoverage(slug: string, schemeId?: string | null) {
  return apiFetch<PublicSchemeCoverageDto>(`${pub(slug)}/schemes/coverage`, { query: { schemeId: schemeId ?? undefined } });
}
