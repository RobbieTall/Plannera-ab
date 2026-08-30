-- Item 74H protected Preview evidence-package assembly.
-- Applied only by scripts/item74h-preview-migrate.ts after exact Vercel branch,
-- Preview environment, isolated Neon endpoint, and checkout-off checks.

CREATE TABLE IF NOT EXISTS "PathwayPrivateEvidencePackageAssembly" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'PREVIEW',
  "packageRef" TEXT NOT NULL,
  "assemblyVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "documentCount" INTEGER NOT NULL,
  "reviewSetDigest" TEXT NOT NULL,
  "siteEvidenceDigest" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "recordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PathwayPrivateEvidencePackageAssembly_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageAssembly_idempotency_key"
  ON "PathwayPrivateEvidencePackageAssembly" ("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageAssembly_record_hash_key"
  ON "PathwayPrivateEvidencePackageAssembly" ("recordHash");
CREATE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageAssembly_package_idx"
  ON "PathwayPrivateEvidencePackageAssembly" ("packageRef", "createdAt");

CREATE TABLE IF NOT EXISTS "PathwayPrivateEvidencePackageItem" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "evidenceRef" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "reviewRecordHash" TEXT NOT NULL,
  CONSTRAINT "PathwayPrivateEvidencePackageItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PathwayPrivateEvidencePackageItem_assembly_fkey"
    FOREIGN KEY ("assemblyId")
    REFERENCES "PathwayPrivateEvidencePackageAssembly" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PathwayPrivateEvidencePackageItem_promotion_fkey"
    FOREIGN KEY ("promotionId")
    REFERENCES "PathwayPrivateEvidencePromotion" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PathwayPrivateEvidencePackageItem_review_fkey"
    FOREIGN KEY ("reviewRecordHash")
    REFERENCES "PathwayPrivateEvidenceOperatorReview" ("recordHash")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageItem_assembly_role_key"
  ON "PathwayPrivateEvidencePackageItem" ("assemblyId", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageItem_assembly_evidence_key"
  ON "PathwayPrivateEvidencePackageItem" ("assemblyId", "evidenceRef");
CREATE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageItem_promotion_idx"
  ON "PathwayPrivateEvidencePackageItem" ("promotionId");
CREATE INDEX IF NOT EXISTS "PathwayPrivateEvidencePackageItem_review_idx"
  ON "PathwayPrivateEvidencePackageItem" ("reviewRecordHash");
