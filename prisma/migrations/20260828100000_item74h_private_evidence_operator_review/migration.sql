-- Item 74H protected Preview operator-review persistence.
-- Additive and replay-safe. These records may promote one document into an
-- evidence package candidate, but cannot unlock a paid artefact.

BEGIN;

CREATE TABLE IF NOT EXISTS "PathwayPrivateEvidenceOperatorReview" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
    "evidenceRef" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "reviewerRef" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "pageReferences" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "rejectionCode" TEXT,
    "reviewVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "recordHash" TEXT NOT NULL,
    "previousRecordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_environment_check"
      CHECK ("environment" = 'PREVIEW'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_version_check"
      CHECK ("reviewVersion" = 'item74h-private-evidence-operator-review.v1'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_evidence_ref_check"
      CHECK ("evidenceRef" ~ '^[A-Za-z0-9_-]{8,160}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_content_hash_check"
      CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_role_check"
      CHECK ("role" IN ('ROAD_CLASSIFICATION', 'CADASTRAL_SURVEY', 'PROPOSED_SHED_LAYOUT')),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_status_check"
      CHECK ("status" IN ('PENDING', 'EVIDENCE_VERIFIED', 'REJECTED')),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_actor_ref_check"
      CHECK ("actorRef" ~ '^[A-Za-z0-9_-]{8,160}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_reviewer_ref_check"
      CHECK ("reviewerRef" IS NULL OR "reviewerRef" ~ '^[A-Za-z0-9_-]{8,160}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_page_refs_check"
      CHECK (jsonb_typeof("pageReferences") = 'array' AND jsonb_array_length("pageReferences") <= 20),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_revision_check"
      CHECK ("revision" >= 1),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_request_hash_check"
      CHECK ("requestHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_record_hash_check"
      CHECK ("recordHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_previous_hash_check"
      CHECK ("previousRecordHash" IS NULL OR "previousRecordHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_chain_check"
      CHECK (
        ("revision" = 1 AND "previousRecordHash" IS NULL) OR
        ("revision" > 1 AND "previousRecordHash" IS NOT NULL)
      ),
    CONSTRAINT "PathwayPrivateEvidenceOperatorReview_state_shape_check"
      CHECK (
        (
          "status" = 'PENDING' AND
          "revision" = 1 AND
          "reviewerRef" IS NULL AND
          "reviewedAt" IS NULL AND
          jsonb_array_length("pageReferences") = 0 AND
          "rejectionCode" IS NULL
        ) OR (
          "status" = 'EVIDENCE_VERIFIED' AND
          "revision" > 1 AND
          "reviewerRef" IS NOT NULL AND
          "reviewedAt" IS NOT NULL AND
          jsonb_array_length("pageReferences") BETWEEN 1 AND 20 AND
          "rejectionCode" IS NULL
        ) OR (
          "status" = 'REJECTED' AND
          "revision" > 1 AND
          "reviewerRef" IS NOT NULL AND
          "reviewedAt" IS NOT NULL AND
          jsonb_array_length("pageReferences") = 0 AND
          "rejectionCode" IN (
            'UNREADABLE',
            'WRONG_DOCUMENT',
            'STALE',
            'UNBOUND_TO_SITE',
            'MEASUREMENTS_UNVERIFIABLE',
            'AUTHORITY_UNVERIFIABLE',
            'OTHER_STRUCTURED'
          )
        )
      )
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidenceOperatorReview_idempotencyKey_key"
  ON "PathwayPrivateEvidenceOperatorReview"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidenceOperatorReview_recordHash_key"
  ON "PathwayPrivateEvidenceOperatorReview"("recordHash");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidenceOperatorReview_evidence_revision_key"
  ON "PathwayPrivateEvidenceOperatorReview"("evidenceRef", "contentHash", "revision");
CREATE INDEX IF NOT EXISTS "PathwayPrivateEvidenceOperatorReview_latest_idx"
  ON "PathwayPrivateEvidenceOperatorReview"("evidenceRef", "contentHash", "revision" DESC);

CREATE TABLE IF NOT EXISTS "PathwayPrivateEvidencePromotion" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
    "evidenceRef" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "reviewRecordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promotionVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayPrivateEvidencePromotion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PathwayPrivateEvidencePromotion_environment_check"
      CHECK ("environment" = 'PREVIEW'),
    CONSTRAINT "PathwayPrivateEvidencePromotion_content_hash_check"
      CHECK ("contentHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidencePromotion_review_hash_check"
      CHECK ("reviewRecordHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "PathwayPrivateEvidencePromotion_role_check"
      CHECK ("role" IN ('ROAD_CLASSIFICATION', 'CADASTRAL_SURVEY', 'PROPOSED_SHED_LAYOUT')),
    CONSTRAINT "PathwayPrivateEvidencePromotion_status_check"
      CHECK ("status" = 'READY_FOR_EVIDENCE_PACKAGE'),
    CONSTRAINT "PathwayPrivateEvidencePromotion_version_check"
      CHECK ("promotionVersion" = 'item74h-private-evidence-promotion.v1'),
    CONSTRAINT "PathwayPrivateEvidencePromotion_review_fkey"
      FOREIGN KEY ("reviewRecordHash")
      REFERENCES "PathwayPrivateEvidenceOperatorReview"("recordHash")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePromotion_idempotencyKey_key"
  ON "PathwayPrivateEvidencePromotion"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePromotion_scope_key"
  ON "PathwayPrivateEvidencePromotion"("evidenceRef", "contentHash", "role");
CREATE INDEX IF NOT EXISTS "PathwayPrivateEvidencePromotion_review_idx"
  ON "PathwayPrivateEvidencePromotion"("reviewRecordHash");

COMMIT;
