## Linux validation and integration-test checkpoint

Published source head a7782f49744bbd051d5082f70f59f87d386fd00f was tested by
[run 36542483021](https://github.com/RobbieTall/Plannera-ab/actions/runs/36542483021)
on GitHub's PR merge snapshot 4a4318886d3f0c3dedc6f0247636915a6f959e21 against
unchanged main ff2179e06f68a8f265d7cc0b873cd28320a4da6b.
Full TypeScript and all **134 focused tests passed: 108 document, 11 build-safety,
15 renderer**. The separate credential-free Next compilation job passed.
The complete vercel-build remains FAILED at the unchanged synthetic-database
smoke (engine-free Prisma rejects the localhost datasource protocol). Nothing was
disabled to obtain a green result; no full-build or commercial pass is claimed.

A further integration test is prepared locally only in
src/lib/see-document-generation.integration.test.ts. It exercises the actual
saved-record parsers, memo generator, source loader, compiler and renderer with
in-memory database doubles. Global Prisma access, external fetch and sockets were
blocked by the local harness. TypeScript passes. Five rejection tests pass; the
two expected-success council cases fail because the newly authored test data left
permissibility, FSR and minimum-lot-size assessments uncited. The compiler reports
three uncited_planning_control issues and the loader correctly rejects them.
This is not evidence that hosted generation works, nor grounds to weaken checks.

Next narrow correction: complete the positive in-memory test records and their
exact linked citations, preserving the incomplete-source case as a rejection test.
Do not fabricate or relabel real source evidence. Approval to correct this newly
introduced test-data mistake has been requested. The new test is not published
or included in CI yet. No application code was changed during this checkpoint.

After that, prove protected Preview source availability and actual both-council
generation/download/reopening, versions, permissions and native Word/PDF review.
Preview migration/deployment still require scoped approval. Production checkout
stays disabled; no Production data/schema, deployment, merge or cloud changes.
Commercial HOLD. Mobile branches and immutable Item 78C evidence remain untouched.

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
