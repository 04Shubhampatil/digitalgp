-- Soft delete for user accounts (additive, nullable).
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
