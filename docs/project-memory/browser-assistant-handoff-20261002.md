# Browser assistant handoff — 2 October 2026

## Start here

Current reference: draft PR #452, branch `feat/see-document-delivery-20260929`.

Read in this order:
1. `docs/operations/pr-convergence-20261002.md`
2. `docs/project-memory/see-document-delivery-handover.md`
3. `docs/operations/working-see-hosted-rehearsal-checkpoint-20260930.md`
4. PR #452 and Issue #395 latest comments.

Do **not** restart from an older September handover.

## Current status

Commercial decision: **HOLD**.

Completed and not to be repeated:
- separate isolated Byron/Kempsey rehearsal targets;
- working_see Preview schema preparation/migration on the isolated targets;
- branch-scoped configuration already recorded;
- official DCP and scoped LEP source refresh transactions;
- current source-proof documentation;
- synthetic document-delivery test coverage;
- PR backlog convergence review.

Static provenance-chain audit on 2 October found no second known code prerequisite behind the current council lookup failure. Hosted proof is still required after any approved fix.

Current code/history:
- #452 is the active commercial/document-delivery lane.
- #433/#434/#435 are superseded independent presentation code lanes.
- #435's benchmark contract is now carried into #452.
- #450 is superseded current-status documentation, not an integration target.
- current convergence commit lineage is documented in `pr-convergence-20261002.md`.

## Two Robbie-dependent gates

### 1. Council boundary end-date correction

The correction is durably scoped in:
`docs/project-memory/task-council-boundary-current-record-20261002.md`.

Do not implement until Robbie explicitly approves that task.

When approved:
- execute only that bounded correction on #452;
- preserve expired/ambiguous/conflicting rejection;
- no Production, merge, deployment, migration or secrets;
- require exact tests/CI before any hosted retry.

### 2. Kempsey customer session

Kempsey still requires Robbie's normal sign-in to its protected Preview before the real customer journey can be exercised.

Do not ask for Stripe reconnection, new keys or repeated secret setup.

## After the council correction is approved and validated

Before any manual Preview deployment:
1. reconfirm exact branch/commit and deployment-disable safety;
2. reconfirm the intended isolated Byron/Kempsey database targets without exposing values;
3. deploy only the reviewed rehearsal revisions to Preview if explicitly authorised;
4. keep checkout false and Production untouched.

Then for each council separately:
1. use the existing signed-in project/session (Kempsey after Robbie signs in);
2. refresh/confirm the site only through the normal application flow;
3. confirm canonical council + saved spatial provenance now persist;
4. regenerate a new DPP/pre-SEE version;
5. generate the qualified working SEE;
6. download DOCX and PDF through the customer UI;
7. reopen the exact original saved version;
8. prove project membership, exact paid scope, version lineage, warnings and private storage behaviour;
9. natively inspect every representative Word/PDF page.

Do not overwrite old artefacts or relabel old evidence.

## Presentation finding to retain

2 October exact-head synthetic QA found a near-empty PDF **Document Status** page not mirrored in DOCX.

Canonical presentation contract:
`docs/operations/see-presentation-benchmark.md`.

Prepared Codex task:
`docs/project-memory/task-see-presentation-convergence-20261002.md`.

Do not merge #434 to fix this. Apply any correction to the current #452 lineage after preserving the commercial evidence boundary.

## Backlog after #452

Prepared replay task index:
`docs/project-memory/post-452-replay-task-index-20261002.md`.

The first three exact task cards are already written:
- `task-replay-pr429-representative-golden-20261002.md`;
- `task-replay-pr424-lga-service-truth-20261002.md`;
- `task-replay-pr426-consultant-disclosure-20261002.md`.

Recommended order:
1. #429 regression expansion;
2. #424 LGA preparation commercial truth if that paid surface remains active;
3. #426 consultant credential disclosure if referral remains launch scope;
4. #422 returned consultant-report foundation — task prepared at `docs/project-memory/task-replay-pr422-consultant-returned-reports-20261002.md`; integrate with progressive evidence, not the fixed four-document package;
5. #438 OCR lifecycle — historical implementation path is superseded; use `docs/project-memory/task-redesign-pr438-private-ocr-20261002.md` and attach OCR only to protected private evidence, not generic WorkspaceUpload;
6. post-gate roadmap docs: #448 Research Viewer → #451 practitioner/pilots → #449 Project Controls;
7. retain #450 only as historical acceptance evidence.

Rebase/recreate retained code lanes from then-current main; do not batch-merge current parallel PRs.

## Hard guardrails

No merge to main, Production deployment/promotion, Production checkout activation, secret/environment changes, Production migration/data mutation, payments/refunds, protected workflow approvals or evidence-gate weakening without explicit authority.
