import type {
  PublicAnnouncementDto,
  PublicGrievanceReceiptDto,
  PublicGrievanceStatusDto,
  PublicPageDto,
  PublicProjectDto,
  PublicSchemeDto,
  PublicTenantDto,
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

export interface SubmitGrievanceInput {
  turnstileToken?: string;
  category: string;
  citizenName: string;
  citizenPhone?: string | null;
  citizenEmail?: string | null;
  description: string;
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
