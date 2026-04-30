-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AGREEMENT_CHANGE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_CHANGES_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'CHANGE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_READY_TO_RELEASE';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_TEST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimelineEventType" ADD VALUE 'MILESTONE_UPDATED';
ALTER TYPE "TimelineEventType" ADD VALUE 'MILESTONE_DELETED';
ALTER TYPE "TimelineEventType" ADD VALUE 'MILESTONES_REORDERED';
ALTER TYPE "TimelineEventType" ADD VALUE 'PAYMENT_STATUS_CHANGED';
ALTER TYPE "TimelineEventType" ADD VALUE 'PAYMENT_ESCALATED_TO_AI';
ALTER TYPE "TimelineEventType" ADD VALUE 'PAYMENT_READY_TO_RELEASE';
ALTER TYPE "TimelineEventType" ADD VALUE 'PAYMENT_ON_HOLD';

-- AlterTable
ALTER TABLE "EmailNotification" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "previewHtml" TEXT,
ADD COLUMN     "previewText" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "requestId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN     "preferredCurrency" TEXT NOT NULL DEFAULT 'SAR',
ADD COLUMN     "specialization" TEXT;

-- CreateIndex
CREATE INDEX "EmailNotification_recipientEmail_idx" ON "EmailNotification"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailNotification_type_idx" ON "EmailNotification"("type");

-- CreateIndex
CREATE INDEX "EmailNotification_createdAt_idx" ON "EmailNotification"("createdAt");
