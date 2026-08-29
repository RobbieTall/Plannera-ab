ALTER TABLE "SpatialEvidence"
  ADD COLUMN "applicabilityTopics" JSONB;

ALTER TABLE "SpatialEvidenceReviewEvent"
  ADD COLUMN "topics" JSONB NOT NULL DEFAULT '[]'::jsonb;
