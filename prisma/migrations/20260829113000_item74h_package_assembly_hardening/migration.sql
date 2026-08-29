-- Item 74H protected Preview evidence-package schema hardening.
-- Additive and replay-safe because the original package migration has already
-- been applied to the isolated Item 74H Preview database.
--
-- This migration:
-- 1. aligns createdAt with Prisma's DateTime -> TIMESTAMP(3) mapping; and
-- 2. mirrors the application contract with database-level integrity checks.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PathwayPrivateEvidencePackageAssembly'
      AND column_name = 'createdAt'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)
      USING "createdAt" AT TIME ZONE 'UTC';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_environment_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_environment_check"
      CHECK ("environment" = 'PREVIEW');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_version_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_version_check"
      CHECK ("assemblyVersion" = 'item74h-private-evidence-package-assembly.v1');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_status_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_status_check"
      CHECK ("status" = 'READY_FOR_REAL_SITE_ASSESSMENT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_document_count_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_document_count_check"
      CHECK ("documentCount" = 3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_package_ref_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_package_ref_check"
      CHECK ("packageRef" ~ '^[A-Za-z0-9_-]{8,160}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_idempotency_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_idempotency_check"
      CHECK ("idempotencyKey" ~ '^[A-Za-z0-9:_-]{8,200}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageAssembly_hashes_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_hashes_check"
      CHECK (
        "reviewSetDigest" ~ '^[a-f0-9]{64}$' AND
        "siteEvidenceDigest" ~ '^[a-f0-9]{64}$' AND
        "requestHash" ~ '^[a-f0-9]{64}$' AND
        "recordHash" ~ '^[a-f0-9]{64}$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageItem_role_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageItem"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageItem_role_check"
      CHECK ("role" IN (
        'ROAD_CLASSIFICATION',
        'CADASTRAL_SURVEY',
        'PROPOSED_SHED_LAYOUT'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageItem_evidence_ref_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageItem"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageItem_evidence_ref_check"
      CHECK ("evidenceRef" ~ '^[A-Za-z0-9_-]{8,160}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageItem_promotion_ref_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageItem"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageItem_promotion_ref_check"
      CHECK ("promotionId" ~ '^[A-Za-z0-9_-]{8,160}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PathwayPrivateEvidencePackageItem_hashes_check'
  ) THEN
    ALTER TABLE "PathwayPrivateEvidencePackageItem"
      ADD CONSTRAINT "PathwayPrivateEvidencePackageItem_hashes_check"
      CHECK (
        "contentHash" ~ '^[a-f0-9]{64}$' AND
        "reviewRecordHash" ~ '^[a-f0-9]{64}$'
      );
  END IF;
END
$$;
