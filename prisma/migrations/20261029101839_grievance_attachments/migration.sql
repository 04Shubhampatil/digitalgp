-- CreateTable
CREATE TABLE "GrievanceAttachment" (
    "grievanceId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrievanceAttachment_pkey" PRIMARY KEY ("grievanceId","mediaId")
);

-- CreateIndex
CREATE INDEX "GrievanceAttachment_mediaId_idx" ON "GrievanceAttachment"("mediaId");

-- AddForeignKey
ALTER TABLE "GrievanceAttachment" ADD CONSTRAINT "GrievanceAttachment_grievanceId_fkey" FOREIGN KEY ("grievanceId") REFERENCES "Grievance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceAttachment" ADD CONSTRAINT "GrievanceAttachment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
