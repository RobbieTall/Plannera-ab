# Plannera autonomous session closeout — 2 October 2026

Status: **READY FOR BROWSER-ASSISTANT CONTINUATION / COMMERCIAL HOLD**

This is the canonical closeout of the 2 October autonomous backlog-cleanup session.

## Repository state

- Repository: `RobbieTall/Plannera-ab`
- Main: `ff2179e06f68a8f265d7cc0b873cd28320a4da6b` — unchanged throughout this session.
- Only open PR: **#452** — `feat/see-document-delivery-20260929`.
- #452 remains **draft**. Do not merge.
- Tested current application/safety head: `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38`.
- GitHub reports the PR mergeable/clean at that tested head.
- All **13 exact-head GitHub Actions passed** at `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38`.

No Production deployment, checkout activation, Production schema/data mutation, payment/refund, secret/environment change or merge occurred.

## PR backlog cleanup completed

The following stale parallel PRs are closed **without merge**:

- #419 — council-employed planner pathway
- #422 — consultant returned reports
- #424 — LGA preparation service truth
- #426 — consultant credential disclosure
- #429 — representative Byron/Kempsey golden journeys
- #433 — professional document structure
- #434 — professional SEE presentation
- #435 — front matter / deterministic contents
- #438 — OCR lifecycle
- #448 — Research Viewer roadmap
- #449 — Project Controls roadmap
- #450 — Item 78C status reconciliation
- #451 — practitioner workflow / live pilots

Their useful intent has not been discarded. It has been reconciled into current task cards on #452. Historical branches/commits remain recoverable.

Do not reopen or batch-merge these PRs as a shortcut.

## SEE presentation correction

The autonomous session identified the exact-head synthetic PDF's near-empty standalone **Document Status** page.

Current renderer lineage now:
- reserves Proposal Summary + Document Status/working metadata together;
- slightly compacts Document Control PDF rows so the professional front matter remains on one page for the representative synthetic case;
- requires the same PDF page stream to contain:
  - DOCUMENT CONTROL
  - Revision History
  - Proposal Summary
  - Document Status
- preserves the current Word TOC, PDF dynamic page references, evidence/readiness logic and document-control content.

Relevant code lineage:
- `625d01920a33ecbc5f42bfcce8d14d248707fb59` — keep status with proposal front matter;
- `8d91ef553827ef7b6fcfff4946d114501b8fa20f` — compact PDF control rows / strengthen regression;
- `ae972dd21618d9c8169a0b5da059c90526f971d6` — improve build-fingerprint failure reporting;
- `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38` — reviewed exact renderer fingerprint.

The build-safety gate initially failed the unreviewed renderer change exactly as designed. The actual reviewed renderer SHA-256 was recorded and the clean head then passed all 13 checks.

### Synthetic native visual acceptance passed

Green tests were not treated as sufficient. The exact synthetic artifact was downloaded, rendered and inspected page-by-page using the repository's PDF/DOCX QA workflow.

Exact artifact:
- workflow: **Submission SEE Synthetic Artefacts**
- run: `36994760847`
- artifact ID: `11221425681`
- artifact name: `item74e-submission-see-synthetic-8f6447d12c5821ad7019af637a1c73c30447980b`
- artifact digest: `sha256:e3081ce1f03c892a6b4fe5b461ef187f3ec8a65bf417926ae8457b7b94df692c`
- tested application/safety head: `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38`

Observed result:
- PDF renders cleanly at **9 pages** (previously 10);
- DOCX renders cleanly at **8 pages**;
- PDF page 2 now contains Document Control, Revision History, Proposal Summary and Document Status together;
- the sparse standalone status/front-matter page is gone;
- PDF Contents page references match the rendered layout;
- all PDF pages were inspected with no observed clipping, overlap, broken glyphs or orphan headings;
- all DOCX pages were rendered and inspected with no observed clipping, overlap, broken tables or footer/header defects;
- evidence schedule, source register and limitations remain intentionally proportionate to the synthetic fixture.

This closes **synthetic presentation visual acceptance** for the representative fixture. It does **not** prove actual hosted customer Word/PDF quality, real consultant-report/map/figure layout, or lodgement readiness.

Actual Byron/Kempsey customer outputs still require protected generation, download, exact-version reopening and native inspection after the remaining provenance/sign-in gates.

## Protected rehearsal deployments

Read-only Vercel recheck on 2 October:

### Byron
- deployment: `dpl_E6SLoZedSiWqmS1zoP5LAHCHAWQ9`
- branch: `see-doc-byron-20260930`
- commit: `ca2212d7e914478a85b744d1acb06b1e4a00a494`
- state: **READY**
- target: null / Preview, not Production.

### Kempsey
- deployment: `dpl_ABHpc6nCLtCB4pNN9tsTNDq9hCxX`
- branch: `see-doc-kempsey-20260930`
- commit: `638dc2d977e9c753ef8a7c98d6ef455d927534d0`
- state: **READY**
- target: null / Preview, not Production.

These deployments predate the latest current-branch presentation/provenance corrections. Their READY state is not customer document acceptance. Do not redeploy merely to make them newer.

## Completed source work — do not repeat

Already complete on the approved isolated children:
- Byron DCP source-capture refresh;
- Kempsey DCP source-capture refresh;
- scoped LEP source/version refresh;
- historical body preservation;
- exact DCP source binding work;
- manual official LEP XML acquisition/provenance;
- separate Preview database/configuration preparation recorded in existing handovers.

Do not redo downloads, credentials, migrations or source refreshes because an older checkpoint says they are pending.

## Current commercial blocker 1 — approval-gated council identity fix

Task:
`docs/project-memory/task-council-boundary-current-record-20261002.md`

Do not implement until Robbie explicitly approves it.

Root cause already proven:
- official NSW council lookup currently filters `enddate IS NULL`;
- a legitimate current Byron LGA feature can instead have a finite far-future end date;
- the council identity therefore fails to retain even when zoning succeeds.

The prepared fix requires:
- null OR finite future end date = potentially current;
- expired/equal-now/invalid rows rejected;
- exactly one current coordinate-intersecting row required;
- multiple-current rows fail closed;
- provider end date rechecked on stored-evidence read;
- normal 24-hour evidence expiry retained;
- full site-provenance regression coverage.

Static audit found no second known code prerequisite behind this failure. Hosted proof is still required after the fix.

## Current commercial blocker 2 — Kempsey normal sign-in

Kempsey still requires Robbie to complete the normal customer sign-in on the protected Preview before its customer journey can be exercised.

Do not request:
- new Stripe connection;
- duplicate keys;
- replacement secrets;
- repeated setup.

## Browser-assistant sequence

### Safe work before Robbie is needed

1. Read this closeout plus:
   - `docs/project-memory/browser-assistant-handoff-20261002.md`
   - `docs/operations/pr-convergence-20261002.md`
   - `docs/project-memory/see-document-delivery-handover.md`
   - `docs/operations/working-see-hosted-rehearsal-checkpoint-20260930.md`
2. Reconfirm #452 exact current head/checks rather than relying on this timestamp.
3. Reconfirm no new commit/PR/cloud change appeared.
4. Confirm synthetic visual acceptance remains tied to the exact `ea9f333` artifact above; do not repeat it unless renderer/output changes.
5. Prepare the council-enddate Codex task from the stored task file, but stop before executing if Robbie has not approved.
6. Prepare the Kempsey sign-in tab/handoff, but do not request duplicate authentication/setup.

### After Robbie approves the council correction

1. Execute only the bounded current-record correction on #452.
2. Require exact unit/provenance/build-safety/credential-free checks.
3. Do not deploy during the Codex correction itself.
4. Re-establish exact isolated Preview target safety.
5. Only with the applicable Preview-deployment authority, update the reviewed rehearsal refs/deployments — never Production.
6. Use the normal application site flow; no manual LGA-code backfill.
7. Confirm canonical council identity + spatial provenance persist.
8. Regenerate new project-bound DPP/memo versions.
9. Generate working SEE.
10. Download DOCX/PDF from customer UI.
11. Reopen the exact original saved version.
12. Prove permissions, exact paid scope, lineage, warnings and private storage.
13. Natively inspect actual Byron/Kempsey outputs.

Keep **Commercial HOLD** until this passes.

## Post-#452 task map

Prepared current tasks:

### First hardening
- `task-replay-pr429-representative-golden-20261002.md`
- `task-replay-pr424-lga-service-truth-20261002.md`
- `task-replay-pr426-consultant-disclosure-20261002.md`

### Evidence foundations
- `task-replay-pr422-consultant-returned-reports-20261002.md`
- `task-redesign-pr438-private-ocr-20261002.md`

Important architecture decisions:
- consultant reports join the progressive evidence graph; they do not expand the fixed four-document private-evidence package;
- OCR lifecycle concepts survive, but the old generic `WorkspaceUpload`/public-Blob attachment is superseded. Future OCR must bind to protected private evidence (`evidenceRef + contentHash`) after malware-clean gating and before separate applicability review.

### Product roadmap after the commercial gate
- `task-post-gate-roadmap-consolidation-20261002.md`

Sequence:
Research Viewer → practitioner/pilot framework → Project Controls.

Public-repo privacy rule:
- use neutral pilot/case IDs;
- do not republish real-user names, exact addresses, private filenames or project-derived private detail;
- historical public branch commits are a separate owner decision; do not rewrite Git history without explicit approval.

### Future council-employed planner cohort
- `task-future-council-employed-planner-cohort-20261002.md`

Keep this cohort disabled by default. Current NSW Model Code requirements and individual council secondary-employment/conflict rules must be rechecked before any pilot. A proposed new NSW Model Code for Council Staff, Delegates and Committee Members is under consultation in October 2026, so do not hard-code today's framework as permanent product logic.

Independent consultant-network work is a separate lane.

## Hard boundaries

Do not:
- merge #452 to main;
- deploy/promote Production;
- activate Production checkout;
- change Production data/schema;
- alter secrets/environment variables;
- approve protected workflows;
- make payments/refunds;
- weaken evidence/planning/security checks;
- manually manufacture council/provenance evidence;
- repeat completed source/setup work.

## Definition of a successful browser handoff

The browser assistant should be able to answer, without reconstructing history:

- what is active? **PR #452 only**
- what is tested? exact current application head and all checks above
- what is visually still unproven? **only the later hosted customer documents**; synthetic visual acceptance passed at `ea9f333`
- what needs Robbie? council-fix approval + Kempsey sign-in
- what can continue safely first? exact-head state verification and preparation around the two human gates
- what comes after launch gate? task files listed above


## Drive companion records

Current Drive-side companions are stored in **Plannera Technical Build Docs**:

- [Plannera Current Build Handoff — 2 October 2026](https://docs.google.com/document/d/1hPbFpgqp53mFXv9GpJCsX4ufrY32SaiifBMokGc24Mw/edit?usp=drivesdk) — current build state, human gates and browser-assistant continuation.
- [Plannera Post-Commercial Roadmap Consolidation — 2 October 2026](https://docs.google.com/document/d/1T4m5StZ7PLcA3SDInxUEspUPEFvdJzNZq9Mlsi1mI_k/edit?usp=drivesdk) — post-gate hardening, evidence foundations, Research Viewer/pilot/Project Controls sequence and privacy rules.

Historical Drive roadmap/pilot documents remain reference material. These two companion Docs are the current Drive continuity records for this closeout.
