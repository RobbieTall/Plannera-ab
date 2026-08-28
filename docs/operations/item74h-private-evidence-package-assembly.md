# Item 74H private evidence-package assembly

Status: **IMPLEMENTED AS PREVIEW-ONLY CONTRACT / HOSTED SYNTHETIC FLIGHT PENDING**

## Purpose

This boundary converts three independently reviewed private evidence documents into one durable, replay-safe candidate for the existing real-site evidence assessor.

The assembly is not a paid-product unlock. It cannot enable the A$49 Planning Controls Pack, the A$749 submission SEE, or Production checkout.

## Required evidence roles

Exactly one current record is required for each role:

- ROAD_CLASSIFICATION
- CADASTRAL_SURVEY
- PROPOSED_SHED_LAYOUT

Each document must bind exactly to its private evidence reference and content hash, one READY_FOR_EVIDENCE_PACKAGE promotion, one immutable EVIDENCE_VERIFIED operator-review record, and the promotion's exact review-record hash.

The service replaces all caller-supplied verification fields with values derived from the immutable review record before invoking the established real-site assessor. A caller therefore cannot self-assert review status, reviewer identity, review time, or review notes.

## Fail-closed rules

Assembly is denied outside the protected Preview path, when the feature flag is disabled, when authenticated operator context is absent, when references are invalid, when the authoritative draft is absent, when the role set is incomplete or duplicated, when any immutable binding differs, when the existing real-site rules fail, or when persistence and replay cannot be proven.

## Persistence and replay

PathwayPrivateEvidencePackageAssembly stores the package binding, review-set digest, confirmed site-evidence digest, request hash, record hash, and replay key.

PathwayPrivateEvidencePackageItem stores exactly three role bindings. Database foreign keys retain the reviewed promotion and immutable operator-review chain.

A replay with the same request returns the existing assembly. A changed request using the same key is denied.

## Protected Preview acceptance

The hosted acceptance script is scripts/item74h-evidence-package-preview-acceptance.ts.

Normal builds and CI run it with ITEM74H_EVIDENCE_PACKAGE_ACCEPTANCE_ENABLED=false, producing SKIPPED_FEATURE_DISABLED.

A synthetic flight may run only on Vercel Preview for branch agent/item74h-pathway-check, using the approved isolated Item 74H Neon endpoint, while both checkout flags remain disabled and the branch-only acceptance flag is enabled.

The flight uses synthetic records only, proves create and replay behavior, checks exactly three persisted role items, deletes in foreign-key-safe order, and fails unless review, promotion, assembly, and item residue are all zero.

Never place secret values, private evidence references, hashes, reviewer references, page references, database hosts, or synthetic document bytes in logs, pull-request comments, or screenshots.

## Commercial boundary

A successful assembly means only READY_FOR_REAL_SITE_ASSESSMENT. It records that the existing assessor confirmed the evidence package.

It does not mean the Planning Controls Pack is eligible. That later transition still requires the complete evidence groups and exact-scope trust rules.

It does not mean the submission SEE is eligible. That later transition still requires evidence-aware uploads, exact-scope binding, and OPERATOR_APPROVED.

Production checkout remains disabled.
