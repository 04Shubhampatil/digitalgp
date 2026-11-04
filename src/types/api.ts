/**
 * Shared API contract types — imported by both backend route handlers and the frontend.
 * Keep in sync with docs/api-contract.md. Changes here are coordinated between both developers.
 */

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "INVALID_TRANSITION"
  | "INTERNAL_ERROR";

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiPaginated<T> {
  data: T[];
  page: { nextCursor: string | null; limit: number };
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

export interface ValidationIssue {
  path: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Enums (mirrors prisma/schema.prisma — string unions so the frontend needs no Prisma import)
// ---------------------------------------------------------------------------

export type Role = "SUPER_ADMIN" | "TALUKA_ADMIN" | "BLOCK_ADMIN" | "GP_ADMIN" | "DATA_ENTRY_OPERATOR";
export type AdminUnitLevel = "STATE" | "DISTRICT" | "TALUKA" | "BLOCK" | "GRAM_PANCHAYAT";
export type Locale = "EN" | "MR" | "HI";
export type TenantStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type ContentStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
export type AnnouncementPriority = "NORMAL" | "IMPORTANT" | "URGENT" | "EMERGENCY";
export type ModuleKey = "announcements" | "schemes" | "projects" | "pages" | "media" | "grievances";
export type SchemeLevel = "CENTRAL" | "STATE" | "DISTRICT" | "GRAM_PANCHAYAT";
export type ProjectStage = "UPCOMING" | "ONGOING" | "COMPLETED";
export type MediaKind = "IMAGE" | "VIDEO" | "DOCUMENT";
export type GrievanceStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface AdminUnitDto {
  id: string;
  level: AdminUnitLevel;
  code: string | null;
  nameEn: string;
  nameMr: string;
  slug: string;
  parentId: string | null;
  path: string;
  tenantId: string | null;
}

export interface TenantDto {
  id: string;
  unitId: string;
  slug: string;
  customDomain: string | null;
  nameEn: string;
  nameMr: string;
  status: TenantStatus;
  defaultLocale: Locale;
  settings: TenantSettingsDto;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Row of GET /dashboard/websites. */
export interface DashboardWebsiteDto {
  tenantId: string;
  slug: string;
  nameEn: string;
  nameMr: string;
  status: TenantStatus;
  publishedAt: string | null;
  /** Section drafts, announcements, schemes, projects and stories in SUBMITTED / UNDER_REVIEW. */
  pendingItems: number;
  /** Last change by a staff member (sign-ins and public submissions excluded). */
  lastUpdatedAt: string | null;
  lastUpdatedBy: { id: string; name: string } | null;
  lastAction: string | null;
  /** Enabled pages that have at least one published, visible section. */
  setupProgress: { pagesWithContent: number; pagesTotal: number; percent: number; missingPages: string[] };
}

/** Item of GET /dashboard/pending-updates. */
export interface DashboardPendingItemDto {
  type: "SECTION" | "ANNOUNCEMENT" | "SCHEME" | "PROJECT" | "SUCCESS_STORY";
  id: string;
  titleEn: string | null;
  titleMr: string | null;
  /** SECTION only. */
  pageKey: string | null;
  sectionKey: string | null;
  status: ContentStatus;
  submittedAt: string | null;
  /** Null for shared (taluka / district) announcements and schemes. */
  tenant: { id: string; slug: string; nameEn: string } | null;
  submittedBy: { id: string; name: string | null };
}

/** A staff member shown next to a website (e.g. the Block Admin column). */
export interface TenantAdminRefDto {
  id: string;
  name: string;
  email: string;
}

/** Row of GET /tenants: the tenant plus the Block Admins whose block contains it. */
export interface TenantListItemDto extends TenantDto {
  blockAdmins: TenantAdminRefDto[];
}

export interface TenantSettingsDto {
  contact?: { address?: string; phone?: string; email?: string; hours?: string };
  social?: { facebook?: string; instagram?: string; youtube?: string; twitter?: string };
  branding?: { logoMediaId?: string; tagline?: { en?: string; mr?: string } };
  seo?: { title?: { en?: string; mr?: string }; description?: { en?: string; mr?: string } };
  weather?: { location: string };
  /** Monthly figures typed in by the GP office; `month` is "YYYY-MM". */
  serviceStats?: { month: string; certificatesIssued?: number; taxCollected?: number; satisfactionRate?: number };
}

export interface AssignmentDto {
  id: string;
  role: Role;
  unitId: string;
  unitLevel: AdminUnitLevel;
  unitNameEn: string;
  unitNameMr: string;
  tenantId: string | null;
  modules: { moduleKey: ModuleKey; canWrite: boolean }[];
  revokedAt: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  locale: Locale;
  status: UserStatus;
  mustResetPassword: boolean;
  lastLoginAt: string | null;
  assignments: AssignmentDto[];
  createdAt: string;
  updatedAt: string;
}

/** GET /api/v1/auth/me */
export interface CurrentUserDto {
  user: Omit<UserDto, "assignments">;
  assignments: AssignmentDto[];
  /** Capability keys the user holds anywhere; UI hints only — the server re-checks everything. */
  capabilities: string[];
}

export interface AnnouncementDto {
  id: string;
  tenantId: string | null;
  ownerUnitId: string;
  category: string;
  priority: AnnouncementPriority;
  titleEn: string | null;
  titleMr: string | null;
  bodyEn: string | null;
  bodyMr: string | null;
  attachmentId: string | null;
  displayPages: string[];
  status: ContentStatus;
  publishAt: string | null;
  expiresAt: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
  eventLocationEn: string | null;
  eventLocationMr: string | null;
  targets: { unitId: string; level: AdminUnitLevel; nameEn: string; nameMr: string }[];
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedById: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public projection — no reviewer/author ids. */
export interface PublicAnnouncementDto {
  id: string;
  category: string;
  priority: AnnouncementPriority;
  titleEn: string | null;
  titleMr: string | null;
  bodyEn: string | null;
  bodyMr: string | null;
  attachmentId: string | null;
  /** Downloads tiles: file details (download via GET /public/:slug/media/:id). Null when none or deleted. */
  attachment: { id: string; kind: MediaKind; name: string; mimeType: string; sizeBytes: number } | null;
  displayPages: string[];
  publishedAt: string | null;
  expiresAt: string | null;
  /** Calendar: event start/end (ISO, UTC); null = not an event. */
  eventStartAt: string | null;
  eventEndAt: string | null;
  eventLocationEn: string | null;
  eventLocationMr: string | null;
  /** True when the announcement was published by a higher-level authority. */
  isShared: boolean;
}

/** Public projection of a citizen success story ("Read Story"). */
export interface PublicSuccessStoryDto {
  id: string;
  /** Page the story is shown on: home, projects, schemes, employment, education, culture, environment. */
  pageKey: string;
  titleEn: string | null;
  titleMr: string | null;
  summaryEn: string | null;
  summaryMr: string | null;
  bodyEn: string | null;
  bodyMr: string | null;
  quoteEn: string | null;
  quoteMr: string | null;
  personName: string | null;
  personRoleEn: string | null;
  personRoleMr: string | null;
  location: string | null;
  photoId: string | null;
  projectId: string | null;
  schemeId: string | null;
  publishedAt: string | null;
}

export interface SuccessStoryDto extends PublicSuccessStoryDto {
  tenantId: string;
  consentConfirmed: boolean;
  sortOrder: number;
  status: ContentStatus;
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /public/:slug/announcements/categories */
export interface PublicAnnouncementCategoryDto {
  category: string;
  count: number;
}

export interface SchemeDto {
  id: string;
  tenantId: string | null;
  ownerUnitId: string;
  level: SchemeLevel;
  nameEn: string | null;
  nameMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  eligibilityEn: string | null;
  eligibilityMr: string | null;
  processEn: string | null;
  processMr: string | null;
  externalUrl: string | null;
  /** Aggregate statistics only — no beneficiary PII. */
  beneficiaryCount: number | null;
  /** Decimal serialised as a string with two decimals, e.g. "150000.50". */
  amountDisbursed: string | null;
  /** Financial year `amountDisbursed` belongs to, e.g. "2026-27"; null = cumulative. */
  disbursedFinancialYear: string | null;
  category: string | null;
  mapImageId: string | null;
  status: ContentStatus;
  targets: { unitId: string; level: AdminUnitLevel; nameEn: string; nameMr: string }[];
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedById: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public projection — no reviewer/author ids. */
export interface PublicSchemeDto {
  id: string;
  level: SchemeLevel;
  nameEn: string | null;
  nameMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  eligibilityEn: string | null;
  eligibilityMr: string | null;
  processEn: string | null;
  processMr: string | null;
  externalUrl: string | null;
  beneficiaryCount: number | null;
  amountDisbursed: string | null;
  disbursedFinancialYear: string | null;
  category: string | null;
  mapImageId: string | null;
  publishedAt: string | null;
  isShared: boolean;
}

export interface ProjectDto {
  id: string;
  tenantId: string;
  stage: ProjectStage;
  nameEn: string | null;
  nameMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  wardNo: string | null;
  year: number | null;
  /** Decimal serialised as a string with two decimals. */
  budget: string | null;
  familiesBenefited: number | null;
  outcomeEn: string | null;
  outcomeMr: string | null;
  /** One-line outcome for cards. */
  outcomeShortEn: string | null;
  outcomeShortMr: string | null;
  coverImageId: string | null;
  beforeImageId: string | null;
  afterImageId: string | null;
  /** Derived from wardNo, e.g. "Ward 3" / "वॉर्ड ३". */
  wardLabelEn: string | null;
  wardLabelMr: string | null;
  status: ContentStatus;
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedById: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public projection — no reviewer/author ids. */
export interface PublicProjectDto {
  id: string;
  stage: ProjectStage;
  nameEn: string | null;
  nameMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  wardNo: string | null;
  year: number | null;
  budget: string | null;
  familiesBenefited: number | null;
  outcomeEn: string | null;
  outcomeMr: string | null;
  outcomeShortEn: string | null;
  outcomeShortMr: string | null;
  coverImageId: string | null;
  beforeImageId: string | null;
  afterImageId: string | null;
  wardLabelEn: string | null;
  wardLabelMr: string | null;
  publishedAt: string | null;
}

/** File metadata. Bytes: `GET /media/:id/file` (admin) or `GET /public/:tenantSlug/media/:id` (public). */
export interface MediaDto {
  id: string;
  tenantId: string | null;
  ownerUnitId: string;
  kind: MediaKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altEn: string | null;
  altMr: string | null;
  /** Null for citizen complaint uploads. */
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrievanceEventDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  fromStatus: GrievanceStatus | null;
  toStatus: GrievanceStatus;
  note: string | null;
  createdAt: string;
}

/** A citizen-uploaded file on a complaint (staff only; bytes via `GET /media/:id/file`). */
export interface GrievanceAttachmentDto {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  kind: MediaKind;
  uploadedAt: string;
}

/** Admin view — includes citizen contact details; never returned publicly. */
export interface GrievanceDto {
  id: string;
  tenantId: string;
  trackingCode: string;
  category: string;
  citizenName: string;
  citizenPhone: string | null;
  citizenEmail: string | null;
  complaintType: string | null;
  subject: string | null;
  location: string | null;
  description: string;
  status: GrievanceStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  events: GrievanceEventDto[];
  attachments: GrievanceAttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

/** Returned once after a public submission. */
export interface PublicGrievanceReceiptDto {
  trackingCode: string;
  status: GrievanceStatus;
  createdAt: string;
}

/** Public status lookup — no citizen details, no staff identities, no internal notes. */
export interface PublicGrievanceStatusDto {
  trackingCode: string;
  category: string;
  complaintType: string | null;
  subject: string | null;
  location: string | null;
  status: GrievanceStatus;
  /** Shown only when RESOLVED/REJECTED. */
  resolutionNote: string | null;
  resolvedAt: string | null;
  timeline: { status: GrievanceStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
}

/** One row of `GET /public/:slug/grievances?phone=…` — deliberately minimal (no subject or notes). */
export interface PublicGrievanceLookupItemDto {
  trackingCode: string;
  category: string;
  complaintType: string | null;
  status: GrievanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SectionRevisionDto {
  id: string;
  version: number;
  status: ContentStatus;
  /** Section data validated by the registry schema (src/config/sections.ts); null when omitted. */
  data: Record<string, unknown> | null;
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedById: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One registered section of a page; `draft`/`published` are null until content exists. */
export interface PageSectionDto {
  sectionKey: string;
  sortOrder: number;
  isVisible: boolean;
  draft: SectionRevisionDto | null;
  published: SectionRevisionDto | null;
}

export interface PageDto {
  id: string;
  tenantId: string;
  pageKey: string;
  isEnabled: boolean;
  seoTitleEn: string | null;
  seoTitleMr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionMr: string | null;
  shareImageId: string | null;
  sections: PageSectionDto[];
  createdAt: string;
  updatedAt: string;
}

/** Public page: published + visible sections only, ordered by `sortOrder`. */
export interface PublicPageDto {
  pageKey: string;
  seo: { titleEn: string | null; titleMr: string | null; descriptionEn: string | null; descriptionMr: string | null; shareImageId: string | null };
  sections: { sectionKey: string; sortOrder: number; data: Record<string, unknown>; publishedAt: string | null }[];
}

// ---------------------------------------------------------------------------
// Scheme ward coverage (aggregate household counts per ward — no personal data)
// ---------------------------------------------------------------------------

export interface SchemeWardCoverageDto {
  schemeId: string;
  tenantId: string;
  wards: WardCoverageRow[];
  totalHouseholds: number;
  totalBeneficiaries: number | null;
  updatedAt: string | null;
}

/** GET /public/:slug/schemes/coverage?schemeId= */
export interface PublicSchemeCoverageDto {
  /** Null when no schemeId was given (totals across all published schemes). */
  schemeId: string | null;
  wards: WardCoverageRow[];
  totalHouseholds: number;
  /** Null when no ward has a beneficiary figure. */
  totalBeneficiaries: number | null;
  /** The scheme's map picture (only with schemeId). Ward polygons come from Home › ward-details. */
  mapImageId: string | null;
}

export interface WardCoverageRow {
  wardNo: string;
  households: number;
  beneficiaries: number | null;
}

// ---------------------------------------------------------------------------
// Public statistics (numbers only; cached ~60 s)
// ---------------------------------------------------------------------------

export interface MonthlyGrievanceCount {
  /** First day of the month, YYYY-MM. */
  month: string;
  received: number;
  resolved: number;
  /** Received in that month and still open or in progress now. */
  pending: number;
}

export interface PublicGrievanceStatsDto {
  total: number;
  resolved: number;
  rejected: number;
  /** OPEN + IN_PROGRESS. */
  pending: number;
  /** resolved / total, as a percentage with one decimal; null when there are no grievances. */
  resolutionRate: number | null;
  lastMonth: GrievanceMonthSnapshot;
  monthBefore: GrievanceMonthSnapshot;
  /** Percentage change in received grievances, last month vs the month before; null when the month before had none. */
  receivedChangePercent: number | null;
  /** Percentage change in grievances resolved, last month vs the month before; null when the month before had none. */
  resolvedChangePercent: number | null;
  /** Percentage change in grievances pending at month end, last month vs the month before; null when the month before had none. */
  pendingChangePercent: number | null;
  /** Change in the cumulative resolution rate at month end, in percentage points (e.g. 2.5 = +2.5 pts); null when unknown. */
  resolutionRateChangePoints: number | null;
  monthly: MonthlyGrievanceCount[];
  byCategory: { category: string; total: number; resolved: number; sharePercent: number }[];
  /** Counts per status, for the escalation summary. */
  byStatus: { OPEN: number; IN_PROGRESS: number; RESOLVED: number; REJECTED: number };
  generatedAt: string;
}

export interface GrievanceMonthSnapshot {
  received: number;
  resolved: number;
  /** OPEN + IN_PROGRESS at the end of the month. */
  pendingAtEnd: number;
  /** Cumulative resolved / received at the end of the month (%, one decimal); null when nothing was received yet. */
  resolutionRate: number | null;
}

export interface PublicSchemeStatsDto {
  totalSchemes: number;
  /** Sum of `beneficiaryCount` over published schemes (null when no scheme has a figure). */
  totalBeneficiaries: number | null;
  /** Sum of `amountDisbursed` over published schemes as a decimal string; not split by financial year. */
  amountDisbursedTotal: string | null;
  /** Sum of `amountDisbursed` over published schemes whose `disbursedFinancialYear` is the current one; null when none is tagged. */
  amountDisbursedThisFinancialYear: string | null;
  /** Households reached by at least one scheme (per-ward maximum of the coverage table). */
  householdsCovered: number | null;
  /** From the published About › geography section. */
  totalHouseholds: number | null;
  /** householdsCovered / totalHouseholds × 100 (one decimal); null when either is unknown. */
  coveragePercent: number | null;
  financialYear: string;
  generatedAt: string;
}

export interface PublicServiceStatsDto {
  /** From settings.serviceStats (typed in monthly by the GP office); null when not entered for this month. */
  certificatesIssuedThisMonth: number | null;
  grievancesResolvedThisMonth: number;
  grievancesReceivedThisMonth: number;
  /** Rupees as a decimal string, from settings.serviceStats; null when not entered for this month. */
  taxCollectedThisMonth: string | null;
  /** % of feedback rated 4–5 (last 90 days, at least 5 ratings), else settings.serviceStats.satisfactionRate, else null. */
  citizenSatisfactionRate: number | null;
  satisfactionSource: "FEEDBACK_RATINGS" | "MANUAL" | null;
  /** Feedback ratings received in the last 90 days. */
  ratingsCount: number;
  month: string;
  generatedAt: string;
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: Role | null;
  tenantSlug: string | null;
  tenantName: string | null;
  /** SUCCESS, or FAILURE (e.g. wrong password) / DENIED (e.g. suspended account). */
  result: "SUCCESS" | "FAILURE" | "DENIED";
  ipAddress: string | null;
  userAgent: string | null;
  tenantId: string | null;
  unitId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface PublicTenantDto {
  id: string;
  slug: string;
  nameEn: string;
  nameMr: string;
  defaultLocale: Locale;
  settings: TenantSettingsDto;
}

// ---------------------------------------------------------------------------
// Contact-page form submissions (admin only; never returned publicly)
// ---------------------------------------------------------------------------

export interface FormSubmissionDto {
  id: string;
  kind: "FEEDBACK" | "VOLUNTEER" | "TREE_ADOPTION";
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  /** Feedback only. */
  subject: string | null;
  /** Volunteer and tree adoption. */
  address: string | null;
  /** Volunteer only. */
  areaOfInterest: string | null;
  /** Feedback only, 1–5. */
  rating: number | null;
  message: string | null;
  /** Tree adoption: { treeCount, species, preferredLocation }. */
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface FormSubmissionSummaryDto {
  feedback: { total: number; last30Days: number };
  volunteer: { total: number; last30Days: number };
  treeAdoption: { total: number; last30Days: number };
}
