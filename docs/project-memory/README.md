## Current commercial blocker: normal source capture is not yet connected

PR #452 source commit 3ef7a7d2ee5517ac0de285c878b1172e6828c586 passes full
TypeScript, **142 focused Linux tests (108 document + 11 safety + 15 renderer +
8 source-join integration tests)** and separate credential-free Next compilation
in [run 36546394798](https://github.com/RobbieTall/Plannera-ab/actions/runs/36546394798).
The GitHub PR merge snapshot starts cefab02. The full vercel-build still fails
the unchanged synthetic database smoke; neither that gate nor commercial launch
is green.

Read-only aggregate/schema inspection of the two existing acceptance Preview
databases confirmed:
- They are distinct non-default branches/endpoints; Production was not queried.
- The required tables exist, but working_see is not yet an ArtefactType enum value.
- Existing site rows are present, with council names and many zones/coordinates,
  but their canonical lgaCode fields are unset.
- Neither branch has SiteSpatialProvenance, PathwayAssessment or
  PathwayEvidenceSnapshot records. No data, flags, schema or documents were changed.

The new loader requires a PathwayArtefactBinding and exact saved source snapshots.
The ordinary createDetailedPlanningPackArtefact flow in src/lib/artefact-service.ts
saves the planning-pack payload but does not create those records. Therefore a
deployment or enum migration alone cannot complete this customer journey.
The passing integration test supplies in-memory records; it does not prove normal
planning-pack creation produces them or that any live source is authoritative.

Next correction: connect ordinary project/site and planning-pack creation to real,
versioned source capture, or provide an appropriate reviewed source-capture adapter
rather than repurposing pathway records blindly. Preserve full source identity,
retrieval/version/freshness, exact clause and project/site/pack bindings, original
bytes/versions and explicit evidence gaps. Test the normal upstream creation flow,
not just preassembled records. Do not manufacture source proof, promote synthetic
snapshots, fill council codes by assumption, or weaken existing checks.
Approval for correcting this newly identified integration gap is requested.

After that: scoped approval for isolated Preview migration/deployment, then actual
Byron/Kempsey generation/download/reopening, permissions, versions, warnings and
native Word/PDF review. Uploaded plans/reports are still not independently
incorporated by this generation path and remain explicitly qualified.

Commercial HOLD. Generation flags remain default-off and Preview-only. Production
checkout remains disabled, Production data/schema unchanged. No deployment, merge,
migration, private document access or payment action. Other documentation branches
and immutable Item 78C evidence remain untouched. No repeated secret setup or
test payment is indicated by this finding.

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
