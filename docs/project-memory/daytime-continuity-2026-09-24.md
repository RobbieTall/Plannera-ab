# Daytime continuity handover — 24 September 2026

This is the canonical mobile-to-desktop handover for the 24 September daytime Plannera build shift.

**Continuity rule:** GitHub is the source of truth. Read live PR/Issue metadata before acting. Do not rely only on `main`, because the daytime work below remains on unmerged feature branches except the Item 78C acceptance-branch integration.

## Desktop read order

1. Issue #395 latest comments — Item 78C protected acceptance/diagnostic.
2. Acceptance branch `accept/item-78c-byron-kempsey-20260914` at actual integration SHA `2793aef38433fdb41341c096f7b027689450f525`.
3. PR #422 + Issue #421 — returned consultant-report intake.
4. PR #424 + Issue #423 — paid LGA preparation service target/resolution.
5. PR #426 + Issue #425 — consultant credential disclosure.
6. PR #429 + Issue #427 — representative Byron/Kempsey address/proposal golden journeys.
7. PR #434 + Issue #432 — professional SEE DOCX/PDF presentation.
8. This file.
9. `docs/project-memory/build-next.md`.
10. `docs/project-memory/decision-register.md`.
11. `docs/COMMERCIALISATION_WORKFLOWS.md`.
12. Relevant runbooks named in each lane.

---

## Lane 1 — Item 78C protected acceptance diagnostic

Tracking: Issue #395.

Status: **HOLD pending desktop-only protected controls.**

Completed today:
- Robbie explicitly approved the bounded Preview-only package.
- PR #420 was marked Ready only because GitHub would not merge a Draft PR.
- PR #420 was integrated into its existing non-main base `accept/item-78c-byron-kempsey-20260914`.
- Actual resulting acceptance-branch SHA: `2793aef38433fdb41341c096f7b027689450f525`.
- No merge to `main`.
- Production and checkout untouched.

Mobile tool boundary:
The mobile GitHub connector cannot write GitHub Environment variables or dispatch workflows. No workaround was used.

### Already-authorised desktop continuation

Do not ask Robbie to approve this package again.

1. In `item78c-byron-preview`, change **only** `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT` to `2793aef38433fdb41341c096f7b027689450f525`.
2. In `item78c-kempsey-preview`, change **only** the same variable to the same SHA.
3. Dispatch the registered **Item 77 protected commercial journey** on `accept/item-78c-byron-kempsey-20260914` with:
   - `diagnostic_only=true`
   - `expected_commit=2793aef38433fdb41341c096f7b027689450f525`
   - `confirmation=READ ONLY PREVIEW LOGIN CHECK`
4. Use the existing protected environment approval gates.
5. Record exact run URL/attempt/result in Issue #395.
6. Interpret the diagnostic only. **Do not start the Item 78C stateful whole-funnel acceptance without a separate decision/approval.**

Run #21 remains historically failed with payment-status HTTP 404 evidence; root cause remains unproven until the diagnostic is run. Do not repeat key copying, payment setup or fixture creation.

---

## Lane 2 — returned consultant-report intake

Tracking: Issue #421.  
PR: #422.  
Current live head at handover: `70b99ba3da799d2139134b8132c245f9457a5e82`.  
State: **open, mergeable, not merged**.

Implemented:
- `CONSULTANT_REPORT` added to the existing private-evidence role boundary.
- Fail-closed returned-report intake requires append-only proof of actual consultant delivery.
- Exact project/referral/scope/package-digest/requested-discipline/content-hash continuity.
- Durable privacy-minimal `ConsultantReturnedReportBinding` schema/migration.
- Replay-safe binding persistence and evidence-package marking.
- Quarantined/rejected evidence cannot advance.
- No returned report alone unlocks A$49/A$749 readiness, final SEE or Production.
- Runbook: `docs/operations/consultant-returned-report-intake.md`.

Verification:
- all observed final-head gates passed;
- separate review #5298043264 found no blocker.

Still deliberately unconnected:
- authenticated private consultant-report upload endpoint;
- real private Blob/scanner/operator-review adapters;
- returned-report workspace UI;
- hosted protected returned-report flight;
- Production activation.

---

## Lane 3 — paid LGA preparation service truth

Tracking: Issue #423.  
PR: #424.  
Current live head: `8f7f8a4af6231ca72f310beed2432ef74b78ba4a`.  
State: **open, mergeable, not merged**.

Implemented:
- replaces “usually takes a few minutes” with the approved **within 2 business days** service target;
- deterministic weekday target uses Australia/Sydney;
- read-only coverage API/hook exposes safe target/status;
- failed preparation exposes privacy-minimal operator-review state, not raw worker exceptions;
- commercial resolution contract separates in-progress, overdue review, delivered, delivered-with-unresolved-controls, refund review, refund-pending-provider-confirmation and provider-confirmed refund;
- worker completion is not treated as paid-pack delivery unless the promised pack is persisted;
- no Stripe/refund execution is performed.

Review hardening caught/fixed:
- React hook-order instability;
- UTC/Sydney weekday error;
- failed-job active-pointer assumption;
- raw error leakage;
- worker-complete vs customer-delivered SLA confusion.

Verification:
- final observed gates passed;
- review #5300594053 found no blocker.
- Runbook: `docs/operations/lga-preparation-service-resolution.md`.

---

## Lane 4 — consultant credential disclosure

Tracking: Issue #425.  
PR: #426.  
Current live head: `6286e32df6b4e232291acc70bf16d486e9e772fd`.  
State: **open, mergeable, not merged**.

Implemented:
- reusable canonical consultant credential disclosure;
- disclosure rendered before current human-operated referral consent/submission;
- existing no-matching/no-availability/no-quotes/no-response-time statement remains separate;
- no fake directory/RFQ page was created where the product does not yet have one.

Approved wording:
“Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.”

Verification history:
- first head failed because the new TSX component omitted an explicit React import under the repo test/compiler setup;
- minimal import fix applied;
- corrected code head passed;
- final documentation head `6286e32df6b4e232291acc70bf16d486e9e772fd` passed:
  - Soft launch `35964668857`
  - Whole-LGA `35964668836`
  - Commercial Funnel `35964668839`
- review #5300627238 found no blocker.

No referral API/database/billing/environment/Production behaviour changed.

---

## Lane 5 — representative Byron/Kempsey address/proposal golden journeys

Tracking: Issue #427.  
PR: #429.  
Current live head: `32912801ce3feb578fc9c04bc2452b8cdb58e29c`.  
State: **open, mergeable, not merged**.

Purpose:
Extend deterministic commercial coverage beyond Byron SP3/Kempsey E2 without inventing evidence.

Cases:
- Byron R2 — 33 Lorikeet Lane, Mullumbimby; reviewed 24 sqm storage-shed case.
- Kempsey SP2 — 32 Smith St, Kempsey; SP2 Infrastructure truth case, never E2.

Truthful outcomes:
- existing SP3/E2 quality-chain tests remain intact;
- existing Kempsey E2 partial-evidence case remains `working_needs_evidence`;
- Byron R2 has no fabricated proposal-specific DCP evidence: unresolved DPP, SEE generation fails closed, expert-review path remains available;
- Kempsey SP2 has no synthetic statutory objectives/permissions in this fixture: uncited QSC is stopped by the existing quality-valid-QSC gate before DPP generation;
- SP2 rejection must leave zero persisted DPP artefacts and must not leak E2/Commercial-premises evidence.

Failures during construction were treated as evidence of correct product gates, not reasons to weaken production behaviour.

Verification:
- reviewed code head `de01fd3e71e07d1c3598716d71c5d802d81cfde1` passed and review #5300803806 found no blocker;
- final handover head `32912801ce3feb578fc9c04bc2452b8cdb58e29c` passed:
  - Soft launch `35966430223`
  - Whole-LGA `35966430239`
  - Commercial Funnel `35966430215`.

This is representative deterministic expansion only, not every-zone/live-address acceptance.

---

## Lane 6 — professional SEE DOCX/PDF presentation

Tracking: Issue #432.  
PR: #434.  
Reviewed renderer head: `c9a9624ef085287765a17ee0443a2319d8552282`.  
Tested code/test head: `5d10df08507597859a10d1c91a23d4754bfe75e9`.  
Final documentation head: `8e145e4a60548693aca7fb4bc9dd280b5192b4fa`.  
State: **open, mergeable, not merged**.

Final documentation-head CI also passed all seven gates:
- Soft launch `35971674147`
- Whole-LGA `35971674102`
- Commercial Funnel `35971674128`
- Working SEE `35971674094`
- Submission SEE Output Rendering `35971674117`
- Item 77 protected commercial journey `35971674086`
- Synthetic Artefacts `35971674072`

Final-head artifact `10796531837` reproduces the accepted DOCX/PDF hashes byte-for-byte.

Goal:
Close the deterministic synthetic professional-presentation gap while preserving `see-builder-standard.v1`, evidence finality, working/final distinction and all existing commercial/safety gates.

Implemented:
- shared deterministic DOCX/PDF presentation model;
- professional Plannera cover;
- document-control page;
- numbered contents and canonical section hierarchy;
- section evidence-used callouts;
- supporting-evidence schedule;
- source register;
- limitations treatment;
- consistent header/footer/page numbering;
- prominent working-SEE qualification/outstanding-evidence schedule;
- no unapproved font dependency;
- DOCX package explicitly relates `word/styles.xml` from `word/document.xml.rels`.

Approved benchmark qualities came from project library `SEE Various Examples.pdf`:
- ELKN — disciplined cover/document control/contents;
- Ardill Payne — formal planning-report/statutory hierarchy;
- Planners North — polished cover/executive-summary/page-furniture treatment.

Important defects found/fixed:
1. Initial Vercel safety checks correctly rejected the new runtime presentation-module import until it was explicitly added to the reviewed transitive dependency fingerprint.
2. Early renderer tests contained over-specific fixture/layout string assertions; these were corrected without changing rendering/finality logic.
3. The first DOCX visual artifact collapsed intended pagination. Root cause was a missing OOXML styles relationship, not a planning or finality defect. Adding the relationship produced the intended 14-page DOCX and is now regression-tested.
4. Final PDF source assertions were hardened to verify source identity independent of line wrapping rather than coupling safety to one exact presentation line.

Current tested code/test-head CI — all PASS:
- Soft launch smoke — run `35971164696`
- Whole-LGA source matrix — run `35971164676`
- Commercial Funnel Golden Gate — run `35971164589`
- Submission SEE Output Rendering — run `35971164669`
- Item 74H Working SEE Preview — run `35971164659`
- Item 77 protected commercial journey — run `35971164557`
- Submission SEE Synthetic Artefacts — run `35971164538`.

Current tested-head artifact: `10795398958`.

Accepted deterministic hashes:
- DOCX `71a50968f0b095227904606e87100692490e8e07fae1a01f87032d1bc9f690de`
- PDF `2e0123c8349039b51ac3acf28577c73aac388f1c5ebb29f6d45aaf4f1062221b`.

The current tested-head artifact reproduces those exact hashes byte-for-byte. These exact bytes were already rendered through the project QA workflow:
- DOCX: 14 A4 pages;
- PDF: 14 A4 pages.

Every page was visually inspected against the approved benchmark qualities. No clipping, overlapping content, broken table layout, missing glyphs or inconsistent page furniture was identified.

Separate renderer review `#5301256836` found no blocking implementation issue on the reviewed renderer head. The only changes after that reviewed renderer head are continuity/documentation plus the line-wrap-independent renderer-test hardening described above; renderer bytes did not change.

Runbook: `docs/operations/professional-see-renderer-visual-acceptance.md`.

Boundary:
This proves the deterministic synthetic presentation/layout system only. It does not replace real-project rendered acceptance, Item 78C protected whole-funnel acceptance or Production activation. No billing, checkout, schema, environment or Production action was performed.

## Lane 7 — provider-neutral OCR retry/review lifecycle

Tracking: Issue #437.  
PR: #438.  
Branch: `feat/upload-ocr-review-lifecycle-20260924`.  
Base: `main` at `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.  
Initial PR head: `17184c243c9640c7bb9fb59a6e759301a3bb45cb`.  
State: **implementation complete on branch / exact-head CI running / not merged**.

Repository investigation confirmed the true remaining Item 74A OCR gap:
- existing uploads already persist source hash, extraction/readability, page/sheet provenance, indexing and exact-scope applicability states;
- image uploads and text-empty scanned PDFs correctly remain `IMAGE_ONLY` and outside retrieval;
- there was no durable OCR queue/retry/review lifecycle;
- the older roadmap statement that map/plan provenance still needed to be modeled is partly stale because structured map snapshots already carry source/date/layer/legend/observation/limitation and finality gates.

Implemented on #438:
- Prisma `EvidenceOcrStatus` and append-only `WorkspaceUploadOcrAttempt`;
- exact source SHA-256 binding and deterministic request/result hashes;
- `QUEUED` → `PROCESSING` → `REVIEW_REQUIRED` / `FAILED` lifecycle;
- active-attempt reuse and explicit retry after terminal failure/rejection;
- provider result stored as page-numbered OCR segments outside accepted upload extraction;
- successful provider result remains unindexed and leaves the original upload `IMAGE_ONLY`;
- visual review rejection leaves the upload unchanged;
- visual review approval verifies source/result integrity, atomically promotes `ocr-reviewed-v1` extraction, then reuses the existing indexing pipeline;
- reviewed OCR with indexing failure remains readable but not available to final SEE retrieval;
- uploads GET exposes privacy-safe latest OCR state only, never OCR text;
- Sources UI shows OCR queued/processing/review-required/failed/rejected/promoted state and explains the trust boundary;
- direct node tests cover queue replay, eligibility refusal, provider completion without indexing, failure/retry, rejection, changed-hash denial, promotion/idempotency and indexing failure;
- OCR lifecycle tests are wired into the Commercial Funnel Golden Gate;
- runbook: `docs/operations/workspace-upload-ocr-lifecycle.md`.

Provider boundary:
- no live OCR vendor/provider is connected;
- no background worker is activated;
- no customer-facing OCR execution control is exposed;
- no Production file processing;
- OCR does not imply applicability acceptance;
- billing/checkout/Production remain untouched.

Next on this lane:
1. inspect terminal #438 CI;
2. fix only branch-local schema/service/API/UI/test defects if any;
3. complete separate static review;
4. update Issue #437 and this handover with the exact terminal head/runs;
5. leave live OCR provider connection for a separately reviewed provider/privacy/cost-control slice.

---

## Integration warning — six open main-target PRs

The daytime session produced six independent open PRs targeting `main`: **#422, #424, #426, #429, #434 and #438**.

They were intentionally not merged under the daytime standing permission.

Because several update the same canonical documentation files, **do not bulk-merge them from their original stale bases**.

If Robbie approves main integration, the safest sequence is:

1. re-check all five live PRs and conflicts;
2. integrate one PR at a time (oldest first is the default: #422 → #424 → #426 → #429 → #434 → #438);
3. after each merge, refresh/reconcile the next PR against the new `main`;
4. resolve documentation overlap without dropping either branch's factual state;
5. rerun that PR's exact relevant CI on the reconciled head;
6. only then merge the next PR;
7. finish with one consolidated `main` handover/queue/decision update.

Do not interpret “green before another PR merged” as proof that the same PR remains green after conflict reconciliation.

No such main merges are authorised by the daytime standing permission. Get Robbie's merge approval, preferably as one clearly bounded sequential-integration package.

---

## Evening desktop execution priority

1. **Finish the already-approved Item 78C desktop-only repin + read-only diagnostic first.**
2. Record and interpret that diagnostic in Issue #395. Do not launch stateful Item 78C acceptance automatically.
3. Verify live status of PRs #422/#424/#426/#429/#434/#438.
4. If Robbie wants the daytime slices integrated, request/confirm one bounded sequential-main-integration approval, then use the safe sequential procedure above.
5. After integration/reconciliation, update `main` canonical handover/queue/decision/commercialisation docs with exact merge SHAs and terminal CI.
6. Continue the launch queue from the updated `main`; do not start from a stale pre-daytime branch.

## Safety boundaries

- Production untouched.
- Checkout remains disabled.
- No secret values copied or exposed.
- No real refund/payment action.
- No stateful Item 78C whole-funnel acceptance run from mobile.
- No daytime merge to `main`.
- No branch should be described as merged/accepted beyond the exact evidence above.
