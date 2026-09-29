## Current local checkpoint: ordinary-pack generation connected

The approved label-matcher and QSC interpretation corrections are applied.
The new application changes remain LOCAL and UNPUBLISHED. Draft PR #452's
published application code remains source 3ef7a7d2ee5517ac0de285c878b1172e6828c586;
this checkpoint replaces the status recorded by documentation commit
8ca3aa94a41cffe73028e6fb615e37c53dd970dd. Do not confuse documentation publication
with application publication, Preview deployment, or acceptance.

### Implemented locally

- Normal Byron/Kempsey DCP importers retain actual retrieval time, original PDF
  fingerprint and exact stored clause-text fingerprint. All external I/O in their
  tests is mocked; no real source ingestion has run.
- Retained zoning stores the authoritative lookup code separately from its readable
  label. Formatted labels now pass without allowing conflicting codes.
- Normal DPP creation has a default-off, Preview-only
  PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 hook. It stores a source envelope
  in the same NEW pack payload. Legacy packs are untouched; missing proof remains
  UNAVAILABLE and does not prevent saving a qualified DPP.
- The generation loader now consumes that ordinary-pack envelope after owner,
  exact paid entitlement, memo/QSC/pack and retained spatial checks. It rereads
  current LEP/DCP records and validates original version, URL, text and timestamps.
  It does not create a pretend PathwayAssessment. The existing genuine assessment
  path remains available for packs without an ordinary capture; a present invalid
  capture cannot fall back to another proof path.
- Shared citation checks preserve exact excerpts, official-source requirements,
  trust-marker rejection and retrieval times. Row persistence may follow source
  retrieval; the original capture time bounds row changes, not a fabricated new
  retrieval time. Operational seven-day freshness is not statutory currency.
- The isolated workflow now includes the ordinary-pack capture test suite.

### Evidence and remaining validation failures

The latest network-blocked combined local run PASSED 60/60:
17 spatial retention, 16 planning-source validation, 10 DCP capture,
4 mocked importer integration, and 13 document-generation integration tests.
The five added integration tests include Byron and Kempsey ordinary-capture
DOCX/PDF generation without any PathwayAssessment, paid-scope ordering, changed
source rejection and invalid-capture/no-fallback behaviour. Existing eight
assessment-path integration tests still pass.

Separately, the ordinary-pack capture suite last ran 10/11 PASS, including both
normal createDetailedPlanningPackArtefact capture tests. Its remaining failure is
a newly introduced TEST-ONLY newline before an 'as unknown as' assertion in
src/lib/see-document-pack-source-capture.test.ts:140. Full TypeScript stops on
TS1434 there. A scoped diagnostic check excluding that file found one additional
TEST-ONLY TS2322 in src/lib/see-document-generation.integration.test.ts:195:
the new in-memory project object lacks fields of ProjectWithOptionalSiteContext.
Both narrow test corrections require the requested approval; neither is corrected
yet. They are new-work mistakes, not inherited main failures. No full TypeScript,
new Linux CI, new build or commercial pass is claimed.

These are in-memory records, real application parsers/compiler/rendering, and
mocked database/HTTP adapters. They are NOT proof of real statutory sources,
cloud ingestion, protected Preview customer downloads, native Word/PDF reopening,
or the complete normal DPP -> memo -> generation journey in one external run.
No synthetic records may be promoted as planning evidence.

### Exact next work and handover

Preserve the existing isolated working copy and fourteen changed/new application,
test and workflow files. Correct the two test-only issues after approval, rerun
the complete checks without exclusions, then establish push safety and publish
the validated application patch to PR #452. Do not recreate configuration, ask for
keys, repin acceptance or overwrite concurrent mobile documentation work.

The latest read-only Preview inventory still leaves prerequisites unresolved:
canonical council codes, saved authoritative spatial provenance, retained current
DCP source envelopes, and the working_see enum migration. No evidence backfill
or code inference from council display names is authorized by this checkpoint.
Obtain scoped approval before isolated Preview schema/ingestion/deployment work.
Then prove customer generation, private download, original-version reopening,
wrong-user/wrong-project rejection, warnings, document versions and native
Word/PDF layout for BOTH councils.

The earlier published 142-test Linux checkpoint applies only to source 3ef7a7d.
Its credential-free Next compilation passed, but full vercel-build still failed
at the unchanged synthetic Prisma database smoke. That remains unresolved.
Uploaded plans/reports are explicitly not independently incorporated by this
generation path.

### Safety and commercial decision

Documentation-only publication retains the exact PR branch deployment-disable
rule. Before this update PR #452 remained draft/unmerged at 8ca3aa9; main remained
ff2179e06f68a8f265d7cc0b873cd28320a4da6b. The latest 20-deployment inventory had no
deployment for this branch. Previously audited automatic workflows remain
unchanged; no stateful workflow is dispatched.

No application push, merge, deployment, cloud settings, real ingestion,
database/schema write, payment action or private-document publication occurred.
Production checkout remains disabled; Production data/schema are untouched.
Immutable Item 78C acceptance is unchanged. Research Viewer, Project Controls and
the practitioner/pilot documentation remain compatible and deferred.
Commercial decision: HOLD pending the actual protected customer document journey.
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
