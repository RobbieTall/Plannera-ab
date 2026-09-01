# Item 74H progressive evidence and SEE readiness contract

Status: Accepted product and operating decision for the protected Item 74H proof.

## Purpose

Plannera must let a customer begin and purchase useful planning work before every survey or specialist report exists. Missing evidence controls readiness and wording; it does not automatically stop SEE generation.

The customer promise is:

> Start your SEE now. Strengthen it as new evidence arrives.

Production checkout remains disabled until the commercial acceptance gates are explicitly completed and approved.

## Two independent decisions

Every project must carry both:

1. A planning pathway decision: `PROCEED`, `MERIT`, or `STOP`.
2. An evidence readiness decision: `CONFIRMED` or `MORE_EVIDENCE_REQUIRED`.

A project may therefore be `PROCEED` with `MORE_EVIDENCE_REQUIRED`. The missing evidence must be attached to the affected fact or control, not used as a blanket checkout or generation failure.

A true `STOP` remains appropriate where the property cannot be identified, the proposal is prohibited with no relevant approval pathway, unsafe evidence is supplied, or a requested assertion contradicts authoritative evidence.

## Product progression

### Free Pathway Check

- Does not require a current survey.
- Shows the likely pathway and material controls.
- Identifies evidence likely to be required later.
- Does not claim exact site compliance from generic or unconfirmed data.

### A$49 Planning Controls Pack

- States the applicable controls and sources.
- Separates confirmed facts, user assertions, derived facts, and unresolved facts.
- Includes a tailored evidence and consultant checklist.
- May proceed with `MORE_EVIDENCE_REQUIRED` items.
- Preserves the A$49 credit toward the same project's A$749 SEE.

### A$749 SEE project

Purchase creates an ongoing SEE project, not a one-off immutable PDF.

The first generation may proceed from the available evidence and must:

- complete all sections supported by confirmed evidence;
- label provisional statements and user-supplied assumptions;
- include an outstanding-evidence-before-submission schedule;
- provide specific questions for surveyors, planners, engineers, bushfire consultants, wastewater consultants, and other relevant specialists;
- avoid presenting an unresolved measurement or control as compliant;
- support later evidence uploads, reassessment, and DOCX/PDF regeneration.

External survey and consultant fees are not included.

## Document readiness states

- `WORKING_SEE`: useful project document with disclosed assumptions or gaps.
- `CONSULTANT_REVIEW_READY`: structured for specialists to confirm listed matters.
- `SUBMISSION_READY`: all material evidence gaps for the represented scope are resolved.
- `NOT_RECOMMENDED_FOR_LODGEMENT`: generated work exists, but listed material matters remain unresolved.

Only `SUBMISSION_READY` may be described as submission ready. A generic footer disclaimer is insufficient. Qualification must appear in the readiness status, the affected section, the source record, and the outstanding-evidence schedule.

## Evidence lifecycle

New evidence must update, not restart, the purchased project:

1. Preserve the original source, date, authority, scope, and hash or durable reference.
2. Reassess only the affected facts and controls.
3. Replace provisional wording only when the new evidence supports it.
4. Record superseded assumptions and the reason for each change.
5. Regenerate the customer and consultant outputs from the same evidence graph.

## Survey and registered-plan rule

A registered deposited plan and a current survey answer different questions.

- The registered plan establishes the legally created lot, boundaries, roads, easements, and registration provenance.
- A current survey locates present fences, buildings, levels, and other physical features relative to those legal boundaries.
- A proposed site plan locates the proposed development.

The free check and controls pack may proceed without a current survey. An SEE may also be generated, but exact setback or boundary-compliance statements remain provisional until supported by a sufficiently current survey or equivalent authoritative evidence.

## Protected Byron proof

For the approved public Byron case at Lot 11 DP 1225487:

- the Council material confirms a proposed 200 m2 machinery shed with a 20 m by 10 m footprint;
- the development plan labels a fence line and a setback-to-fence-line relationship;
- the fence line must not be treated as the legal boundary without reconciliation;
- operator-supplied photographs of all three DP1225487 pages confirm the plan identity, registration date, lot/address schedule, and legal-plan context;
- those photographs are evidence derivatives, not machine-precise substitutes for the original registered-plan file;
- personal signatures and the photographs themselves must not be committed to the repository or exposed publicly;
- the exact setback findings remain `MORE_EVIDENCE_REQUIRED` until the registered-plan geometry, current Council survey material, and proposed shed plan are reconciled.

This state must not block creation of a working SEE or consultant pack. It must block only an unsupported claim that the exact setbacks are confirmed or that the document is submission ready.

## Acceptance invariants

The protected Item 74H acceptance must prove:

- the same evidence graph feeds the free check, A$49 pack, and A$749 SEE;
- missing evidence does not silently become a false fact;
- missing evidence does not automatically prevent paid project creation;
- every provisional statement has a visible qualifier and evidence request;
- later evidence can promote affected facts without duplicating the project or losing provenance;
- DOCX and PDF outputs display the same readiness and qualification state;
- Production checkout and Production writers remain disabled until separately approved.


## Persistence and commercial readiness bridge

The accepted product contract is represented by an explicit progressive binding, separate from the final paid-artefact binding.

- `pathwayDecision` records `PROCEED` or `MERIT_ASSESSMENT`.
- `evidenceStatus` independently records `CONFIRMED` or `MORE_EVIDENCE_REQUIRED`.
- `PLANNING_CONTROLS_PACK_WORKING` and `SUBMISSION_SEE_WORKING` permit truthful working outputs for the same project.
- The A$49 and A$749 product codes, prices, scope digest, evidence digest, confirmed controls and outstanding evidence are persisted together.
- Working outputs must remain `submissionReady: false` and `finalSubmissionEligible: false`.
- Existing final-stage policy remains unchanged and must still reject incomplete evidence.
- Production checkout remains disabled.

The customer result exposes `BLOCKED`, `WORKING` or `FINAL` readiness separately from final eligibility. This lets the interface say “start now and strengthen the same project later” without describing provisional work as final.


## Customer-facing working-product contract

The Pathway Check must render pathway viability separately from evidence readiness. For the accepted public Byron example it must say `MERIT_ASSESSMENT` and `MORE_EVIDENCE_REQUIRED`; it must not collapse both facts into a single blocked message.

Product presentation follows the persisted readiness value:

- `BLOCKED`: a hard pathway or evidence boundary prevents a useful product; do not offer progress.
- `WORKING`: show the exact A$49 or A$749 product, explain that useful work can start now, list the unresolved evidence, and tell the customer that later evidence strengthens or regenerates the same purchased project.
- `FINAL`: the current exact scope satisfies the final product policy, subject to the required operator quality assurance.
- A working SEE must say that it is not submission ready in the readiness state and affected content, not only in footer text.
- The A$49 card must explain the one-time same-scope A$49 SEE credit. The A$749 card must explain the A$700 balance when that credit is valid.
- A readiness card must never activate checkout by itself. Both the persisted checkout boundary and environment checkout configuration must be enabled separately. They remain disabled for this proof and in Production.


## Protected customer-presentation acceptance (2026-09-01)

The actual Pathway Check modal has a branch-locked visual acceptance route at
`/internal/item74h-commercial-acceptance`. It is not a customer fixture and
must never be treated as planning evidence.

The route renders only when all of these are true:

- Vercel reports a Preview deployment.
- The Git ref is exactly `agent/item74h-visual-route-guard-20260901`.
- A$49 Planning Controls Pack checkout is not enabled.
- A$749 submission SEE checkout is not enabled.

Every other environment returns 404. The route uses synthetic/public-review
facts only, makes no database or Blob request, contains no address or
coordinates, and renders the real Pathway Check modal. Acceptance must visually
confirm the separate MERIT and MORE_EVIDENCE states, the named evidence
schedule, WORKING A$49/A$749 presentation, the same-scope credit explanation,
and disabled checkout. Production checkout remains disabled.


The root middleware enforces the same environment and branch contract before
the App Router renders. Production and every non-approved branch must return a
true HTTP 404 with `noindex, nofollow`; a rendered not-found body carried by an
HTTP 200 streaming response is not acceptable evidence of this boundary.


The public acceptance URL is implemented as a non-streaming route handler.
Unsafe environments receive a plain HTTP 404 before rendering. The exact
protected Preview receives a temporary redirect to the guarded `/view` page,
which renders the actual modal. This avoids mistaking an App Router streamed
not-found body carried by HTTP 200 for a true transport-level 404.
