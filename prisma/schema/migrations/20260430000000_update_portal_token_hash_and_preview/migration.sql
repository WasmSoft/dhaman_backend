-- AlterEnum
ALTER TYPE "PortalTokenType" ADD VALUE 'CHANGE_REQUEST_REVIEW';

-- DropIndex
DROP INDEX "PortalToken_token_key";

-- AlterTable
ALTER TABLE "PortalToken" DROP COLUMN "token",
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "tokenPreview" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PortalToken_tokenHash_key" ON "PortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalToken_type_idx" ON "PortalToken"("type");

-- CreateIndex
CREATE INDEX "PortalToken_expiresAt_idx" ON "PortalToken"("expiresAt");
