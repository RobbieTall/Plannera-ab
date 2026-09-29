## Current checkpoint: Linux proof complete; protected Preview prerequisites absent

Both approved test-only corrections are complete: the mock type assertion stays
on its expression line, and the in-memory integration project supplies every
required Project field with a checked type. No application validation or evidence
requirement was weakened. This commit publishes the previously local source-capture
and ordinary-pack generation work to DRAFT PR #452, not to main or a deployment.

### Implemented

- Byron and Kempsey importers retain actual source retrieval time, original PDF
  SHA-256 and exact stored clause-text SHA-256. Original composite hashes are not
  relabelled as clause-text fingerprints. Legacy rows are not backfilled.
- Saved zoning retains the authoritative lookup code separately from its display
  label and rejects conflicting labels.
- Normal DPP creation has a default-off Preview-only source-capture hook:
  PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 AND VERCEL_ENV=preview.
  Capture is stored in the SAME NEW pack payload; unavailable evidence is explicit
  and does not prevent saving a qualified DPP.
- After owner, exact paid entitlement, memo/QSC/pack and saved spatial checks,
  generation consumes the ordinary pack's source envelope and rereads current
  LEP/DCP records. No pretend PathwayAssessment is manufactured.
- The genuine existing assessment path is retained for packs without an ordinary
  capture. A present invalid capture cannot fall back to different evidence.
- Shared checks enforce exact citations/excerpts, source identity, version,
  freshness, body fingerprints and trust markers. Source retrieval timestamps are
  never reset to document-generation time. Capture time bounds later row persistence.
- Isolated CI includes the new capture/importer and ordinary-pack generation tests.

### Validation evidence for this application revision

Local synthetic, credential-free validation is complete:
- FULL TypeScript PASS, without excluding either corrected test file.
- Focused ESLint PASS across all fourteen changed application/test/workflow files'
  TypeScript entries.
- 121 core document/source/provenance Node tests PASS.
- 4 importer integration + 13 generation integration + 11 pack capture tests PASS.
  Total: 149 UNIQUE document-related tests. The overlapping combined 60-test run
  also passed but is not added again to this total.
- Build-safety contract PASS: 7 permitted commands, 6 entries, 14 transitive sources.
  Its 11 regression tests PASS. Total local focused tests including safety: 160.

The integration tests use in-memory databases and mocked HTTP/PDF import I/O,
with real saved-record parsers, memo compiler, source rechecks and DOCX/PDF renderer.
Both ordinary-capture council cases and the eight existing assessment-path cases
pass. Both normal createDetailedPlanningPackArtefact capture cases pass.
Network/global database use is forbidden by the local harness.

These results do NOT establish authentic statutory evidence, cloud ingestion,
protected Preview customer downloads, native Word/PDF reopening, or one complete
normal DPP -> memo -> generation -> delivery run. No synthetic test records may
be promoted as planning evidence. GitHub run 36558368296 now confirms FULL TypeScript and 175 focused Linux tests
PASS: 121 core Node + 43 native Vitest (including 15 renderer) + 11 safety.
Source commit 2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 was tested through PR merge
snapshot 2e4bddfaeebd52c5d1e057b3b2a7c431cc3a3142 against unchanged main.
The separate credential-free Next compilation job 109372924835 PASSED, including
37 static pages and optimization. This was compilation, NOT a Production deployment.

The isolated-validation job 109372924997 still FAILED after all tests at full
vercel-build's unchanged synthetic Prisma database smoke: an engine-free client
requires prisma:// or prisma+postgres:// rather than the synthetic localhost
Postgres URL. No live credential was substituted and no check was disabled.
Twelve other applicable PR workflows passed their automatic non-stateful checks.
The full build gate and commercial readiness remain NOT green.

The earlier 142-test Linux/Next compilation result belongs only to source 3ef7a7d.
Its complete vercel-build failed at the unchanged synthetic Prisma database smoke;
that is still unresolved, not bypassed or presented as a full-build pass.
Existing dependency advisories remain subject to release-risk assessment.

### Current protected Preview evidence (read-only recheck)

Both previously identified council targets are still distinct, non-default Neon
branches with their expected independent endpoints. Production was not queried.
Explicit READ ONLY transactions with an eight-second statement timeout returned
aggregate counts only; no address, person, document body or credential was read.

For BOTH targets:
- working_see is still absent from the ArtefactType enum.
- No SiteContext has a BYRON/KEMPSEY canonical council code.
- No saved SiteSpatialProvenance record exists.
- No relevant DCPClause row has the new sourceCapture envelope.
- No current Byron/Kempsey LEP row has retrieval within the seven-day policy.

Therefore a deployment alone cannot prove customer generation. Fresh source
ingestion must preserve genuine retrieval/provenance, not relabel existing data.
The normal site resolver's persistence currently uses candidate.lgaCode or null;
canonical council identity needs an evidence-based normal-flow solution, not a
manual code backfill or an assumed council from an address string. That application
prerequisite must be completed/proven before calling a Preview rehearsal ready.

Preserve the existing acceptance snapshots and source revisions. Prepare separate
document-rehearsal targets where writes are needed, then obtain scoped approval
for their additive schema step, source refresh and protected deployment. No such
write, branch creation, migration, ingestion or deployment has occurred here.

### Resume and remaining commercial gates

The test-correction approval blocker is resolved. Continue from this draft PR,
not a new branch or recreated cloud setup. The exact-commit Linux results are above. Next prepare the separately
authorized isolated Preview prerequisites: canonical council identity from actual
resolution, saved authoritative spatial evidence, current retained LEP/DCP source
envelopes and the unapplied working_see enum migration. Do not guess council codes,
bulk backfill evidence or run importers under this documentation update.

Protected Preview must then prove BOTH councils' actual customer generation,
private download, original-version reopening, wrong-user/wrong-project rejection,
evidence warnings, document versions and native Word/PDF presentation. Uploaded
plans/reports remain explicitly not independently incorporated by this path.
Seven-day source freshness is an operational policy, not statutory currency proof.

### Deployment safety and status

Before this documentation-only update, draft application head
2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 and
main ff2179e06f68a8f265d7cc0b873cd28320a4da6b were unchanged. The retained exact
branch deployment-disable rule for feat/see-document-delivery-20260929 remains
in vercel.json; the latest twenty-deployment inventory contains no deployment for
this branch. Previously inspected automatic workflows remain unchanged except
the isolated, credential-free test-list extension. Stateful workflows are not
dispatched. Static checks do not guarantee arbitrary dependency behaviour.

Publication is to the existing draft feature branch only, without force, merge,
deployment command, schema/data mutation, real ingestion, cloud setting changes,
payment action or private-document publication. Production checkout remains off.
Other mobile documentation branches and immutable Item 78C evidence are untouched.
Research Viewer, Project Controls, practitioner governance and live-user pilots
remain compatible and deferred. Commercial decision remains HOLD pending the
actual protected customer document journey. No Production activation is authorized.
## Guarded document generation draft

PR #452 now connects the Preview-only working Word/PDF generation action to saved
source and paid-access checks. It remains default-off, unmerged and undeployed.
Hosted customer proof is still missing; commercial HOLD. Read the current document
delivery handover and Issue #395 for exact source-format limits and next approvals.
Production checkout remains disabled by the operating constraint; no Production
settings/data/schema were changed. Other documentation branches are untouched.

## Current document-delivery prerequisite

PR #452 now includes default-off, Preview-only retention of site lookup provenance.
It is not deployed or evidence of a completed customer generation journey.
Commercial HOLD; Production checkout remains disabled by the operating constraint.
See [the current handover](see-document-delivery-handover.md)
for exact limits, validation references and remaining work. Other documentation
branches and immutable Item 78C evidence remain untouched.

> Document-delivery draft update: PR #452 now includes Preview workspace saved-version/Word/PDF controls and a protected paginated metadata endpoint. Approved typing corrections complete: full TypeScript, lint, 59 document tests and 11 build-safety tests pass locally. Linux validation now passes 85 focused tests, full TypeScript and the complete credential-free Next build at code commit 210dfb2; the unchanged full-build database smoke and actual hosted journey remain unproven. Commercial HOLD. See the draft [delivery handover](see-document-delivery-handover.md). Mobile PR #451 and both deferred pilots are unchanged.

# Plannera Project Memory

## Current delivery checkpoint - 29 September 2026

**Commercial HOLD; Production activation is not authorised.** Item 78C's protected
run [36426605240](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240)
passed with `READY_FOR_NON_PRODUCTION_ACCEPTANCE`. That synthetic gate does not
prove customer Word/PDF delivery. The current task reconciles presentation PRs
#433/#434/#435 and completes real protected Preview generation, downloads and
reopening for independent Byron/Kempsey projects. Draft presentation, private
persistence and download code now pass 69 focused Linux tests, TypeScript and
the credential-free application build at `0a081d39fd026d2fd7608e8913cc6c666150509d`
([run 36533924975](https://github.com/RobbieTall/Plannera-ab/actions/runs/36533924975)).
Trusted generation, customer UI, an unapplied isolated Preview enum migration and
real hosted delivery remain. The full release-build database smoke is not green.
These changes are in draft PR #452, not merged main; no deployment has occurred.

Read the [current delivery handover](see-document-delivery-handover.md) first. Preserve draft PR #450's
acceptance closeout and immutable runner evidence. Older dated status entries
below are historical, not instructions to recreate fixtures or rerun old pins.
Research Viewer (#448) and Project Controls (#449) remain deferred. Keep
Production checkout disabled and Production data/schema unchanged.

This folder is the canonical, in-repo product memory for Plannera.

Its purpose is to keep strategic direction durable and discoverable so planning, product, and engineering decisions stay aligned over time.

## What belongs here

- product philosophy and positioning references
- architecture decisions and constraints
- roadmap priorities and sequencing
- current focus and next actions
- confidence and quality standards

## Source-of-truth map

1. Product philosophy: `docs/plannera-product-philosophy.md`
2. JIT LGA architecture: `docs/architecture/just-in-time-lga-activation.md`
3. Council Edition strategy: `docs/project-memory/council-assessment-strategy.md`
4. Project memory index (this folder): `docs/project-memory/README.md`
5. Build-next queue: `docs/project-memory/build-next.md`
6. Active decisions register: `docs/project-memory/decision-register.md`

## Maintenance rule

Any PR that changes product direction, delivery model, confidence policy, or roadmap sequencing must update at least one file in `docs/project-memory/`.

Every merged Codex task must also update `docs/project-memory/build-next.md` to mark the completed item as ✅ DONE and add any follow-up items discovered. If the task changes LGA coverage state, active focus, or next actions, update this file too so anyone picking up the project can read the current state without digging through git history.
