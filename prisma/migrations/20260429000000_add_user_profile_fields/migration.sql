ALTER TABLE "UserSettings"
ADD COLUMN "businessName" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "specialization" TEXT,
ADD COLUMN "preferredCurrency" TEXT NOT NULL DEFAULT 'SAR',
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'ar';
