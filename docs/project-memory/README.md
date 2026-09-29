## Current local checkpoint: corrections and ordinary-pack source capture

Robbie approved correcting the test mistakes and zone-code/display-label mismatch,
and continuing the document goal while away. Work remains local and unpublished;
the source code in draft PR #452 is still at the earlier 142-test checkpoint
(source 3ef7a7d2ee5517ac0de285c878b1172e6828c586, documentation 6cee1d2765e0285f0bbe45cf47b5da46cf9e9890).
This status update does not publish the local application changes.

### Local implementation and checks

- Timestamp assertions and PDF-parser mock interoperability are corrected.
  All 14 new DCP retention/importer cases now pass within the combined local run.
  Both real importer functions are exercised with mocked HTTP/PDF parsing and
  in-memory transactions only. No ingestion was run against external sources or a database.
- The provenance adapter now intends to retain the official lookup code separately
  from its readable label, and the loader consumes that lookup code. However, a
  newly introduced over-escaping error in the label matcher still rejects formatted
  labels. Combined run: 30/39 pass; nine fail at formatted-label retention. Do not
  claim this correction or either council's generation integration currently passes.
- New see-document-pack-source-capture.ts captures actual server-loaded LEP/DCP row
  identities, original retrieval/version metadata, exact clause-text fingerprints,
  and project/site/QSC/pack digests. It reads current source rows again to detect
  replacements, expiry and source changes. No fake PathwayAssessment is created.
- The normal createDetailedPlanningPackArtefact flow now has a local default-off,
  Preview-only PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 hook. The capture is
  stored in the same new Artefact payload as the pack; legacy packs are untouched.
  Missing proof is recorded as UNAVAILABLE and does not prevent saving the DPP.
- The new source-capture suite has 9/11 passes. Its two normal-DPP cases stop before
  capture because the new test QSC omits required interpretation strings for
  unavailable controls. Three new TypeScript errors are also confined to this test:
  overly narrow mutable metadata types and a Promise/PrismaPromise mock assignment.
  Application files produced no diagnostics in that TypeScript run, but the full
  type check is FAILED and the upstream normal-flow tests are NOT proven.
- Test/harness failures above are mistakes in this new work, not inherited main
  failures. No validation rule was weakened. Local tests prohibit external network
  and global database access. Native Linux CI has not run for these local changes.

### Resume without recreating work

Use the existing isolated working copy and PR #452. Thirteen local changed/new
source/test/workflow files are preserved. Correct the newly disclosed label-matcher
escaping and test fixture/typing issues after Robbie approves; do not replace tests
with permissive mocks or treat synthetic data as authoritative planning evidence.
Then finish the source-envelope consumption in the generation loader: it STILL
requires the older Pathway binding and does not yet consume the new normal-pack
capture. Prove the actual DPP -> memo -> source recheck -> DOCX/PDF flow for both
councils, not merely preassembled snapshots. Wire the new suite into isolated CI.

Canonical lgaCode fields and saved spatial provenance remain missing in the
previously inspected Preview fixtures; the working_see enum migration is unapplied.
Do not infer council codes, bulk backfill evidence, or assume refreshing a site
solves the label mismatch. Existing DCP rows lack the new retention envelope and
must not be silently promoted. Seven-day source freshness is an operational policy,
not proof that an instrument is legally current or applicable.

After local corrections: re-establish push safety, publish validated changes only,
then obtain scoped isolated Preview migration/deployment approval and prove customer
generation/download/original-version reopening, permissions, warnings, versions
and native Word/PDF presentation. The unchanged full-build synthetic database smoke
still fails; separate Next compilation is not a full-build or commercial pass.
Uploaded plans/reports are still explicitly not independently incorporated.

### Safety and handover

Only these status documents are being published. PR #452's exact branch deployment
disable rule is retained; current PR/main metadata is unchanged and the latest
20-deployment inventory contains no deployment for this branch. Existing isolated
CI uses synthetic configuration; stateful workflows are not dispatched.

No merge, deployment, cloud setting change, real source ingestion, database/schema
write, private-document access or payment action. Production checkout remains
disabled. Other mobile documentation branches, Research Viewer/Project Controls
scope and immutable Item 78C evidence are preserved. Commercial HOLD.
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
