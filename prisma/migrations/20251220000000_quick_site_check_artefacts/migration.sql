-- Make artefact fields optional to support non-image entries and add payload storage
ALTER TABLE "Artefact" ALTER COLUMN "source" DROP NOT NULL;
ALTER TABLE "Artefact" ALTER COLUMN "overlays" DROP NOT NULL;
ALTER TABLE "Artefact" ALTER COLUMN "overlays" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "Artefact" ALTER COLUMN "imageUrl" DROP NOT NULL;
ALTER TABLE "Artefact" ADD COLUMN     "payload" JSONB;
ALTER TABLE "Artefact" ALTER COLUMN "capturedAt" DROP NOT NULL;
ALTER TABLE "Artefact" ALTER COLUMN "capturedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Extend artefact types for Quick Site Check
ALTER TYPE "ArtefactType" ADD VALUE IF NOT EXISTS 'quick_site_check';
