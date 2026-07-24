CREATE TYPE "CommercialFunnelEventName" AS ENUM (
  'CHECK_STARTED',
  'SITE_RESOLVED',
  'QUICK_SITE_CHECK_SAVED',
  'PROJECT_PROMOTED',
  'DETAILED_PLANNING_PACK_GENERATED',
  'DETAILED_PLANNING_PACK_READY',
  'DETAILED_PLANNING_PACK_UNRESOLVED',
  'PLANNING_FEASIBILITY_SUMMARY_GENERATED',
  'SEE_GENERATED',
  'EXPERT_REVIEW_PACKAGE_GENERATED',
  'HANDOFF_COPIED',
  'HANDOFF_DOWNLOADED'
);

CREATE TYPE "CommercialFunnelEventSource" AS ENUM (
  'SERVER_CONFIRMED',
  'VERIFIED_INTERACTION'
);

CREATE TYPE "CommercialFunnelExclusionReason" AS ENUM (
  'NON_PRODUCTION',
  'DEMO_PROJECT',
  'INTERNAL_PROJECT',
  'DEV_BYPASS'
);

CREATE TABLE "CommercialFunnelEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "artefactId" TEXT,
  "eventName" "CommercialFunnelEventName" NOT NULL,
  "source" "CommercialFunnelEventSource" NOT NULL,
  "funnelVersion" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "includedInConversion" BOOLEAN NOT NULL,
  "exclusionReason" "CommercialFunnelExclusionReason",
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommercialFunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercialFunnelEvent_idempotencyKey_key"
  ON "CommercialFunnelEvent"("idempotencyKey");
CREATE INDEX "CommercialFunnelEvent_eventName_occurredAt_idx"
  ON "CommercialFunnelEvent"("eventName", "occurredAt");
CREATE INDEX "CommercialFunnelEvent_includedInConversion_occurredAt_idx"
  ON "CommercialFunnelEvent"("includedInConversion", "occurredAt");
CREATE INDEX "CommercialFunnelEvent_expiresAt_idx"
  ON "CommercialFunnelEvent"("expiresAt");
CREATE INDEX "CommercialFunnelEvent_projectId_eventName_idx"
  ON "CommercialFunnelEvent"("projectId", "eventName");

ALTER TABLE "CommercialFunnelEvent"
  ADD CONSTRAINT "CommercialFunnelEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommercialFunnelEvent"
  ADD CONSTRAINT "CommercialFunnelEvent_artefactId_fkey"
  FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
