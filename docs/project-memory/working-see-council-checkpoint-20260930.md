## Offline CI correction: real database readiness remains required

The previous CI failure was caused by asking an engine-free client with a dummy
localhost URL to perform genuine database readiness checks. Changing the URL or
client mode would not supply the missing database or verified council data.
Prisma documents --no-engine as omitting the query engine for Accelerate:
https://www.prisma.io/docs/accelerate/getting-started

The isolated document workflow now tests the offline failure boundary explicitly:
both unchanged smoke scripts must exit with the specific missing-database error
and their BLOCKED decision. Success, crashes, timeouts and unrelated failures do
not count as expected rejection. The runner clears database aliases, service
credentials, NODE_OPTIONS and dotenv file loading, and never echoes child diagnostics.
It reports database readiness NOT ASSESSED, never READY.

Actual package.json vercel-build, both smoke scripts, Prisma generation, the build
contract and its reviewed fingerprints remain unchanged. Real Vercel builds still
must pass both database gates before compilation. No live readiness check was
removed, bypassed, reclassified as a pass or replaced by synthetic council evidence.
The existing smoke-enforcement workflow checks build wiring, not real database data.

Local full TypeScript, focused lint, six new offline-guard regressions and all
eleven build-safety tests PASS. The actual child CLI checks will run in Linux CI;
the local regressions inject a runner because the local native tooling restriction
has not been bypassed. Exact-revision Linux results for this correction are pending.

No deployment, merge, database/schema mutation, source ingestion, service secret
change or Production action occurred. The exact feature-branch deployment-disable
rule remains unchanged. Commercial HOLD pending actual protected Preview proof.
The older full-build failure below is retained as historical evidence, not a
current hosted-readiness result. This checkpoint does not authorise Production.

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
The build-safety contract passes. GitHub run 36635473044 tested application source
28e2a8d3080f38e1a48c99d4627551e9780d165d through its PR merge snapshot against
unchanged main. Full TypeScript and 195 Linux tests PASS: 140 core tests,
44 native Vitest tests (including 15 renderer tests), and 11 build-safety tests.
The separate credential-free Next compilation job 109634914043 PASSED, including
all 37 static pages and optimisation.

The isolated-validation job 109634913692 FAILED only after those tests, at the
unchanged full vercel-build database smoke. Engine-free Prisma rejects the
synthetic localhost PostgreSQL URL because it requires prisma:// or
prisma+postgres://. No live credential was substituted and no gate was disabled.
Compilation is not database readiness or hosted customer acceptance. The complete
build remains NOT green.

Run: https://github.com/RobbieTall/Plannera-ab/actions/runs/36635473044

## Remaining commercial gates

- Resolve the full-build synthetic database-smoke incompatibility without masking readiness failures; exact-revision Linux tests and separate compilation are proven above.
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
