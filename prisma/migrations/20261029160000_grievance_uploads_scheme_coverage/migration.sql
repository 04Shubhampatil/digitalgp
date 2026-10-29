-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('ADMIN', 'PUBLIC_GRIEVANCE');

-- AlterTable: anonymous citizen uploads have no uploader; mark their origin and expiry.
ALTER TABLE "Media" ALTER COLUMN "uploadedById" DROP NOT NULL;
ALTER TABLE "Media" ADD COLUMN "source" "MediaSource" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "Media" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Media_source_expiresAt_idx" ON "Media"("source", "expiresAt");

-- CreateTable
CREATE TABLE "SchemeWardCoverage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "wardNo" TEXT NOT NULL,
    "households" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeWardCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchemeWardCoverage_tenantId_schemeId_wardNo_key" ON "SchemeWardCoverage"("tenantId", "schemeId", "wardNo");
CREATE INDEX "SchemeWardCoverage_tenantId_wardNo_idx" ON "SchemeWardCoverage"("tenantId", "wardNo");

-- AddForeignKey
ALTER TABLE "SchemeWardCoverage" ADD CONSTRAINT "SchemeWardCoverage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemeWardCoverage" ADD CONSTRAINT "SchemeWardCoverage_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
