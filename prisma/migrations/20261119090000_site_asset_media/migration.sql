-- AlterEnum
ALTER TYPE "MediaSource" ADD VALUE 'SITE_ASSET';

-- AlterTable
ALTER TABLE "Scheme" ADD COLUMN     "benefitCaptionEn" TEXT,
ADD COLUMN     "benefitCaptionMr" TEXT,
ADD COLUMN     "benefitValueEn" TEXT,
ADD COLUMN     "benefitValueMr" TEXT;

