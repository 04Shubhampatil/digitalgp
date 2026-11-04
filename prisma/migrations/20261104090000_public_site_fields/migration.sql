-- AlterEnum
ALTER TYPE "FormSubmissionKind" ADD VALUE 'TREE_ADOPTION';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "eventEndAt" TIMESTAMP(3),
ADD COLUMN     "eventLocationEn" TEXT,
ADD COLUMN     "eventLocationMr" TEXT,
ADD COLUMN     "eventStartAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Scheme" ADD COLUMN     "category" TEXT,
ADD COLUMN     "disbursedFinancialYear" TEXT,
ADD COLUMN     "mapImageId" TEXT;

-- AlterTable
ALTER TABLE "SchemeWardCoverage" ADD COLUMN     "beneficiaries" INTEGER;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "afterImageId" TEXT,
ADD COLUMN     "beforeImageId" TEXT,
ADD COLUMN     "outcomeShortEn" TEXT,
ADD COLUMN     "outcomeShortMr" TEXT;

-- AlterTable
ALTER TABLE "Grievance" ADD COLUMN     "complaintType" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "result" TEXT NOT NULL DEFAULT 'SUCCESS';

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "address" TEXT,
ADD COLUMN     "areaOfInterest" TEXT,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleMr" TEXT,
    "summaryEn" TEXT,
    "summaryMr" TEXT,
    "bodyEn" TEXT,
    "bodyMr" TEXT,
    "quoteEn" TEXT,
    "quoteMr" TEXT,
    "personName" TEXT,
    "personRoleEn" TEXT,
    "personRoleMr" TEXT,
    "location" TEXT,
    "photoId" TEXT,
    "projectId" TEXT,
    "schemeId" TEXT,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
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

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuccessStory_tenantId_status_idx" ON "SuccessStory"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SuccessStory_tenantId_pageKey_idx" ON "SuccessStory"("tenantId", "pageKey");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_category_idx" ON "Announcement"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_eventStartAt_idx" ON "Announcement"("tenantId", "eventStartAt");

-- CreateIndex
CREATE INDEX "Grievance_tenantId_citizenPhone_idx" ON "Grievance"("tenantId", "citizenPhone");

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_mapImageId_fkey" FOREIGN KEY ("mapImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_beforeImageId_fkey" FOREIGN KEY ("beforeImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_afterImageId_fkey" FOREIGN KEY ("afterImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: every website gets a (disabled) "progress" page row so admins can enable it.
INSERT INTO "Page" ("id", "tenantId", "pageKey", "isEnabled", "createdAt", "updatedAt")
SELECT replace(gen_random_uuid()::text, '-', ''), t."id", 'progress', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Page" p WHERE p."tenantId" = t."id" AND p."pageKey" = 'progress');
