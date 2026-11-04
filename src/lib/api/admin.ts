import type {
  AdminUnitDto,
  AdminUnitLevel,
  AnnouncementDto,
  AuditLogDto,
  ContentStatus,
  DashboardPendingItemDto,
  DashboardWebsiteDto,
  FormSubmissionDto,
  FormSubmissionSummaryDto,
  GrievanceDto,
  GrievanceStatus,
  MediaDto,
  PageDto,
  PageSectionDto,
  ProjectDto,
  ProjectStage,
  SchemeDto,
  SchemeLevel,
  SchemeWardCoverageDto,
  SuccessStoryDto,
  TenantDto,
  TenantListItemDto,
  TenantStatus,
  UserDto,
} from "@/types/api";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "@/features/announcements/validators";
import type { CreateUnitInput, UpdateUnitInput } from "@/features/hierarchy/validators";
import type { CreateTenantInput, UpdateTenantInput } from "@/features/tenants/validators";
import type { AssignmentInput, CreateUserInput, UpdateUserInput } from "@/features/users/validators";
import { API_BASE, apiFetch, apiFetchPage, type ApiRequest, type QueryValue } from "./client";

/**
 * Typed admin clients for docs/api-contract.md. Each function takes an optional `cookie` so the
 * same client works from Server Components (via lib/api/server.ts `cookieHeader()`) and the browser.
 * Only *types* are imported from the backend validators — the runtime stays HTTP-only.
 */
type Opts = Pick<ApiRequest, "cookie">;
export type ListQuery = Record<string, QueryValue>;

// ---------------------------------------------------------------- hierarchy
export const hierarchy = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<AdminUnitDto>("/hierarchy/units", { query, ...o }),
  get: (unitId: string, o: Opts = {}) =>
    apiFetch<{ unit: AdminUnitDto; ancestors: AdminUnitDto[] }>(`/hierarchy/units/${unitId}`, o),
  update: (unitId: string, body: UpdateUnitInput, o: Opts = {}) =>
    apiFetch<AdminUnitDto>(`/hierarchy/units/${unitId}`, { method: "PATCH", body, ...o }),
  create: (body: CreateUnitInput, o: Opts = {}) => apiFetch<AdminUnitDto>("/hierarchy/units", { method: "POST", body, ...o }),
};

export const LEVEL_ORDER: AdminUnitLevel[] = ["STATE", "DISTRICT", "TALUKA", "BLOCK", "GRAM_PANCHAYAT"];
export function childLevels(level: AdminUnitLevel): AdminUnitLevel[] {
  return LEVEL_ORDER.slice(LEVEL_ORDER.indexOf(level) + 1);
}

// ------------------------------------------------------------------ tenants
export const tenants = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<TenantListItemDto>("/tenants", { query, ...o }),
  /** Same-origin CSV download URL (GET /tenants/export?status&unitId&q); use as a plain link. */
  exportUrl: (query: { status?: string; unitId?: string; q?: string }) => withQuery(`${API_BASE}/tenants/export`, query),
  get: (tenantId: string, o: Opts = {}) => apiFetch<TenantDto>(`/tenants/${tenantId}`, o),
  create: (body: CreateTenantInput, o: Opts = {}) => apiFetch<TenantDto>("/tenants", { method: "POST", body, ...o }),
  update: (tenantId: string, body: UpdateTenantInput, o: Opts = {}) =>
    apiFetch<TenantDto>(`/tenants/${tenantId}`, { method: "PATCH", body, ...o }),
  setStatus: (tenantId: string, status: TenantStatus, o: Opts = {}) =>
    apiFetch<TenantDto>(`/tenants/${tenantId}/status`, { method: "POST", body: { status }, ...o }),
};

// ------------------------------------------------------------------ content
export const content = {
  listPages: (tenantId: string, o: Opts = {}) => apiFetch<PageDto[]>(`/content/${tenantId}/pages`, o),
  getPage: (tenantId: string, pageKey: string, o: Opts = {}) => apiFetch<PageDto>(`/content/${tenantId}/pages/${pageKey}`, o),
};

// -------------------------------------------------------------------- users
export const users = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<UserDto>("/users", { query, ...o }),
  get: (userId: string, o: Opts = {}) => apiFetch<UserDto>(`/users/${userId}`, o),
  create: (body: CreateUserInput, o: Opts = {}) =>
    apiFetch<{ user: UserDto; temporaryPassword: string | null }>("/users", { method: "POST", body, ...o }),
  update: (userId: string, body: UpdateUserInput, o: Opts = {}) =>
    apiFetch<UserDto>(`/users/${userId}`, { method: "PATCH", body, ...o }),
  addAssignment: (userId: string, body: AssignmentInput, o: Opts = {}) =>
    apiFetch<UserDto>(`/users/${userId}/assignments`, { method: "POST", body, ...o }),
  revokeAssignment: (userId: string, assignmentId: string, o: Opts = {}) =>
    apiFetch<UserDto>(`/users/${userId}/assignments/${assignmentId}`, { method: "DELETE", ...o }),
};

// ------------------------------------------------------------ announcements
export type WorkflowAction = "submit" | "start_review" | "approve" | "reject" | "publish" | "unpublish" | "archive";

/** Mirror of src/features/content/workflow.ts TRANSITIONS (from-status → action), UI hint only. */
export const WORKFLOW_ACTIONS: Record<WorkflowAction, { from: ContentStatus[]; capability: string; requiresNote?: boolean }> = {
  submit: { from: ["DRAFT", "REJECTED"], capability: "content:submit" },
  start_review: { from: ["SUBMITTED"], capability: "content:review" },
  approve: { from: ["SUBMITTED", "UNDER_REVIEW"], capability: "content:review" },
  reject: { from: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"], capability: "content:review", requiresNote: true },
  publish: { from: ["APPROVED"], capability: "content:publish" },
  unpublish: { from: ["PUBLISHED"], capability: "content:publish" },
  archive: { from: ["PUBLISHED", "APPROVED", "REJECTED", "DRAFT"], capability: "content:publish" },
};

export function availableActions(status: ContentStatus, capabilities: string[]): WorkflowAction[] {
  return (Object.keys(WORKFLOW_ACTIONS) as WorkflowAction[]).filter((a) => {
    const t = WORKFLOW_ACTIONS[a];
    return t.from.includes(status) && capabilities.includes(t.capability);
  });
}

export const EDITABLE_STATUSES: ContentStatus[] = ["DRAFT", "REJECTED"];

export const announcements = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<AnnouncementDto>("/announcements", { query, ...o }),
  get: (id: string, o: Opts = {}) => apiFetch<AnnouncementDto>(`/announcements/${id}`, o),
  create: (body: CreateAnnouncementInput, o: Opts = {}) => apiFetch<AnnouncementDto>("/announcements", { method: "POST", body, ...o }),
  update: (id: string, body: UpdateAnnouncementInput, o: Opts = {}) =>
    apiFetch<AnnouncementDto>(`/announcements/${id}`, { method: "PATCH", body, ...o }),
  remove: (id: string, o: Opts = {}) => apiFetch<void>(`/announcements/${id}`, { method: "DELETE", ...o }),
  transition: (id: string, action: WorkflowAction, note?: string | null, o: Opts = {}) =>
    apiFetch<AnnouncementDto>(`/announcements/${id}/${action}`, { method: "POST", body: { note: note ?? null }, ...o }),
};

// ---------------------------------------------------------- page sections
export type SectionAction = "submit" | "start_review" | "approve" | "reject" | "publish" | "unpublish";
export const SECTION_ACTIONS: SectionAction[] = ["submit", "start_review", "approve", "reject", "publish", "unpublish"];

export interface SaveSectionDraftBody {
  data: Record<string, unknown>;
  isVisible?: boolean;
  sortOrder?: number;
}
export interface UpdatePageBody {
  isEnabled?: boolean;
  seoTitleEn?: string | null;
  seoTitleMr?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionMr?: string | null;
  shareImageId?: string | null;
}

const sectionPath = (tenantId: string, pageKey: string, sectionKey: string) =>
  `/content/${tenantId}/pages/${pageKey}/sections/${encodeURIComponent(sectionKey)}`;

export const sections = {
  updatePage: (tenantId: string, pageKey: string, body: UpdatePageBody, o: Opts = {}) =>
    apiFetch<PageDto>(`/content/${tenantId}/pages/${pageKey}`, { method: "PATCH", body, ...o }),
  saveDraft: (tenantId: string, pageKey: string, sectionKey: string, body: SaveSectionDraftBody, o: Opts = {}) =>
    apiFetch<PageSectionDto>(`${sectionPath(tenantId, pageKey, sectionKey)}/draft`, { method: "PUT", body, ...o }),
  discardDraft: (tenantId: string, pageKey: string, sectionKey: string, o: Opts = {}) =>
    apiFetch<PageSectionDto>(`${sectionPath(tenantId, pageKey, sectionKey)}/draft`, { method: "DELETE", ...o }),
  transition: (tenantId: string, pageKey: string, sectionKey: string, action: SectionAction, note?: string | null, o: Opts = {}) =>
    apiFetch<PageSectionDto>(`${sectionPath(tenantId, pageKey, sectionKey)}/${action}`, { method: "POST", body: { note: note ?? null }, ...o }),
};

// -------------------------------------------------------------------- media
export const media = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<MediaDto>("/media", { query, ...o }),
  /** Browser only: multipart upload of one file for a website (or a shared unit). */
  upload: (file: File, scope: { tenantId: string } | { ownerUnitId: string }, alt?: { altEn?: string; altMr?: string }) => {
    const fd = new FormData();
    fd.set("file", file);
    if ("tenantId" in scope) fd.set("tenantId", scope.tenantId);
    else fd.set("ownerUnitId", scope.ownerUnitId);
    if (alt?.altEn) fd.set("altEn", alt.altEn);
    if (alt?.altMr) fd.set("altMr", alt.altMr);
    return apiFetch<MediaDto>("/media", { method: "POST", body: fd });
  },
  remove: (id: string, o: Opts = {}) => apiFetch<void>(`/media/${id}`, { method: "DELETE", ...o }),
};

/** Admin-only file URL (session cookie required; served `private, no-store`). */
export function adminMediaUrl(mediaId: string): string {
  return `${API_BASE}/media/${encodeURIComponent(mediaId)}/file`;
}

// ---------------------------------------------------- schemes & projects
export interface SchemeBody {
  level: SchemeLevel;
  nameEn?: string | null;
  nameMr?: string | null;
  descriptionEn?: string | null;
  descriptionMr?: string | null;
  eligibilityEn?: string | null;
  eligibilityMr?: string | null;
  processEn?: string | null;
  processMr?: string | null;
  externalUrl?: string | null;
  beneficiaryCount?: number | null;
  amountDisbursed?: number | null;
  /** "2026-27"; null = cumulative amount. */
  disbursedFinancialYear?: string | null;
  category?: string | null;
  mapImageId?: string | null;
}
export type CreateSchemeBody = SchemeBody & ({ tenantId: string } | { ownerUnitId: string; targetUnitIds: string[] });

export interface ProjectBody {
  stage: ProjectStage;
  nameEn?: string | null;
  nameMr?: string | null;
  descriptionEn?: string | null;
  descriptionMr?: string | null;
  wardNo?: string | null;
  year?: number | null;
  budget?: number | null;
  familiesBenefited?: number | null;
  outcomeEn?: string | null;
  outcomeMr?: string | null;
  outcomeShortEn?: string | null;
  outcomeShortMr?: string | null;
  coverImageId?: string | null;
  beforeImageId?: string | null;
  afterImageId?: string | null;
}

/** Content resources with the shared draft → review → publish workflow. */
export interface WorkflowResource<T> {
  get: (id: string, o?: Opts) => Promise<T>;
  remove: (id: string, o?: Opts) => Promise<void>;
  transition: (id: string, action: WorkflowAction, note?: string | null, o?: Opts) => Promise<T>;
}

export const schemes = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<SchemeDto>("/schemes", { query, ...o }),
  get: (id: string, o: Opts = {}) => apiFetch<SchemeDto>(`/schemes/${id}`, o),
  create: (body: CreateSchemeBody, o: Opts = {}) => apiFetch<SchemeDto>("/schemes", { method: "POST", body, ...o }),
  update: (id: string, body: Partial<SchemeBody>, o: Opts = {}) => apiFetch<SchemeDto>(`/schemes/${id}`, { method: "PATCH", body, ...o }),
  remove: (id: string, o: Opts = {}) => apiFetch<void>(`/schemes/${id}`, { method: "DELETE", ...o }),
  transition: (id: string, action: WorkflowAction, note?: string | null, o: Opts = {}) =>
    apiFetch<SchemeDto>(`/schemes/${id}/${action}`, { method: "POST", body: { note: note ?? null }, ...o }),
};

export const projects = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<ProjectDto>("/projects", { query, ...o }),
  get: (id: string, o: Opts = {}) => apiFetch<ProjectDto>(`/projects/${id}`, o),
  create: (body: ProjectBody & { tenantId: string }, o: Opts = {}) => apiFetch<ProjectDto>("/projects", { method: "POST", body, ...o }),
  update: (id: string, body: Partial<ProjectBody>, o: Opts = {}) => apiFetch<ProjectDto>(`/projects/${id}`, { method: "PATCH", body, ...o }),
  remove: (id: string, o: Opts = {}) => apiFetch<void>(`/projects/${id}`, { method: "DELETE", ...o }),
  transition: (id: string, action: WorkflowAction, note?: string | null, o: Opts = {}) =>
    apiFetch<ProjectDto>(`/projects/${id}/${action}`, { method: "POST", body: { note: note ?? null }, ...o }),
};

// --------------------------------------------------------------- grievances
export const grievances = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<GrievanceDto>("/grievances", { query, ...o }),
  get: (id: string, o: Opts = {}) => apiFetch<GrievanceDto>(`/grievances/${id}`, o),
  assign: (id: string, assignedToId: string | null, o: Opts = {}) =>
    apiFetch<GrievanceDto>(`/grievances/${id}/assign`, { method: "POST", body: { assignedToId }, ...o }),
  setStatus: (id: string, status: "IN_PROGRESS" | "RESOLVED" | "REJECTED", note?: string | null, o: Opts = {}) =>
    apiFetch<GrievanceDto>(`/grievances/${id}/status`, { method: "POST", body: { status, note: note ?? null }, ...o }),
};

/** Mirrors GRIEVANCE_TRANSITIONS in src/features/grievances/validators.ts. */
export const GRIEVANCE_NEXT: Record<GrievanceStatus, ("IN_PROGRESS" | "RESOLVED" | "REJECTED")[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: ["IN_PROGRESS"],
  REJECTED: ["IN_PROGRESS"],
};

// ---------------------------------------------------------------- audit
export const audit = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<AuditLogDto>("/audit-logs", { query, ...o }),
  /** Same-origin CSV download URL with the list's filters (at most 5000 rows, no before/after payloads). */
  exportUrl: (query: ListQuery) => withQuery(`${API_BASE}/audit-logs/export`, query),
};

// ---------------------------------------------------------------- dashboard
export const dashboard = {
  /** Per-website pending items, last update (and who) and setup progress, caller's area only. */
  websites: (query: ListQuery, o: Opts = {}) => apiFetchPage<DashboardWebsiteDto>("/dashboard/websites", { query, ...o }),
  /** Latest 20 items waiting for review. */
  pendingUpdates: (query: ListQuery, o: Opts = {}) => apiFetch<DashboardPendingItemDto[]>("/dashboard/pending-updates", { query, ...o }),
};

// ---------------------------------------------------------- success stories
export const STORY_PAGE_KEYS = ["home", "projects", "schemes", "employment", "education", "culture", "environment"] as const;
export type StoryPageKey = (typeof STORY_PAGE_KEYS)[number];

export interface SuccessStoryBody {
  pageKey: StoryPageKey;
  titleEn?: string | null;
  titleMr?: string | null;
  summaryEn?: string | null;
  summaryMr?: string | null;
  bodyEn?: string | null;
  bodyMr?: string | null;
  quoteEn?: string | null;
  quoteMr?: string | null;
  personName?: string | null;
  personRoleEn?: string | null;
  personRoleMr?: string | null;
  location?: string | null;
  photoId?: string | null;
  projectId?: string | null;
  schemeId?: string | null;
  consentConfirmed?: boolean;
  sortOrder?: number;
}

export const successStories = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<SuccessStoryDto>("/success-stories", { query, ...o }),
  get: (id: string, o: Opts = {}) => apiFetch<SuccessStoryDto>(`/success-stories/${id}`, o),
  create: (body: SuccessStoryBody & { tenantId: string }, o: Opts = {}) => apiFetch<SuccessStoryDto>("/success-stories", { method: "POST", body, ...o }),
  update: (id: string, body: Partial<SuccessStoryBody>, o: Opts = {}) => apiFetch<SuccessStoryDto>(`/success-stories/${id}`, { method: "PATCH", body, ...o }),
  remove: (id: string, o: Opts = {}) => apiFetch<void>(`/success-stories/${id}`, { method: "DELETE", ...o }),
  transition: (id: string, action: WorkflowAction, note?: string | null, o: Opts = {}) =>
    apiFetch<SuccessStoryDto>(`/success-stories/${id}/${action}`, { method: "POST", body: { note: note ?? null }, ...o }),
};

// ---------------------------------------------------------- scheme coverage
export interface CoverageRowBody {
  wardNo: string;
  households: number;
  beneficiaries?: number | null;
}
export const schemeCoverage = {
  get: (tenantId: string, schemeId: string, o: Opts = {}) => apiFetch<SchemeWardCoverageDto>(`/content/${tenantId}/scheme-coverage/${schemeId}`, o),
  /** Replaces the whole list; `[]` clears it. */
  put: (tenantId: string, schemeId: string, wards: CoverageRowBody[], o: Opts = {}) =>
    apiFetch<SchemeWardCoverageDto>(`/content/${tenantId}/scheme-coverage/${schemeId}`, { method: "PUT", body: { wards }, ...o }),
};

function withQuery(path: string, query: Record<string, QueryValue>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

// --------------------------------------------------------------- contact-page form submissions
export const formSubmissions = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<FormSubmissionDto>("/form-submissions", { query, ...o }),
  summary: (tenantId: string, o: Opts = {}) => apiFetch<FormSubmissionSummaryDto>("/form-submissions/summary", { query: { tenantId }, ...o }),
};
