Plannera — Commercialisation Layer Workflows

## Current Item 78C handover - 24 September 2026

**HOLD: Preview whole-funnel acceptance is not complete; not a commercial-launch approval.**

This section supersedes older Item 78C operational status, branch/pin and next-action checkpoints below. Older product requirements and historical evidence are retained, not erased. Start with [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395), [PR #420](https://github.com/RobbieTall/Plannera-ab/pull/420), and the current `docs/project-memory/item78c-current-handover.md` **from PR #420's head branch**, not an old copy on main.

- Acceptance branch: `accept/item-78c-byron-kempsey-20260914`, still at `1cc7d2950077f145862a36174c0cc141a9161043`. The September 11 SHA is historical, not the current authorised target.
- Latest examined whole-funnel run [#21](https://github.com/RobbieTall/Plannera-ab/actions/runs/35859336870) failed both council bridges at `stripe_paid_source`; hosted payment-status requests returned HTTP 404. Login/project ownership or hosted/runner database alignment remains unproven. Do not assume a bad Stripe key.
- PR #420 remains draft/unmerged. Diagnostic code at `ddead58a7014db1b8e1f68a399b8688d1d4ae88a` received separate read-only AI review with no blocking diagnostic-code defect. Follow-up `e5374f939c586445e2a83c5b0a10852d3d8625ad` adds exact acceptance-branch Git-deployment suppression and clarifies history; all three examined PR checks passed at that SHA.
- Both Preview environments already have RobbieTall as required reviewer, administrator bypass off and the exact acceptance-branch rule. Preserve saved secrets, independent council fixtures and current pins; do not ask Robbie to repeat setup without evidence.
- The current request is documentation/handoff only. The next bounded merge/repin/read-only-diagnostic package was proposed, not executed or unambiguously approved by this handoff request.
- Production is untouched by this work. Checkout must remain disabled; its live value was not freshly audited in this documentation task. No Production data/schema mutation or activation is authorised.

The documentation-only follow-up SHA is recorded in Issue #395 and PR #420 after publication. Do not attribute prior CI results to a newer SHA. Diagnostic success would only establish a saved-session/project match in the selected database, not final Item 78C acceptance.

### Release evidence boundary

Run #21 passed authorisation/target checks, private Blob persistence and cleanup, Sandbox/ClamAV cleanup and compiler/rendered-output contract checks. Both paid-source bridges failed; consultant handoff and final decision were skipped. These partial passes do not prove a real customer journey. Prior test payments must not be repeated merely because a downstream ownership/status request returned 404. Agent distribution, CAD/sketch work and unrelated feature expansion remain deferred.

Status: Approved launch contract; implementation/activation states remain item-specific
Scope: Free Quick Site Check + A$49 Planning Controls Pack + consultant-input loop + A$749 SEE before credits
Last updated: September 2026


Overview
This document defines the product workflow, sequencing, guardrails and commercial model from first site investigation through a submission-oriented SEE or consultant handoff. Plannera Check is the acquisition surface inside the same application and project evidence chain, not a separate product or backend.

Three commercial components are defined here:

Planning Controls Pack — A$49 proposal-specific cited local-controls analysis
Consultant input loop — evidence-derived triage, targeted briefs/referral and returned-report intake
Submission-oriented SEE — A$749 before credits, with one eligible same-scope A$49 pack credit


1. Planning Controls Pack and Just-in-Time LGA Preparation
Roadmap status
The exact-scope A$49 Stripe implementation and protected sandbox lifecycle are complete; Production activation remains a separate operator decision. The Byron/Kempsey whole-LGA source matrix is accepted, while representative address-and-proposal commercial journeys remain open.
Purpose
Sell proposal-specific local planning intelligence while allowing council coverage to expand from demonstrated demand rather than speculative statewide ingestion.
User-facing framing
Do not describe this to users as "DCP live ingest" or a "compute fee". The user-facing value proposition is:

Plannera prepares a proposal-specific, cited Planning Controls Pack for your project, including applicable DCP controls such as setbacks, parking, landscaping, access, built form, character controls and private open space where the source supports them, plus explicit unresolved topics and next actions.


User flow
1. User enters a site address

        ↓

2. Free Quick Site Check resolves the site and returns available cited LEP zone, permissibility and mapped controls

        ↓

3. User confirms a concise proposed-development description and creates/saves the project

        ↓

4. User is offered the A$49 Planning Controls Pack for that exact project/site/QSC/proposal scope

        ↓

5. Are current local DCP sources already prepared for this LGA?

   ├── YES → Generate the proposal-specific paid pack from current cited sources

   └── NO  → Return available LEP/state preliminaries and queue paid just-in-time LGA preparation

        ↓

6. Project displays queued/in-progress/ready/failed status, honest service target and interim limitations

        ↓

7. When preparation passes source and retrieval QA, notify the user and generate/refresh the exact paid pack

        ↓

8. Planning Feasibility and Delivery Plan identifies controls, risks and professional inputs

   (`Required`, `Conditional`, `Recommended`, or `Not identified from current evidence`)

        ↓

9. User proceeds directly to SEE preparation or through the consultant-input loop


Pricing
Product
Price
Notes
Free Quick Site Check
A$0
Available cited LEP/site preliminaries and proposal capture
Planning Controls Pack
A$49 total including GST under the approved Australian contract
Exact project/site/QSC/proposal scope; cited DCP analysis, unresolved topics and consultant/next-action inputs
Submission-oriented SEE
A$749 before credits
Eligible same-scope paid pack consumes one A$49 credit, leaving A$700 payable


Commercial model — LGA activation
The first user to purchase deeper controls in a new LGA helps fund preparation of that LGA's DCP/search layer. Completed source preparation becomes shared infrastructure, but each A$49 purchase remains a proposal-specific assessment and earns only its own exact-scope SEE credit.

This creates a user-funded expansion model where coverage grows in line with real demand.


SLA and status communication
Background DCP preparation jobs must include a user-facing status indicator at all times. Suggested states:

State
Display label
Queued
Local controls preparation queued
In progress
Local controls being prepared — estimated ready: [date]
Complete
Local controls ready — refresh your project
Failed
See failure handling below


Target turnaround: Within 2 business days of payment. Communicate this at point of purchase and in the confirmation.


Failure handling
Some NSW DCPs cannot be reliably retrieved or processed (older councils, poorly structured PDFs, instruments split across multiple documents). When a job fails:

Do not leave the user without a response or resolution pathway
A system/retrieval failure that prevents generation and persistence of the promised pack requires an operator-initiated full refund to the original method, completed only after signed provider confirmation
A truthful persisted pack with cited and unresolved topics is delivered value and proceeds to the targeted expert-review path rather than an automatic refund
Do not improvise account credits, partial refunds or referral-value conversions outside an approved durable policy

Failure resolution must be defined operationally before launch. Ad hoc decisions under user pressure are not acceptable.


Confidence states
All controls returned must carry a confidence state. Do not surface controls without one.

State
Meaning
Confirmed
Sourced directly from verified instrument, maturity check passed
Likely
Sourced from instrument but not fully verified against current version
Needs Input
Control exists but requires site-specific information to apply
Needs Expert Review
Flagged as requiring professional assessment
Unavailable
Control not retrievable for this LGA/zone



Guardrails
Do not promise guaranteed compliance at any stage
Do not imply unlocked controls are fully verified unless maturity checks have passed
Do not run full DCP parsing inside a live user request — background jobs only
Enforce job locking and duplicate prevention (one active job per LGA at a time)
Separate LEP-based interim response from DCP-enhanced response in the UI


2. Submission-Oriented SEE
Roadmap status
Commercial product contract, exact-scope Preview binding, credit foundation, private synthetic Blob/Sandbox lifecycle, malware-scan boundary, immutable operator review and exact four-document package assembly are implemented and proven in protected Preview. The four roles are current road classification, registered cadastral plan, detail survey reconciled to the registered-plan hash, and proposed layout bound to the detail-survey hash. The registered plan controls parcel area where sources differ, while road, side and rear setbacks must be survey-derived. Fixture evidence still cannot bind a paid artefact, and Production checkout remains disabled. Real registered-plan execution, complete DOCX/PDF submission acceptance and Production activation remain unfinished.

Price and credit
The SEE list price is A$749 before credits. One settled, unrefunded and unconsumed A$49 Planning Controls Pack for the same requester, owned project, current-site QSC and normalized proposal may be consumed once, leaving A$700 payable. The credit is non-transferable, not cash-redeemable and cannot be reused across another site, project, QSC or materially changed proposal. Checkout must derive and itemise price, credit, balance and applicable GST on the server.

Document workflow
1. Start a living SEE draft from the exact QSC, Planning Controls Pack and Planning Feasibility and Delivery Plan.
2. If no specialist input is identified from current evidence, complete the document subject to its quality gates and optional planner review.
3. If input is required or conditional, generate discipline-specific consultant briefs and obtain explicit consent before referral.
4. Accept reports obtained through Plannera or elsewhere. Parse/OCR, cite by page, verify site/proposal applicability, surface conflicts and classify readability before using them.
5. Treat maps/plans as provenance-bearing evidence with source, date, layer/legend and confirmed observation; storing an image alone is insufficient.
6. Regenerate only affected assessments while preserving immutable document versions and revision history.
7. Produce editable DOCX and polished PDF outputs with tables, maps/figures, source register, limitations and appendix/report schedule.

Finality rule
“Final” is an evidence state, not a successful generation event. A purchased SEE does not become submission-oriented while a required input is missing, unreadable, stale, conflicting or unsupported. The product may instead return a complete targeted referral/review path without fabricating a conclusion. Payment never changes confidence or guarantees approval.


3. Consultant Network / RFQ Layer
Roadmap status
Immediate next commercial slice after Item 72. It is a workflow inside Plannera, not a separate product; the initial delivery target may be a truthful human-operated Plannera queue.
Purpose
Convert planning insight into professional action. Plannera's core product creates the demand; the Consultant Network provides the next step.


User flow
1. User reaches the Planning Feasibility and Delivery Plan from an exact paid Planning Controls Pack

        ↓

2. Plannera classifies professional inputs as Required, Conditional, Recommended, or Not identified from current evidence

   (planner, surveyor, bushfire consultant, ecologist, engineer,

    architect, building designer, certifier — as applicable)

        ↓

3. User chooses a targeted referral or engages their own consultant

        ↓

4. Plannera generates a discipline-specific brief from the immutable project evidence snapshot:

   - Address

   - LGA

   - Zone

   - Proposal type

   - Known constraints

   - Exact Quick Site Check and Planning Controls Pack citations

   - Trigger, question to answer and expected deliverable

   - Uploaded documents

   - Urgency

   - Optional budget range

        ↓

5. With explicit consent, the package is submitted to the truthful human-operated Plannera referral queue

        ↓

6. Delivery state distinguishes package saved, submitted to Plannera, sent to consultant and consultant acknowledged

        ↓

7. Returned reports are uploaded, assessed for readability/applicability and incorporated into the living SEE evidence chain


Build stages
Stage 1 — Lightweight directory (MVP)
Consultant profiles include:

Business name
Discipline
Regions / LGAs serviced
Project types handled
Licence / qualification fields (self-reported — see credentials note below)
Website and contact details
Profile visibility setting

Users can browse consultants or see matched suggestions following a site check.

MVP scope: Consultant profiles, directory listing, RFQ form, email notification to consultant, admin visibility of all enquiries. No payment complexity until demand is proven.


Stage 2 — RFQ matching
Plannera matches RFQs to consultants based on discipline, LGA and project type
Initial management via simple email notifications before building a full consultant portal
Track enquiry status manually


Stage 3 — Consultant tools (future)
Paid features for consultants:

Lead access / RFQ inbox
Profile priority placement
Branded Quick Site Checks
SEE drafting support
Bulk site screening
Client project workspaces


Monetisation options
Model
Description
Priority
Paid leads / RFQs
Charge per qualified enquiry sent to consultant
Stage 2
Consultant subscriptions
Free profile with limited enquiries; paid tiers $49–$199/month
Stage 2–3
Sponsored placement
Clearly labelled; future only
Stage 3+
Consultant tools bundle
SaaS layer for consultants using Plannera as a workflow tool
Stage 3+


Note on lead model: Per-lead pricing creates pressure on consultants to respond to enquiries outside their fit, which degrades response quality over time. Subscription access to a qualified RFQ flow is generally stickier and creates better alignment. Monitor this dynamic as Stage 2 develops.


Credentials and verification
Consultants self-report qualifications during profile creation. Plannera does not verify professional credentials at MVP.

This position must be clearly communicated to users on the directory and at point of RFQ submission. Suggested disclosure:

Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.

A verification pathway (e.g. PIA membership, registered certifier status) can be added in a later stage if demand and trust signals support it.


Commercial positioning
The Consultant Network:

Is a commercial arm of Plannera, not a separate product
Increases user trust by providing a clear next step after planning insight
Gives consultants a reason to join early (structured, pre-qualified leads)
Turns Plannera from an information tool into a project activation platform
Can scale nationally faster than the planning intelligence engine because it is not jurisdiction-dependent

Planning intelligence remains focused on NSW first. The consultant directory can expand across Australia more quickly if demand exists.


Roadmap positioning summary
Free / basic site check

        ↓

[Planning Controls Pack — A$49]   ← proposal-specific cited local controls

        ↓

Planning Feasibility and Delivery Plan

        ↓

[Direct SEE branch] or [Consultant brief / referral]

        ↓

[Submission-oriented SEE — A$749 before credits]

        ↓

[A$49 exact-scope pack credit → A$700 balance where eligible]

        ↓

(Optional) Planner review / submission and future consultant tools SaaS


Open items before launch
Complete truthful consultant referral submission/delivery and returned-report intake
Define and operationally verify the LGA preparation service target and failed-preparation resolution
Execute real uploaded documents through the accepted private malware-scanning and immutable operator-review chain, then complete OCR/indexing, spatial provenance and evidence-conflict handling; synthetic acceptance proves the architecture but does not establish a real clean or verified document
Complete protected A$749 entitlement and single-use exact-scope A$49 credit execution, then obtain separate approval before applying any required Production persistence
Build and visually verify professional DOCX/PDF SEE output against an approved example template
Write consultant credential disclosure for directory and RFQ pages
Extend the accepted Byron/Kempsey whole-LGA source matrix into representative address-and-proposal golden journeys
Complete whole-funnel non-production payment, referral, upload, regeneration and rendered-document acceptance
Obtain separate explicit operator approval before any Production pack or SEE checkout activation


## Private Preview Blob authentication

Protected private-Blob acceptance supports Vercel OIDC and the legacy read-write Blob token. OIDC is preferred when the acceptance code runs on Vercel. The protected GitHub Actions workflows are external CI, so their isolated Sandbox calls use Vercel's documented access-token mode instead of a copied, short-lived OIDC token.

For every protected GitHub environment that can run private-evidence or commercial-bridge acceptance, configure `ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN` as an environment secret and `ITEM74H_PREVIEW_VERCEL_TEAM_ID` plus `ITEM74H_PREVIEW_VERCEL_PROJECT_ID` as environment variables. The access token must be scoped to the owning Vercel team. Keep `ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN` and `ITEM74H_PRIVATE_BLOB_STORE_ID` for the private Blob proof. The scripts fail closed when the access-token tuple is absent, partial or malformed, and they never print credential values.

Do not copy an OIDC credential into either access-token option. The Blob SDK gives an explicit Blob `token` precedence over OIDC and interprets it as a legacy read-write Blob token; the Sandbox SDK requires a Vercel access token together with the exact team and project IDs in external CI. Credential rotation remains an explicit operator action, and Production must stay disabled.

The `commercial-bridge` suite runs in the established `stripe-test-acceptance` GitHub environment so the paid-session fixtures remain in their original protected boundary. Every other stateful suite continues to use `item74h-stateful-preview-acceptance`. The Stripe environment must additionally hold the exact Item 74H Preview database URL, private Blob store ID, Vercel access token, Vercel team ID, Vercel project ID, Item 78A Stripe test session ID, and the four Item 74H authorization variables. Do not persist a Vercel OIDC token in GitHub or duplicate the Stripe commercial secrets into a second environment.

## Item 74H progressive evidence and DA History Assist

The paid project is an evolving evidence workspace, not a one-off PDF. Survey, consultant and selected public DA material is added to the exact existing scope, classified by authority and currency, reviewed for applicability, and then used to regenerate the working A$49 Planning Controls Pack and A$749 SEE.

Public DA discovery is permission-aware. The introductory layer may search an allow-listed tracker and show application/document metadata. It does not claim a complete history and does not automatically copy files. A document enters protected project processing only through an authorised integration or explicit customer-supplied upload. Historical approvals remain analogous or site-history evidence; current controls are always revalidated.

Missing evidence does not automatically block purchase or working generation. It blocks only the affected unsupported assertion and final/submission-ready status. Production checkout remains disabled until the separate launch decision.


## Item 77 protected customer journey

The next commercial acceptance joins the already-approved components into one customer-visible sequence rather than another disconnected proof. It must preserve exact project/site/QSC/proposal scope from Property Check through A$49 test purchase, pack generation, later evidence, regeneration, A$49 credit and A$749 working SEE outputs.

The touched interface uses progressive disclosure for long clauses and evidence detail, keeps primary status and next action visible on mobile, and uses restrained motion that never delays access to planning information.

Acceptance remains protected and non-production. The deterministic composite gate is followed by a fresh Stripe hosted test lifecycle and exact-head Vercel Preview. Production checkout remains disabled until separate explicit approval.

## Future evidence-aware concept design and CAD handoff

This is an approved post-Item 77 product direction, not an active Production promise. It extends the same project, evidence graph, Planning Controls Pack, working SEE and consultant loop.

Customer sequence:

1. Upload a rough sketch, photograph, deposited plan or survey-derived markup.
2. Plannera extracts visible geometry and written dimensions, classifies their source, and asks the customer to confirm or correct declared measurements.
3. A deterministic geometry service creates a clean scaled concept; model reasoning may orchestrate operations but cannot establish measurement truth.
4. Plannera overlays cited setbacks, mapped constraints, buildable envelopes and unresolved site evidence.
5. The customer refines the concept conversationally or through simple controls, with immutable versions and provenance.
6. Plannera produces responsive SVG/PDF previews and an editable, machine-validated DXF handoff.
7. The concept, its assumptions and the original evidence remain available to the SEE and consultant workflows. Professional confirmation can strengthen the same project later without repurchase solely because evidence improved.

Commercially, this can become a high-intent bridge between the A$49 Planning Controls Pack and the A$749 SEE, or a capability within the SEE/consultant package. Pricing is deliberately undecided until the narrow Byron/Kempsey proof measures model, geometry, rendering, support and professional-review costs.

Guardrails:

- never present a customer sketch, photograph or AI extraction as a current survey;
- never infer absolute scale without at least one confirmed dimension or authoritative reference;
- show known, declared, extracted, derived, conflicting and unresolved measurements distinctly;
- fail closed on impossible or internally inconsistent geometry;
- distinguish concept feasibility from certified design, construction documentation and submission readiness;
- keep current planning-law validation independent of historical plans and analogous approvals;
- require separate approval before Production uploads, checkout, paid entitlement or real-document processing.

The authoritative capability contract and first-slice acceptance are in [Evidence-aware concept design](product/evidence-aware-concept-design.md).

## Item 78A protected commercial bridge

The protected `commercial-bridge` Preview suite extends the paid-pack journey without creating another isolated commercial subsystem. It resolves a real paid Stripe test-mode A$49 pack, requires its active entitlement and matching persisted DPP, introduces reviewed later evidence, regenerates working SEE outputs on the same project, and proves a single-use A$49 credit against the A$749 SEE.

Same-project scope means the same requester, owned project, current-site Quick Site Check and normalized proposal; it does not mean reusing one product key. The A$49 Planning Controls Pack and A$749 SEE retain distinct product-specific scope keys, and the single-use credit ledger is the explicit bridge between them. Historical cancelled checkout attempts remain auditable but do not count as additional paid packs.

The source payment is real test-mode commerce. The target SEE-side purchase and artefact records are deterministic synthetic acceptance records, use the credited A$700 payable amount, and are removed after replay and denial checks. The output remains working-only and requires operator review. Production checkout is disabled.

Acceptance output is deliberately non-sensitive. Expected assertion failures and unexpected exceptions report only the active stage code; cleanup exceptions report `cleanup`. Raw credentials, identifiers, addresses, proposal text and exception payloads must never be emitted.


## Item 78C Byron and Kempsey whole-funnel acceptance

Item 78C is the release gate over the existing Item 78A commercial bridge and Item 78B canonical SEE compiler. It does not introduce a parallel checkout, entitlement, evidence or document-generation path.

The manual `Item 78C Byron and Kempsey Whole-funnel Acceptance` workflow runs two independent protected Preview fixtures at one exact feature commit. Each GitHub environment, `item78c-byron-preview` and `item78c-kempsey-preview`, uses the same variable and secret names as the proven Item 78A bridge while targeting a different persisted council project, paid Stripe test-mode session, artefact scope and proposal scope. The two jobs may share the one explicitly approved isolated Preview database and private Blob infrastructure, but each fixture is pinned with `ITEM78C_EXPECTED_COUNCIL`, so a valid Kempsey run cannot be reported as Byron or vice versa.

The workflow proves:

- authoritative Quick Site Check, Detailed Planning Pack and working SEE lineage for both councils;
- settled A$49 pack entitlement, later reviewed evidence, regeneration and one-time A$49 SEE credit;
- the A$749 working SEE path with DOCX/PDF outputs and operator-review qualification;
- the `see-builder-standard.v1` dynamic, statutory/s4.15, variation/merit, specialist-report and evidence-finality contracts;
- exactly one consultant-referral lifecycle and one direct working-SEE journey;
- replay/idempotency and zero synthetic database/object residue; and
- Production checkout and mutation remain disabled.

Protected environment setup is configuration, not evidence. Both environments require exact-commit authorization variables, isolated Preview database and Blob credentials, Stripe test acceptance values, and consultant-referral values. The consultant project and review-request artefact identifiers belong in protected environment variables, never workflow inputs or the combined artifact.

Only sanitized upstream summaries enter the release decision. The final `item78c-whole-funnel-decision` artifact contains the two council labels, their journey roles, boolean checks and either `READY_FOR_NON_PRODUCTION_ACCEPTANCE` or `HOLD`. Raw referral output, addresses, proposal text, project IDs, artefact IDs, payment/session IDs, cookies and secrets are not uploaded.

A green Item 78C run authorizes rendered-output review and a non-production launch-readiness decision only. It does not enable Production checkout, promote a database branch, mutate Production records or constitute customer launch approval. Those remain separate explicit approvals.

### Current Item 78C checkpoint (2026-09-13)

Status: **PREVIEW INFRASTRUCTURE CONFIGURED / FINAL RUN INPUTS PENDING / NOT EXECUTED**.

The immutable acceptance branch and commit are confirmed, both protected GitHub environments are branch-restricted, the isolated Neon Preview branch is ready, and the Vercel checkout/referral/webhook settings are scoped only to the exact branch. A fresh short-lived Sandbox credential, two independent paid Stripe test-session IDs and the Kempsey consultant admin/session credentials remain required before dispatch. The exact Preview commit must then be redeployed, the protected workflow run, and representative DOCX/PDF output inspected.

No `READY_FOR_NON_PRODUCTION_ACCEPTANCE` decision has been produced. Production checkout remains disabled.

### Item 78C authentication checkpoint (2026-09-14)

Status: **HOLD / CORRECTED MAIN READY / ACCEPTANCE SNAPSHOT SUPERSEDED**.

PR #397 merged the reviewed authentication and ownership correction to `main` as `ae63ee208c938907d7342b058735baf8620c6f43`. Authenticated identity now comes only from a revocable database-backed NextAuth session; `np_session` is limited to anonymous browser continuity. Targeted project claiming requires the exact originating anonymous session, and Edge/Node secret selection is consistent.

The former immutable acceptance SHA `404e5a5314e40b2ecbdd6d5a8c694d705d07ecf8` remains preserved but is superseded and must not be dispatched because it predates the correction. The next protected run requires an explicitly approved new immutable branch/commit from corrected `main`, both council environments re-pinned to it, independent paid Stripe test sessions, the Kempsey consultant fixture and representative DOCX/PDF inspection.

No `READY_FOR_NON_PRODUCTION_ACCEPTANCE` decision has been produced. Production checkout remains disabled, and no Production data/schema mutation or customer launch is authorized.

## Item 78C protected-run checkpoint - 2026-09-17

Current decision: **HOLD**.

The latest protected run is
[Item 78C run 35200070708](https://github.com/RobbieTall/Plannera-ab/actions/runs/35200070708)
at exact commit `580b474c5bd5738299e5b10ac2a5ef4bb3c9762e`.
Authorization passed for both branch-restricted council environments and the
canonical SEE compiler/DOCX/PDF rendering contract passed. Both independent
council jobs failed closed at private Blob cleanup before their durable
commercial bridge could run. The workflow correctly skipped consultant
handoff and the combined release decision.

Operational rule: do not rerun this stateful workflow merely to seek a green
result. First correct the provider delete path, remove all synthetic residue
from failed Preview runs, and prove an exact zero count. Any correction must
retain URL/pathname target validation, private access, test-only inputs,
independent council fixtures and the zero-residue assertion. Only a later
fully green run may produce `READY_FOR_NON_PRODUCTION_ACCEPTANCE`.

Production checkout remains disabled. This checkpoint authorizes no Production
database/schema change, deployment promotion, live payment or customer file
processing.
