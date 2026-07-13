Plannera — Commercialisation Layer Workflows
Status: MVP+ planning
Scope: Local Controls Unlock (DCP Deep Check) + Consultant Network / RFQ Layer
Last updated: July 2026


Overview
This document defines the product workflows, sequencing logic, guardrails and commercial model for Plannera's first commercialisation layer. It sits between the free/basic site check and the higher-value Quick Site Check / SEE Builder products.

Two components are defined here:

Local Controls Unlock — user-funded DCP preparation, surfaced as a paid upgrade per project
Consultant Network / RFQ Layer — structured quote requests matched to verified consultants


1. Local Controls Unlock (DCP Deep Check)
Roadmap status
MVP+ commercialisation feature. High priority after Byron Bay and Kempsey baseline flows are stable.
Purpose
Turn deeper local planning intelligence into an early paid product while avoiding the cost of fully preparing every NSW LGA upfront. Coverage expands based on real user demand rather than speculative ingestion.
User-facing framing
Do not describe this to users as "DCP live ingest" or a "compute fee". The user-facing value proposition is:

Plannera prepares more complete, cited local planning guidance for your project — including relevant DCP controls such as setbacks, parking, landscaping, access, built form, character controls and private open space where available.


User flow
1. User enters a site address

        ↓

2. Plannera identifies LGA, zone and available LEP context

        ↓

3. Are local DCP controls already prepared for this LGA?

   ├── YES → Serve full local controls response (no payment required)

   └── NO  → Show limitation notice + unlock prompt

        ↓

4. User offered: "Unlock local controls for this project"

        ↓

5. Payment collected

        ↓

6. Background DCP / local controls preparation job queued

   (job locking + duplicate prevention enforced — see guardrails)

        ↓

7. User receives interim LEP-based response immediately

   + status indicator: "Local controls being prepared — estimated ready: [date]"

        ↓

8. When job completes → update project record

   → prompt user to refresh Quick Site Check, SEE draft or other outputs


Pricing
Product
Price
Notes
Local Controls Search
$19–$29
Relevant controls listed and cited
Planning Controls Pack
$39–$49
Controls listed + structured assessment of how they apply to the proposal
Subscriber access
Included or discounted
For paid plan subscribers (future)


Distinction between tiers must be clearly communicated at point of purchase. See UX copy requirements below.


Commercial model — LGA activation
The first user to pay for deeper controls in a new LGA helps fund preparation of that LGA's DCP/search layer. Subsequent users in the same LGA benefit from faster access at no additional unlock cost (or at a lower tier).

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
Offer one of the following within 24 hours of job failure:
Full credit applied to account
Refund to original payment method
Conversion of value to a consultant referral / RFQ credit

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


2. Consultant Network / RFQ Layer
Roadmap status
Early commercial layer — not a separate product. Medium-high priority after Quick Site Check and SEE generation are usable.
Purpose
Convert planning insight into professional action. Plannera's core product creates the demand; the Consultant Network provides the next step.


User flow
1. User runs Quick Site Check or planning query

        ↓

2. Plannera identifies likely professional inputs required

   (planner, surveyor, bushfire consultant, ecologist, engineer,

    architect, building designer, certifier — as applicable)

        ↓

3. User clicks "Request consultant quotes"

        ↓

4. Plannera generates structured RFQ from project context:

   - Address

   - LGA

   - Zone

   - Proposal type

   - Known constraints

   - Quick Site Check summary

   - Uploaded documents

   - Urgency

   - Optional budget range

        ↓

5. Matched consultants receive the enquiry

        ↓

6. Consultant responses tracked manually (Stage 1) → consultant inbox (Stage 2+)


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

[Local Controls Unlock — $19–$49]   ← bridge from curiosity to paid intelligence

        ↓

Quick Site Check / SEE Builder

        ↓

[Consultant Network / RFQ]          ← convert insight into professional action

        ↓

(Future) Consultant tools SaaS


Open items before launch
Define operational SLA and status communication for DCP background jobs
Write UX copy clearly distinguishing Local Controls Search vs Planning Controls Pack tiers
Define failure resolution process (credit / refund / RFQ conversion)
Write consultant credential disclosure for directory and RFQ pages
Confirm job locking and duplicate prevention implementation approach
Define maturity check criteria for "Confirmed" confidence state
Set pricing final (within suggested ranges above)
Confirm Byron Bay and Kempsey baseline flows are stable before activating unlock flow

