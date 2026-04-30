-- Data migration: map legacy enum values before altering the enum type
-- PENDING records become DRAFT (unsent drafts)
-- PAID records become FUNDED (funded change requests)
UPDATE "ChangeRequest" SET status = 'DRAFT' WHERE status = 'PENDING';
UPDATE "ChangeRequest" SET status = 'FUNDED' WHERE status = 'PAID';

-- Replace ChangeRequestStatus enum with 8-value target lifecycle
BEGIN;
CREATE TYPE "ChangeRequestStatus_new" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'FUNDED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED');
ALTER TABLE "ChangeRequest" ALTER COLUMN "status" TYPE "ChangeRequestStatus_new" USING ("status"::text::"ChangeRequestStatus_new");
ALTER TYPE "ChangeRequestStatus" RENAME TO "ChangeRequestStatus_old";
ALTER TYPE "ChangeRequestStatus_new" RENAME TO "ChangeRequestStatus";
DROP TYPE "public"."ChangeRequestStatus_old";
COMMIT;

-- Add new columns for AI review linking, timestamps, and timeline estimation
ALTER TABLE "ChangeRequest"
ADD COLUMN     "aiReviewId" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "fundedAt" TIMESTAMP(3),
ADD COLUMN     "timelineDays" INTEGER;

-- Add indexes for new FK and payment status filtering
CREATE INDEX "ChangeRequest_aiReviewId_idx" ON "ChangeRequest"("aiReviewId");
CREATE INDEX "ChangeRequest_paymentStatus_idx" ON "ChangeRequest"("paymentStatus");

-- Add foreign key constraint for AI review reference
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_aiReviewId_fkey" FOREIGN KEY ("aiReviewId") REFERENCES "AIReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
