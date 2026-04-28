-- Add quiz and analysis context fields to Lead without breaking existing data
ALTER TABLE "Lead"
ADD COLUMN "niche" TEXT,
ADD COLUMN "hasWebsite" BOOLEAN,
ADD COLUMN "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "leadsPerMonth" TEXT,
ADD COLUMN "detectedPlatform" TEXT;
