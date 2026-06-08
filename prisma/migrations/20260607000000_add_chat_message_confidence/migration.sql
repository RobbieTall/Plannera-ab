ALTER TABLE "ChatMessage" ADD COLUMN "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "ChatMessage" ADD COLUMN "confidenceBreakdown" JSONB;
