# Daytime continuity handover — 24 September 2026

This file is the canonical mobile-to-desktop handover for the current daytime build shift. Read live GitHub issue/PR state before acting; do not rely only on main or on chat memory.

## Desktop read order

1. Issue #395 — Item 78C acceptance/diagnostic.
2. PR #422 + Issue #421 — consultant returned-report intake.
3. PR #424 + Issue #423 — paid LGA preparation service target/resolution.
4. PR for Issue #425 — consultant credential disclosure.
5. This file.
6. `docs/project-memory/build-next.md`.
7. `docs/project-memory/decision-register.md`.
8. `docs/COMMERCIALISATION_WORKFLOWS.md`.
9. Relevant operations runbooks linked below.

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
Corrected code head: `a819d06605de82a9d8f440b6df66ed9ebb1fcc12`.
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
- corrected exact head passed Soft launch smoke run 35964503590, Whole-LGA run 35964503671 and Commercial Funnel Golden Gate run 35964503542;
- separate read-only PR review #5300627238 found no remaining blocking issue.

No referral logic, database schema, billing, Production or environment behaviour changed. No merge was authorised during daytime.

## Lane 5 — representative Byron/Kempsey address-and-proposal golden journeys

Tracking: Issue #427.
Branch: `test/representative-address-proposal-golden-20260924`.
Base: `main` at branch creation `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.

Purpose:
The existing commercial golden gate covers full persisted Byron SP3 and Kempsey E2 journeys. The whole-LGA source matrix covers source/projection inventory across all zones but explicitly does not prove representative address/proposal behavior outside those two fixtures.

Trusted cases selected from existing repository evidence:
- Byron R2 — `33 Lorikeet Lane, Mullumbimby NSW 2482`, reviewed Item 74H case; parcel interior R2, approved 24 sqm storage shed ancillary to the residential case.
- Kempsey SP2 — `32 Smith St, Kempsey NSW 2440`, existing SP2 Infrastructure truth case. It must never be treated as E2 Commercial Centre.

Implemented so far:
- widened the deterministic golden test harness to support R2/SP2 fixtures without changing production code;
- existing SP3/E2 fixtures retain their exact permitted-with-consent terms;
- R2 uses the repository-established Zone R2 term `Dwelling houses` as permitted with consent;
- SP2 asserts no permitted-with-consent term in this slice because inspected repository evidence establishes the zone identity but not a proposal-specific statutory use term;
- both new journeys intentionally return no proposal-specific DCP evidence;
- tests require exact QSC → DPP → expert-review/audit site/proposal binding;
- forged caller site/proposal fields must be ignored;
- all five DPP topics must remain `Unavailable`;
- expected audit terminal state is `needs_expert_review` / `working_needs_evidence` / `unresolved_pack_referral` with next action `refer_unresolved_pack_for_expert_review`;
- Kempsey SP2 output is checked for absence of E2/Commercial premises evidence;
- runbook: `docs/operations/representative-address-proposal-golden.md`.

Production code, billing, checkout, schema, environments and external data are untouched.

Next:
- open PR and run exact-head Commercial Funnel Golden Gate;
- inspect failures and correct tests to the existing product contract rather than weakening product behavior;
- static review;
- update Issue #427 and this handover with terminal evidence.
- Do not claim every-zone acceptance: this is representative expansion only.

## Safety / continuity rules for desktop

- Do not merge any open PR merely because it is green; review current live state and use Robbie's approval boundary.
- Do not repeat secrets, test payments or setup already completed unless evidence proves replacement is required.
- Do not merge PR #422 or #424 into the Item 78C acceptance branch; they are separate `main`-target feature PRs.
- Item 78C acceptance evidence belongs only to its exact acceptance branch/SHA.
- Production activation remains separately approved work.
- Keep checkout disabled.
- Every merge, pin, workflow run, failure, fix, decision and next step must be recorded in the relevant Issue and canonical docs before ending the desktop session.
