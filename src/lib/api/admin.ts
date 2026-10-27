import type {
  AdminUnitDto,
  AdminUnitLevel,
  AnnouncementDto,
  ContentStatus,
  PageDto,
  TenantDto,
  TenantStatus,
  UserDto,
} from "@/types/api";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "@/features/announcements/validators";
import type { CreateUnitInput } from "@/features/hierarchy/validators";
import type { CreateTenantInput } from "@/features/tenants/validators";
import type { AssignmentInput, CreateUserInput, UpdateUserInput } from "@/features/users/validators";
import { apiFetch, apiFetchPage, type ApiRequest, type QueryValue } from "./client";

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
  create: (body: CreateUnitInput, o: Opts = {}) => apiFetch<AdminUnitDto>("/hierarchy/units", { method: "POST", body, ...o }),
};

export const LEVEL_ORDER: AdminUnitLevel[] = ["STATE", "DISTRICT", "TALUKA", "BLOCK", "GRAM_PANCHAYAT"];
export function childLevels(level: AdminUnitLevel): AdminUnitLevel[] {
  return LEVEL_ORDER.slice(LEVEL_ORDER.indexOf(level) + 1);
}

// ------------------------------------------------------------------ tenants
export const tenants = {
  list: (query: ListQuery, o: Opts = {}) => apiFetchPage<TenantDto>("/tenants", { query, ...o }),
  get: (tenantId: string, o: Opts = {}) => apiFetch<TenantDto>(`/tenants/${tenantId}`, o),
  create: (body: CreateTenantInput, o: Opts = {}) => apiFetch<TenantDto>("/tenants", { method: "POST", body, ...o }),
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
