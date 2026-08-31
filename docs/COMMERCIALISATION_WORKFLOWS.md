Plannera — Commercialisation Layer Workflows
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
