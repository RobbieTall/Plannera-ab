-- Persist consented, immutable consultant referral snapshots and their delivery audit trail.
CREATE TYPE "ConsultantReferralStatus" AS ENUM (
  'SUBMITTED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'CONSULTANT_ACKNOWLEDGED',
  'NEEDS_INFORMATION',
  'DECLINED',
  'CLOSED'
);

CREATE TYPE "ConsultantReferralActorType" AS ENUM ('USER', 'OPERATOR', 'SYSTEM');

ALTER TYPE "CommercialFunnelEventName" ADD VALUE 'CONSULTANT_REFERRAL_SUBMITTED';

CREATE TABLE "ConsultantReferral" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reviewRequestArtefactId" TEXT NOT NULL,
  "submittedByUserId" TEXT,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactFingerprint" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "packageSnapshot" JSONB NOT NULL,
  "packageDigest" TEXT NOT NULL,
  "queueTarget" TEXT NOT NULL DEFAULT 'plannera_human_queue',
  "scopeKey" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "ConsultantReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "deleteAfter" TIMESTAMP(3),
  CONSTRAINT "ConsultantReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsultantReferralEvent" (
  "id" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "fromStatus" "ConsultantReferralStatus",
  "toStatus" "ConsultantReferralStatus" NOT NULL,
  "actorType" "ConsultantReferralActorType" NOT NULL,
  "reasonCode" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsultantReferralEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultantReferral_reviewRequestArtefactId_key" ON "ConsultantReferral"("reviewRequestArtefactId");
CREATE UNIQUE INDEX "ConsultantReferral_scopeKey_key" ON "ConsultantReferral"("scopeKey");
CREATE UNIQUE INDEX "ConsultantReferral_idempotencyKey_key" ON "ConsultantReferral"("idempotencyKey");
CREATE INDEX "ConsultantReferral_projectId_submittedAt_idx" ON "ConsultantReferral"("projectId", "submittedAt");
CREATE INDEX "ConsultantReferral_status_submittedAt_idx" ON "ConsultantReferral"("status", "submittedAt");
CREATE INDEX "ConsultantReferral_deleteAfter_idx" ON "ConsultantReferral"("deleteAfter");
CREATE INDEX "ConsultantReferralEvent_referralId_occurredAt_idx" ON "ConsultantReferralEvent"("referralId", "occurredAt");

ALTER TABLE "ConsultantReferral" ADD CONSTRAINT "ConsultantReferral_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantReferral" ADD CONSTRAINT "ConsultantReferral_reviewRequestArtefactId_fkey"
  FOREIGN KEY ("reviewRequestArtefactId") REFERENCES "Artefact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantReferral" ADD CONSTRAINT "ConsultantReferral_submittedByUserId_fkey"
  FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsultantReferralEvent" ADD CONSTRAINT "ConsultantReferralEvent_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "ConsultantReferral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
