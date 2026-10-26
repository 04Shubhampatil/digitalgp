import type { PublicAnnouncementDto, PublicPageDto, PublicTenantDto } from "@/types/api";
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
