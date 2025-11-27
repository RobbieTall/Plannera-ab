-- Add zoning fields to project for NSW zoning lookups
ALTER TABLE "Project"
ADD COLUMN "zoningCode" TEXT,
ADD COLUMN "zoningName" TEXT,
ADD COLUMN "zoningSource" TEXT;
