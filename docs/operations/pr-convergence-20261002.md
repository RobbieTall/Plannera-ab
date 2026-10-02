# Plannera PR convergence checkpoint — 2 October 2026

Status: **CONVERGENCE COMPLETE / HISTORICAL PRs CLOSED WITHOUT MERGE / NO MERGE OR DEPLOYMENT AUTHORISED**

## Closeout status

This document explains how the former parallel PR backlog was reconciled. Those stale PRs are now closed without merge and their valid intent is preserved as current task cards on PR #452. Use `docs/project-memory/autonomous-session-closeout-20261002.md` for current status and do not treat the classifications below as open merge candidates.

This checkpoint reduces the open-PR backlog to a clear integration path. It is based on live GitHub state inspected on 2 October 2026. PR #452 remains the current commercial/document-delivery reference branch. Main remains at `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`; the open lanes are parallel branches from that base, not a sequential stack.

## Current commercial lane

### PR #452 — KEEP ACTIVE / REFERENCE BRANCH

`feat/see-document-delivery-20260929`

Keep this as the only active commercial document-delivery lane until the protected Byron/Kempsey customer journey is proven.

Already complete:
- isolated Byron/Kempsey DCP source-capture refresh;
- scoped LEP refresh with historical bodies preserved;
- working-SEE private/versioned delivery implementation and extensive synthetic validation;
- current exact-head GitHub Actions green;
- separate protected rehearsal targets configured and deployed previously without Production activation.

Still blocking commercial acceptance:
1. the NSW LocalGovernmentArea lookup currently assumes `enddate IS NULL`; live Byron evidence can use a far-future end date instead. The correction is scoped in `docs/project-memory/task-council-boundary-current-record-20261002.md` but is **approval-gated** and must not be implemented until Robbie explicitly approves it;
2. Kempsey still needs normal customer sign-in;
3. both councils still need genuine hosted project-specific Word/PDF generation, protected download, original-version reopening, permission/version/warning proof and native file inspection;
4. the exact-head synthetic PDF has a presentation regression: a near-empty standalone **Document Status** page creates unnecessary PDF/DOCX drift.

Do not repeat completed source refreshes, migrations, credentials or rehearsal setup.

## Presentation PR reconciliation

### PR #433 — SUPERSEDED AS AN INDEPENDENT CODE LANE

Its core structural features are already present in #452: document control, revision history, supporting evidence schedule, source register and deterministic professional tables. Preserve its historical test/review evidence, but do not merge the branch independently.

### PR #434 — SUPERSEDED AS AN INDEPENDENT CODE LANE; RETAIN VISUAL-QUALITY INTENT

#452 already contains the shared presentation model and professional DOCX/PDF renderer lineage that #434 introduced, and has since added document versioning/source-delivery work on the same renderer files. Merging #434 independently would reintroduce branch divergence.

Carry forward only:
- the approved visual-quality acceptance intent;
- any presentation improvement that survives a targeted #434-versus-#452 review;
- the requirement to compare actual Word/PDF output against the approved benchmark.

The 2 October synthetic review found the current #452 PDF status-only page regression. Fix it on the current lineage, not by merging #434.

### PR #435 — CODE SUPERSEDED; BENCHMARK CONTRACT RETAINED

The #435 code contract is already represented in #452:
- real Word TOC field;
- update-on-open field behaviour;
- deterministic fallback contents;
- dynamically resolved PDF page references.

The useful missing asset was `docs/operations/see-presentation-benchmark.md`. That benchmark contract is now carried onto #452 so the presentation rules are not lost. Do not merge #435 independently.

## Commercial hardening lanes after #452

These PRs remain conceptually valid but should be reapplied/rebased from the post-#452 main rather than batch-merged from their current parallel branches. Shared handover/README changes should be regenerated from current state rather than conflict-resolved mechanically.

### PR #429 — HIGH VALUE REGRESSION EXPANSION

Tests/docs only. Retain the representative Byron R2 and Kempsey SP2 fail-closed journeys. Rebase/recreate after #452 and run the full current commercial gate. Prefer this before additional user-facing feature work because it expands truth/regression coverage without changing Production behaviour. Prepared task: `docs/project-memory/task-replay-pr429-representative-golden-20261002.md`.

### PR #424 — PRE-LAUNCH COMMERCIAL TRUTH

Retain the truthful LGA-preparation timing and failure/refund-resolution contract if paid Local Controls/LGA preparation remains exposed. Reapply the minimal runtime/UI/tests after #452; do not import stale continuity documents wholesale. The replay must not blindly copy the old fixed-24-hour weekday arithmetic: resolve Australia/Sydney daylight-saving behaviour and do not claim NSW-public-holiday-aware business-day precision unless the implementation actually provides it. Prepared task: `docs/project-memory/task-replay-pr424-lga-service-truth-20261002.md`.

### PR #426 — PRE-LAUNCH DISCLOSURE

Retain the consultant self-reported-credentials disclosure if the live referral form remains part of launch scope. It is a small, low-risk user-truth requirement. Reapply cleanly after #452 rather than merging its parallel documentation history. Prepared task: `docs/project-memory/task-replay-pr426-consultant-disclosure-20261002.md`.

### PR #422 — VALID FOUNDATION, DEFER UNTIL CORE DOCUMENT JOURNEY IS GREEN

Returned consultant-report intake remains useful. The current private evidence system is now more mature than the historical branch, and the progressive evidence graph already recognises `CONSULTANT_REPORT`. Recreate the exact referral/project/scope/digest/discipline/hash binding against that current pipeline after #452. Do **not** add consultant reports to the fixed four-role Item 74H package assembly. Prepared task: `docs/project-memory/task-replay-pr422-consultant-returned-reports-20261002.md`.

### PR #438 — OCR CONCEPT VALID; HISTORICAL IMPLEMENTATION PATH SUPERSEDED

Retain the fail-closed OCR state-machine concepts, but **do not replay the old `WorkspaceUploadOcrAttempt -> WorkspaceUpload` implementation**. The current #452 handover explicitly separates private planning evidence from the legacy generic workspace uploader/public Blob path. OCR must be redesigned around the protected private-evidence identity (`evidenceRef + contentHash`), malware-clean boundary, visual review, applicability and progressive evidence graph. No live provider is yet approved. Prepared architecture task: `docs/project-memory/task-redesign-pr438-private-ocr-20261002.md`.

## Roadmap/documentation lanes

### PR #448 — RETAIN, POST-COMMERCIAL-GATE

Research Viewer remains the next important product direction after the commercial gates. Preserve the authoritative per-layer sourcing doctrine and Byron/Kempsey RV0/RV1 acceptance sequence. Recreate the documentation after #452 rather than merging stale shared indexes. This is Part A of the prepared sanitised roadmap task: `docs/project-memory/task-post-gate-roadmap-consolidation-20261002.md`.

### PR #451 — RETAIN CONCEPTS, SANITISE BEFORE PUBLIC INTEGRATION

Practitioner workflow governance and the three pilot purposes remain valid. It depends on the Research Viewer/JIT direction and must remain validation work, not statutory authority. **Do not merge the branch as-is:** its public docs contain named real users, exact addresses, private filenames and project-derived observations. Recreate the pilots with neutral IDs and keep exact mappings/evidence private. This is Part B of `docs/project-memory/task-post-gate-roadmap-consolidation-20261002.md`.

### PR #449 — RETAIN AS FUTURE ROADMAP, SANITISE CASE STUDY

Project Schedule / Project Controls remains future architecture, not current commercial scope. Recreate its documentation after the immediate commercial and Research Viewer/pilot documentation is settled. Do not carry exact private development-site identifiers into the public architecture; use a neutral internal case-study ID and keep exact project evidence private. This is Part C of `docs/project-memory/task-post-gate-roadmap-consolidation-20261002.md`.

### PR #450 — SUPERSEDED STATUS BRANCH / DO NOT MERGE WHOLESALE

Its Item 78C closeout is useful historical evidence, but #452 now contains the newer customer-document commercial HOLD and its own exact-branch Vercel deployment-disable safeguard. The #450 branch-specific `vercel.json` rule is not a configuration change to carry onto #452. Preserve the closeout record by reference; do not merge the branch as current status.

## Recommended sequence

1. **Finish #452 evidence and hosted acceptance.**
   - Await Robbie approval for the bounded council `enddate` correction.
   - Keep moving on all read-only/static lanes meanwhile.
   - Complete Kempsey customer sign-in when Robbie is available.
   - Run separate Byron and Kempsey hosted document journeys.
   - Native-review actual Word/PDF outputs.
2. **Presentation convergence on the #452 lineage.**
   - Correct the known PDF pagination drift.
   - Preserve the #435 benchmark contract.
   - Re-run synthetic + actual rendered-document visual acceptance.
   - Then #433/#434/#435 can be treated as superseded rather than merged.
3. **Regression hardening:** rebase/recreate #429.
4. **Launch-truth slices:** rebase/recreate #424, then #426 where their surfaces remain in launch scope.
5. **Evidence foundations:** rebase/recreate #422, then #438 when consultant-return/upload OCR becomes active.
6. **Roadmap docs after the gate:** #448 → #451 → #449, rebasing each on the then-current documentation state.
7. **#450:** retain historical evidence only; do not integrate as the current handover.

## Merge strategy

Do not batch-merge the present parallel PRs simply because GitHub says they are mergeable or their Actions are green. Once the first branch lands, shared README/build-next/decision-register/schema files will diverge.

For retained code lanes, create or refresh one clean task/PR from the then-current main and carry forward only the still-valid functional change plus current tests. Regenerate continuity documentation from current truth. This keeps the repository's one-task/one-PR discipline and avoids reintroducing superseded status text.

## Approval and safety boundaries

No finding in this document authorises:
- merge to main;
- manual/Production deployment;
- Production checkout activation;
- secrets/environment changes;
- migrations or Production database writes;
- payment/refund actions;
- protected workflow approval;
- weakening evidence/security/planning gates.

If a lane reaches one of those boundaries, record it and continue another safe lane.


## PR #419 — CONCEPT RETAINED / FUTURE COMPLIANCE TRACK

The council-employed-planner cohort is not a current launch feature and the historical docs branch should not be merged wholesale. Current NSW conduct rules and council-specific secondary-employment policies require a policy-driven eligibility/conflict model, and the state staff-code framework is under active reform in October 2026.

Canonical future task:
`docs/project-memory/task-future-council-employed-planner-cohort-20261002.md`.

Independent consultant-network development can proceed separately. Council-employed participation remains disabled until the state framework, employing-council policy, approval evidence, insurance/professional requirements, privacy and per-job conflict process are reviewed and proven.
