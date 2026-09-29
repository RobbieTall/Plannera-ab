## Current document-generation status: approved corrections applied

This checkpoint supersedes the earlier unpublished TypeScript-failure/approval
blocker. Robbie approved the narrow corrections. The throwing guard now uses a
function declaration so TypeScript narrows rejected records correctly; bound
evidence snapshots are explicitly ordered by immutable ID before source signatures
are calculated. No evidence, ownership or payment checks were weakened.

Validation on this corrected local revision:
- Full TypeScript check: PASS.
- 108 document tests in one combined run: PASS, including 5 direct loader
  authorization-denial tests. The local runner uses pure TypeScript transpilation
  plus Node tests; TypeScript was checked separately.
- 11 build-safety tests and static contract: PASS (7 commands, 6 entries,
  14 transitive sources).
- Focused ESLint: PASS, no warnings.
- These are 119 local tests across the two test commands, not 119 document tests.
  The 15 renderer tests and full Next compilation require the new exact-commit
  Linux run; do not inherit earlier-commit results or claim 134 tests passed yet.

The five loader tests are now included in the isolated CI workflow. They establish
early authorization failures only, not a successful complete database/source join.
The new generation endpoint/UI/source validation is draft code, not hosted
acceptance evidence. Uploaded plans/reports remain explicitly unincorporated and
the generated document remains qualified, not submission-ready.

Publication is limited to draft PR #452's deployment-disabled branch. Main and
mobile documentation branches are unchanged; immutable Item 78C evidence is
preserved. No migration, stateful acceptance, cloud flag, private file or Production
data/schema change was performed. Keep Production checkout disabled.

Next: record the new exact-commit Linux results in PR #452 / Issue #395, then prove
actual saved-source availability and the protected Preview customer journey.
An isolated Preview enum migration and deployment still need their scoped approval.
The earlier full vercel-build synthetic database-smoke failure remains unresolved;
a passing Next compilation alone is not database-readiness evidence.
Commercial decision remains HOLD pending those checks and native Word/PDF review.

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
