## Integration-source checkpoint: corrected synthetic records

Robbie approved completing the positive in-memory source records. The integration
test now supplies exact linked citations for permissibility, height, FSR and lot
size. The former incomplete case remains an explicit rejection test. No production
validator, compiler, evidence rule, entitlement check or application behavior was
weakened to make it pass.

Local validation: full TypeScript PASS, focused ESLint PASS, all 8 new integration
tests PASS. Both Byron and Kempsey exercise the real saved-record parsers, memo
generator, source loader, canonical compiler and document renderer, producing
valid project-specific working DOCX/PDF snapshots. The other cases reject unpaid
or revoked scope, missing retained spatial proof, substituted council/project,
changed or expired sources and uncited assessments. Database records exist only
in memory; this is not hosted acceptance or authentic council-source evidence.

The new tests are included with the renderer suite in isolated Linux CI. Their
native Vitest result on the new commit is pending. The previous source revision
a7782f49744bbd051d5082f70f59f87d386fd00f had 134 focused tests and separate
credential-free Next compilation pass in run 36542483021. Do not count the new
total as a passing Linux run until that run is inspected.

Remaining: actual protected Preview source availability; independently authorised
Preview migration/deployment; both-council customer generation/download/reopening;
permissions, warnings, versions and native Word/PDF review. The full-build
synthetic database smoke remains unresolved, and uploaded plans/reports are not
independently incorporated by this generation path. Commercial HOLD.

Publication stays on deployment-disabled draft PR #452. Production checkout remains
disabled and Production data/schema unchanged. Other documentation branches and
immutable Item 78C acceptance are untouched. No live credentials or private
documents are introduced by these tests.

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
