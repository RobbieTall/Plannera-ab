# Item 74H free Byron shed decision composition

Status: FREE DECISION COMPOSITION IMPLEMENTED / USER ESTIMATES REMAIN EVIDENCE-GATED

Last updated: 2026-08-26

## Purpose

Compose the existing versioned Pathway Check, user proposal attestation and protected TfNSW road-evidence result into one plain, deterministic free result.

This is the product behaviour needed before a customer is asked to pay: show what is known, what is only their estimate, which gate has cleared, and exactly why the site-specific paid outputs remain locked.

## Current worked input

The acceptance uses a deliberately fictional proposal, unrelated to any customer site:

- non-habitable shed for agricultural machinery and goods;
- 3.2 ha land area;
- 96 m2 proposed footprint;
- no existing farm buildings;
- 4.2 m proposed height;
- 72 m from the road;
- 24 m from the side boundary;
- 35 m from the other boundary;
- road category unresolved.

The fixture is classified as `USER_ATTESTED` so the trust boundary is exercised. They are useful for orientation and structured input capture, not authoritative planning evidence.

## Deterministic gate behaviour

- The free contract gate may `PROCEED` when the versioned Pathway Check candidate passes.
- The road-classification gate may `PROCEED` only when the protected frontage bridge emits a valid `EVIDENCE_VERIFIED` `ROAD_CLASSIFICATION` observation.
- The proposal-measurement gate remains `MORE_EVIDENCE_REQUIRED` until accepted plans or survey evidence verify the dimensions and setbacks.
- The commercial-evidence gate remains `MORE_EVIDENCE_REQUIRED` until the complete A$49 or A$749 trust requirements are met.
- The overall current result remains `MORE_EVIDENCE_REQUIRED`.

A verified road result clears only the road gate. It cannot promote user estimates, infer compliance, or unlock a paid output.

## Free and paid boundary

A safe free output can be rendered when the base Pathway Check acceptance contract passes, even if its honest decision is `MORE_EVIDENCE_REQUIRED`.

The composition always returns:

- `planningControlsPackEligible: false`;
- `submissionSeeEligible: false`;
- no raw address;
- no coordinates;
- no raw spatial response.

Paid eligibility remains owned by the separate evidence manifest and operator-approval contracts.

## Safety

- Synthetic acceptance only.
- Production checkout remains disabled.
- No Production schema, data, environment, payment or checkout mutation.
- PR #347 remains draft and unmerged.
