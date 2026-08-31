-- Item 74H registered-plan reconciliation, protected Preview only.
-- Applied only by scripts/item74h-preview-migrate.ts after exact Vercel branch,
-- Preview environment, isolated Neon endpoint, and checkout-off checks.

ALTER TABLE "PathwayPrivateEvidenceOperatorReview"
  DROP CONSTRAINT "PathwayPrivateEvidenceOperatorReview_role_check",
  ADD CONSTRAINT "PathwayPrivateEvidenceOperatorReview_role_check"
    CHECK ("role" IN (
      'ROAD_CLASSIFICATION',
      'REGISTERED_CADASTRAL_PLAN',
      'CADASTRAL_SURVEY',
      'PROPOSED_SHED_LAYOUT'
    ));

ALTER TABLE "PathwayPrivateEvidencePromotion"
  DROP CONSTRAINT "PathwayPrivateEvidencePromotion_role_check",
  ADD CONSTRAINT "PathwayPrivateEvidencePromotion_role_check"
    CHECK ("role" IN (
      'ROAD_CLASSIFICATION',
      'REGISTERED_CADASTRAL_PLAN',
      'CADASTRAL_SURVEY',
      'PROPOSED_SHED_LAYOUT'
    ));

ALTER TABLE "PathwayPrivateEvidencePackageAssembly"
  DROP CONSTRAINT "PathwayPrivateEvidencePackageAssembly_version_check",
  ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_version_check"
    CHECK ("assemblyVersion" = 'item74h-private-evidence-package-assembly.v2'),
  DROP CONSTRAINT "PathwayPrivateEvidencePackageAssembly_document_count_check",
  ADD CONSTRAINT "PathwayPrivateEvidencePackageAssembly_document_count_check"
    CHECK ("documentCount" = 4);

ALTER TABLE "PathwayPrivateEvidencePackageItem"
  DROP CONSTRAINT "PathwayPrivateEvidencePackageItem_role_check",
  ADD CONSTRAINT "PathwayPrivateEvidencePackageItem_role_check"
    CHECK ("role" IN (
      'ROAD_CLASSIFICATION',
      'REGISTERED_CADASTRAL_PLAN',
      'CADASTRAL_SURVEY',
      'PROPOSED_SHED_LAYOUT'
    ));
