-- CreateEnum
CREATE TYPE "AdminUnitLevel" AS ENUM ('STATE', 'DISTRICT', 'TALUKA', 'BLOCK', 'GRAM_PANCHAYAT');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'MR', 'HI');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TALUKA_ADMIN', 'BLOCK_ADMIN', 'GP_ADMIN', 'DATA_ENTRY_OPERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SchemeLevel" AS ENUM ('CENTRAL', 'STATE', 'DISTRICT', 'GRAM_PANCHAYAT');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AdminUnit" (
    "id" TEXT NOT NULL,
    "level" "AdminUnitLevel" NOT NULL,
    "code" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameMr" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameMr" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultLocale" "Locale" NOT NULL DEFAULT 'MR',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'MR',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "unitId" TEXT NOT NULL,
    "grantedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulePermission" (
    "id" TEXT NOT NULL,
    "roleAssignmentId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "canWrite" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seoTitleEn" TEXT,
    "seoTitleMr" TEXT,
    "seoDescriptionEn" TEXT,
    "seoDescriptionMr" TEXT,
    "shareImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "draftId" TEXT,
    "publishedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "ownerUnitId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "titleEn" TEXT,
    "titleMr" TEXT,
    "bodyEn" TEXT,
    "bodyMr" TEXT,
    "attachmentId" TEXT,
    "displayPages" TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTarget" (
    "announcementId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "AnnouncementTarget_pkey" PRIMARY KEY ("announcementId","unitId")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "ownerUnitId" TEXT NOT NULL,
    "level" "SchemeLevel" NOT NULL,
    "nameEn" TEXT,
    "nameMr" TEXT,
    "descriptionEn" TEXT,
    "descriptionMr" TEXT,
    "eligibilityEn" TEXT,
    "eligibilityMr" TEXT,
    "processEn" TEXT,
    "processMr" TEXT,
    "externalUrl" TEXT,
    "beneficiaryCount" INTEGER,
    "amountDisbursed" DECIMAL(14,2),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeTarget" (
    "schemeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "SchemeTarget_pkey" PRIMARY KEY ("schemeId","unitId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL,
    "nameEn" TEXT,
    "nameMr" TEXT,
    "descriptionEn" TEXT,
    "descriptionMr" TEXT,
    "wardNo" TEXT,
    "year" INTEGER,
    "budget" DECIMAL(14,2),
    "familiesBenefited" INTEGER,
    "outcomeEn" TEXT,
    "outcomeMr" TEXT,
    "coverImageId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "ownerUnitId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altEn" TEXT,
    "altMr" TEXT,
    "uploadedById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "citizenName" TEXT NOT NULL,
    "citizenPhone" TEXT,
    "citizenEmail" TEXT,
    "description" TEXT NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grievance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrievanceEvent" (
    "id" TEXT NOT NULL,
    "grievanceId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "GrievanceStatus",
    "toStatus" "GrievanceStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrievanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "tenantId" TEXT,
    "unitId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUnit_code_key" ON "AdminUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUnit_path_key" ON "AdminUnit"("path");

-- CreateIndex
CREATE INDEX "AdminUnit_level_idx" ON "AdminUnit"("level");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUnit_parentId_slug_key" ON "AdminUnit"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_unitId_key" ON "Tenant"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "RoleAssignment_unitId_idx" ON "RoleAssignment"("unitId");

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_revokedAt_idx" ON "RoleAssignment"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_role_unitId_key" ON "RoleAssignment"("userId", "role", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePermission_roleAssignmentId_moduleKey_key" ON "ModulePermission"("roleAssignmentId", "moduleKey");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_tenantId_pageKey_key" ON "Page"("tenantId", "pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Section_draftId_key" ON "Section"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_publishedId_key" ON "Section"("publishedId");

-- CreateIndex
CREATE INDEX "Section_tenantId_idx" ON "Section"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_pageId_sectionKey_key" ON "Section"("pageId", "sectionKey");

-- CreateIndex
CREATE INDEX "SectionRevision_tenantId_status_idx" ON "SectionRevision"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SectionRevision_sectionId_version_key" ON "SectionRevision"("sectionId", "version");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_status_idx" ON "Announcement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Announcement_ownerUnitId_status_idx" ON "Announcement"("ownerUnitId", "status");

-- CreateIndex
CREATE INDEX "Announcement_status_publishAt_idx" ON "Announcement"("status", "publishAt");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_unitId_idx" ON "AnnouncementTarget"("unitId");

-- CreateIndex
CREATE INDEX "Scheme_tenantId_status_idx" ON "Scheme"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Scheme_ownerUnitId_status_idx" ON "Scheme"("ownerUnitId", "status");

-- CreateIndex
CREATE INDEX "SchemeTarget_unitId_idx" ON "SchemeTarget"("unitId");

-- CreateIndex
CREATE INDEX "Project_tenantId_status_idx" ON "Project"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Project_tenantId_stage_idx" ON "Project"("tenantId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_tenantId_kind_idx" ON "Media"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_trackingCode_key" ON "Grievance"("trackingCode");

-- CreateIndex
CREATE INDEX "Grievance_tenantId_status_idx" ON "Grievance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GrievanceEvent_grievanceId_idx" ON "GrievanceEvent"("grievanceId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AdminUnit" ADD CONSTRAINT "AdminUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePermission" ADD CONSTRAINT "ModulePermission_roleAssignmentId_fkey" FOREIGN KEY ("roleAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_shareImageId_fkey" FOREIGN KEY ("shareImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "SectionRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_publishedId_fkey" FOREIGN KEY ("publishedId") REFERENCES "SectionRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRevision" ADD CONSTRAINT "SectionRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRevision" ADD CONSTRAINT "SectionRevision_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AdminUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTarget" ADD CONSTRAINT "SchemeTarget_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AdminUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "AdminUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceEvent" ADD CONSTRAINT "GrievanceEvent_grievanceId_fkey" FOREIGN KEY ("grievanceId") REFERENCES "Grievance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceEvent" ADD CONSTRAINT "GrievanceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
