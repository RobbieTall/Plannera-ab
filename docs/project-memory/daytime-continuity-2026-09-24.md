# Daytime continuity handover — 24 September 2026

This file is the canonical mobile-to-desktop handover for the current daytime build shift. Read live GitHub issue/PR state before acting; do not rely only on main or on chat memory.

## Desktop read order

1. Issue #395 — Item 78C acceptance/diagnostic.
2. PR #422 + Issue #421 — consultant returned-report intake.
3. PR #424 + Issue #423 — paid LGA preparation service target/resolution.
4. PR #426 + Issue #425 — consultant credential disclosure.
5. PR #429 + Issue #427 — representative Byron/Kempsey address/proposal golden journeys.
6. PR #433 + Issue #430 — professional SEE document structure and visual benchmark boundary.
7. This file.
8. `docs/project-memory/build-next.md`.
9. `docs/project-memory/decision-register.md`.
10. `docs/COMMERCIALISATION_WORKFLOWS.md`.
11. Relevant operations runbooks linked below.

## Lane 1 — Item 78C acceptance diagnostic

Status: **HOLD; desktop-only protected controls remain.**

Completed during daytime:
- Robbie explicitly approved the bounded Preview-only package.
- PR #420 was marked Ready only because GitHub refused the approved integration while it remained Draft.
- PR #420 was merged into its existing base `accept/item-78c-byron-kempsey-20260914`, not `main`.
- Actual acceptance-branch merge SHA: `2793aef38433fdb41341c096f7b027689450f525`.

Still pending because the mobile GitHub connector exposes neither GitHub Environment-variable writes nor workflow dispatch:
1. Set only `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT` in `item78c-byron-preview` to `2793aef38433fdb41341c096f7b027689450f525`.
2. Set only the same variable in `item78c-kempsey-preview` to the same SHA.
3. Dispatch registered Item 77 protected commercial journey on `accept/item-78c-byron-kempsey-20260914` with:
   - `diagnostic_only=true`
   - `expected_commit=2793aef38433fdb41341c096f7b027689450f525`
   - `confirmation=READ ONLY PREVIEW LOGIN CHECK`
4. Use the existing protected environment approvals.
5. Record run URL/result in Issue #395.
6. Do **not** start whole-funnel Item 78C acceptance until diagnostic evidence is interpreted and separately authorised.

Production/main/checkout remain untouched.

## Lane 2 — consultant returned-report intake

Tracking: Issue #421.
PR: #422.
Current head: `70b99ba3da799d2139134b8132c245f9457a5e82`.
State at daytime checkpoint: **open, mergeable, not merged**.

Implemented:
- `CONSULTANT_REPORT` added to the existing private-evidence role boundary.
- Fail-closed returned-report intake requires append-only proof the referral was actually delivered.
- Exact project/referral/scope/package-digest/requested-discipline/content-hash continuity.
- Durable privacy-minimal `ConsultantReturnedReportBinding` schema + migration.
- Replay-safe internal persistence and evidence-package binding.
- Pending reports remain quarantined; rejected reports cannot advance.
- No returned report grants A$49/A$749 eligibility, final SEE or Production readiness by itself.
- Operations runbook: `docs/operations/consultant-returned-report-intake.md`.

Verification:
- all 11 observed final-head PR gates passed;
- Commercial Funnel Golden Gate, private-evidence upload/review/scanner/package, whole-LGA, SEE-credit and working-SEE gates all green;
- separate read-only PR review #5298043264 found no blocking issue.

Still out of scope:
- authenticated private report-upload endpoint;
- private Blob/scanner/operator-review external adapters;
- returned-report workspace UI;
- hosted protected return flight;
- Production activation.

No merge was authorised during daytime.

## Lane 3 — paid LGA preparation service target/resolution

Tracking: Issue #423.
PR: #424.
Current head: `8f7f8a4af6231ca72f310beed2432ef74b78ba4a`.
State at daytime checkpoint: **open, mergeable, not merged**.

Problem fixed:
The existing workspace said LGA preparation “usually takes a few minutes” while the approved commercial contract promises **within 2 business days** and requires truthful resolution when preparation fails.

Implemented:
- deterministic two-weekday service target in Australia/Sydney;
- target surfaced through read-only `/api/lga/coverage` and polling hook;
- current weekday target shown in workspace when available;
- no raw worker errors exposed to browser;
- failed state returns privacy-minimal `OPERATOR_REVIEW_REQUIRED`;
- pure commercial outcome contract distinguishes in-progress, overdue review, delivered, delivered-with-unresolved-controls, refund review, refund pending provider confirmation and provider-confirmed refund;
- worker completion is not treated as customer delivery unless the promised pack is actually persisted;
- tests added and wired into Commercial Funnel Golden Gate;
- runbook: `docs/operations/lga-preparation-service-resolution.md`.

Review hardening caught and fixed before handover:
- React conditional hook-order bug;
- UTC/Sydney weekday bug;
- failed-job active-pointer assumption;
- raw worker error leakage;
- worker-complete vs paid-pack-delivered SLA confusion.

Verification:
- all 9 observed final-head gates passed, including Commercial Funnel Golden Gate, Whole-LGA, private-evidence, SEE-credit and working-SEE gates;
- separate read-only PR review #5300594053 found no remaining blocking correctness/privacy/commercial-truth issue.

Boundary:
- no Stripe/refund execution;
- no checkout change;
- no Production/configuration change;
- public holidays are not modeled, so the exact date is explicitly a current weekday target.

No merge was authorised during daytime.

## Lane 4 — consultant credential disclosure

Tracking: Issue #425.
PR: #426.
Branch: `feat/consultant-credential-disclosure-20260924`.
Final PR head: `6286e32df6b4e232291acc70bf16d486e9e772fd`.
State at daytime checkpoint: **open, mergeable, not merged**.
Base: current main at branch creation `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.

Approved disclosure:
“Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.”

Repository inspection confirmed there is no live consultant directory/RFQ marketplace. The real customer-facing consultant surface is the existing human-operated referral panel.

Implemented:
- reusable `ConsultantCredentialDisclosure` component and canonical disclosure string;
- disclosure rendered before contact/consent fields on the live referral submission form;
- existing queue copy still separately states no promise of matching, availability, quotes or response times;
- regression assertions added to the existing referral-panel test;
- operations runbook `docs/operations/consultant-credential-disclosure.md`;
- queue/decision/commercialisation/README docs updated.

Verification history:
- initial PR head `214c168ae3d0210a396e0aa401a426367e694a99` failed Commercial Funnel Golden Gate run 35964376937 because the new TSX component omitted an explicit React import; node commercial tests had already reported 175 passing / 0 failing and the failure was isolated to the referral-panel Vitest render;
- minimal fix commit `a819d06605de82a9d8f440b6df66ed9ebb1fcc12` added the required React import only;
- corrected code head `a819d06605de82a9d8f440b6df66ed9ebb1fcc12` passed Soft launch smoke run 35964503590, Whole-LGA run 35964503671 and Commercial Funnel Golden Gate run 35964503542;
- separate read-only PR review #5300627238 found no remaining blocking issue;
- final documentation head `6286e32df6b4e232291acc70bf16d486e9e772fd` re-ran and passed Soft launch 35964668857, Whole-LGA 35964668836 and Commercial Funnel 35964668839.

No referral logic, database schema, billing, Production or environment behaviour changed. No merge was authorised during daytime.

## Lane 5 — representative Byron/Kempsey address-and-proposal golden journeys

Tracking: Issue #427.
PR: #429.
Branch: `test/representative-address-proposal-golden-20260924`.
Final PR head: `32912801ce3feb578fc9c04bc2452b8cdb58e29c`.
Verified code/test head: `de01fd3e71e07d1c3598716d71c5d802d81cfde1`.
State at checkpoint: **open, mergeable, not merged**.
Base: `main` at branch creation `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.

Purpose:
Extend the existing deterministic Byron SP3/Kempsey E2 commercial golden gate with representative truth cases already established in the repository, without changing production logic.

Representative truth cases:
- **Byron R2 — 33 Lorikeet Lane, Mullumbimby NSW 2482.** Repository-reviewed Item 74H case; parcel interior R2; approved 24 sqm storage shed ancillary to the residential case.
- **Kempsey SP2 — 32 Smith St, Kempsey NSW 2440.** Repository-proven SP2 Infrastructure identity. It must never be treated as E2 Commercial Centre.

Implemented/test contract:
- Existing Byron SP3 and Kempsey E2 quality-chain expectations are preserved.
- Existing Kempsey E2 partial-evidence case remains a qualified `WORKING_SEE` and audits as `working_needs_evidence`.
- Byron R2 uses only repository-backed evidence needed by the fixture, including the `Dwelling houses` permitted-with-consent term and R2 objectives already present in repo evidence.
- Byron R2 intentionally supplies no proposal-specific DCP citations: DPP remains `needs_expert_review`, SEE generation fails closed for no applicable cited DCP evidence, and the expert-review/audit path becomes `unresolved_pack_referral`.
- Kempsey SP2 contains no invented objectives or land-use permissions. The saved QSC proves the SP2 site identity but is not labelled `Cited`; the existing quality-valid-QSC gate rejects DPP generation.
- The SP2 rejection is additionally required to leave zero persisted Detailed Planning Pack artefacts.
- SP2 audit remains QSC `unresolved`, DPP/SEE `missing`, referral `none`, next action `generate_or_refresh_required_chain`.
- SP2 output is checked for absence of E2/Commercial premises leakage.
- No production source, schema, billing, checkout, environment, deployment or external data behavior changes.

Verification history:
1. First new-case attempt correctly exposed that zero cited DCP evidence cannot generate SEE.
2. Second attempt correctly exposed that an uncited SP2 QSC cannot generate a paid DPP.
3. Tests were corrected to assert those existing product gates; production code was never weakened.
4. A previously staged accidental weakening of the existing Kempsey E2 partial-gap audit expectation was found and restored to `working_needs_evidence`.
5. Final verified head `de01fd3e71e07d1c3598716d71c5d802d81cfde1` passed:
   - Soft launch smoke — run `35966249365`
   - Whole-LGA source matrix — run `35966249396`
   - Commercial Funnel Golden Gate — run `35966249351`
6. Separate read-only review `#5300803806` found no blocking issue on that exact head.
7. Final handover/docs head `32912801ce3feb578fc9c04bc2452b8cdb58e29c` re-ran and passed Soft launch `35966430223`, Whole-LGA `35966430239` and Commercial Funnel `35966430215`.

Runbook: `docs/operations/representative-address-proposal-golden.md`.

No merge was authorised during daytime. This is representative deterministic expansion only; it does not claim every-zone acceptance, live address resolution, rendered-document quality, payment acceptance or operator sign-off.

## Lane 6 — professional SEE document structure / visual benchmark boundary

Tracking: Issue #430.
PR: #433.
Branch: `feat/see-professional-document-structure-20260924`.
Verified renderer/test head: `e50fb37500fa836ec4f4fb1eea959f361ff73e3e`.
State before final documentation recheck: **open, mergeable, not merged**.

Repository investigation:
- the canonical renderer already generated deterministic real DOCX/PDF bytes and preserved final/working acceptance boundaries;
- the actual missing launch work is professional document presentation plus visual comparison against the approved SEE example library;
- the approved benchmark PDF/library could not be retrieved through the mobile Project/Library file surface, so no visual-parity claim was made.

Implemented:
- evidence-derived Document Control in DOCX/PDF;
- Revision History with one current generated issue only; prior versions are explicitly not inferred;
- Supporting Evidence Schedule derived only from `uploadEvidence.uploads` and omitted when empty;
- tabular Source Register;
- actual OOXML tables with fixed widths/borders/cell margins;
- deterministic PDF aligned table layout and static Contents page;
- unchanged final/working readiness semantics and visible `WORKING SEE - NOT SUBMISSION READY` qualification;
- safer display handling for malformed review timestamps so validation remains authoritative.

Build-safety handling:
- changing `submission-see-renderer.ts` correctly caused Soft launch/Whole-LGA build-contract failure because it is a reviewed transitive Vercel build dependency;
- the gate was **not bypassed**;
- independently reviewed renderer SHA-256 `9c6ace260c88c484509bd7d9f9e493d06fe9045afd66647a6d1b718cd809a73e` was pinned into `verify-vercel-build-safety.mjs`.

Test corrections caught during CI:
1. the Revision History PDF cell wrapped `Current generated issue` into two text fragments; the test was corrected rather than forcing an unnatural layout;
2. the new PDF Contents page also contains `Environmental Impacts`; the old test accidentally selected the Contents stream instead of the assessed section. The selector now requires the heading and its `Sources:` block.

No renderer/product behavior was changed for either test correction.

Verified exact renderer/test head `e50fb375...`:
- Submission SEE Output Rendering — `35967832168` — PASS;
- Item 74H Working SEE Preview Gate — `35967832129` — PASS;
- Item 77 protected commercial journey — `35967832146` — PASS;
- Commercial Funnel Golden Gate — `35967832074` — PASS;
- Whole-LGA source matrix — `35967832094` — PASS;
- Soft launch smoke — `35967832115` — PASS;
- Submission SEE Synthetic Artefacts passed on the immediately preceding renderer-identical head; the later changes were test selection only.
- Separate read-only review `#5300978163` found no blocking structural or safety issue.

Canonical renderer runbook:
`docs/operations/item74e-submission-see-renderer.md`.

### Desktop-only completion still required

Do **not** mark the professional-output launch item complete merely because structural CI is green.

Desktop must:
1. obtain/read the approved SEE benchmark/reference PDF library;
2. generate representative **final and working** DOCX/PDF outputs from the approved Preview/test fixtures;
3. render every DOCX/PDF page to images;
4. compare cover, hierarchy, typography, spacing, tables, contents, source register, page breaks, footer/page numbering and overall professional presentation against the approved examples;
5. open the DOCX in a real office renderer and PDF in a real PDF renderer to inspect clipping, overflow, table breaks and glyph substitution;
6. correct presentation defects on this feature branch without weakening evidence/readiness rules;
7. record the exact visual acceptance evidence in Issue #430 before considering the launch document-quality item complete.

No Production, billing, checkout, schema, environment or persistence behavior was changed. No merge was authorised during daytime.

## Safety / continuity rules for desktop

- Do not merge any open PR merely because it is green; review current live state and use Robbie's approval boundary.
- Do not repeat secrets, test payments or setup already completed unless evidence proves replacement is required.
- Do not merge PR #422 or #424 into the Item 78C acceptance branch; they are separate `main`-target feature PRs.
- Item 78C acceptance evidence belongs only to its exact acceptance branch/SHA.
- Production activation remains separately approved work.
- Keep checkout disabled.
- Every merge, pin, workflow run, failure, fix, decision and next step must be recorded in the relevant Issue and canonical docs before ending the desktop session.
