# Working SEE council integration checkpoint

Date: 2026-09-30
Scope: draft PR #452; Byron and Kempsey customer Word/PDF journey.

## Current implementation

The normal site-saving path can retrieve official NSW council-point identity only
in explicitly enabled Preview. The original bounded response, retrieval time and
fingerprint are retained with exact site/revision/point binding. Conflicting
candidate labels, missing proof and expired evidence are rejected for ordinary-pack
document generation. Older zoning-only records remain readable but cannot supply
council proof. The genuine existing assessment path is preserved.

This identifies a queried point's council, not parcel extent, address accuracy,
statutory controls or complete LGA coverage. No existing records are backfilled.
No new schema change is included in this integration.

The four approved synthetic test-fixture corrections explicitly supply a null
council name where no name is present. Application rules and assertions are unchanged.

## Validation

Local full TypeScript and focused lint PASS.
180 unique local tests PASS:
- 140 core, council and storage tests.
- 18 importer and generation integration tests.
- 11 pack-capture tests.
- 11 build-safety tests.

Tests use in-memory fixtures and synthetic configuration; the local harness blocks
external fetch/socket access. They do not establish genuine planning evidence.
The build-safety contract passes. Native Linux CI and separate compilation for this
new revision are pending. No new complete vercel-build pass is claimed: the earlier
synthetic database-smoke incompatibility remains unresolved, not bypassed.

## Remaining commercial gates

- Exact-revision Linux validation and compilation.
- Separately authorised isolated Preview prerequisites, including the existing
  unapplied working_see enum change and genuine fresh source/provenance capture.
- Both councils' real customer generation, private download, original-version
  reopening, permissions, evidence warnings and document-version checks.
- Native Word/PDF visual inspection of the actual generated customer files.

The earlier canonical documents' adapter-only and typing-blocker checkpoints are
superseded by this narrow status record. Their historical evidence is preserved;
full historical-document reconciliation remains pending privacy-safe publication.
Do not interpret any earlier acceptance run as proof of the current hosted journey.

## Safety and handover

Publication is only to the deployment-disabled draft feature branch. No merge,
manual deployment, migration, source ingestion, cloud setting change, real payment
or Production data/schema mutation is performed by this checkpoint. Production
checkout stays disabled. Immutable acceptance evidence and other documentation
branches remain untouched. Research Viewer, Project Controls and live-user pilots
remain deferred.

Commercial decision: HOLD until the actual protected customer document journey is
proven. No Production activation is authorised.
