# Item 74H exact commercial scope binding

## Purpose

The free Pathway Check, A$49 Planning Controls Pack and A$749 submission SEE must render the same accepted site evidence and deterministic controls. They must not independently reinterpret a site or silently substitute a broader generic scope.

`evaluatePathwayCommercialBinding` binds the site-evidence digest to the versioned Byron rural road-setback control.

## Exact-scope requirements

The binding requires:

- the applicable commercial stage in the Item 74H site-evidence manifest to be eligible;
- a current authoritative road-category assertion;
- a measured proposed road-boundary setback;
- exact equality between the road category in the manifest and the deterministic control input;
- exact equality between the measured setback in the manifest and the deterministic control input; and
- a deterministic `PROCEED` or `MERIT_ASSESSED` road-setback result.

The resulting SHA-256 scope digest covers:

- binding version;
- site-evidence digest;
- control ID;
- confirmed road category;
- applicable minimum;
- measured proposed setback; and
- deterministic outcome.

No raw address, coordinate, parcel identifier or geometry is included.

## Product behaviour

- Free Pathway Check eligibility comes from the free manifest boundary.
- The Planning Controls Pack can become eligible only when all pack evidence and the exact road-control scope are satisfied.
- The submission SEE additionally requires the submission manifest boundary, including the evidence upload set and operator approval.
- A below-minimum setback produces `MERIT_ASSESSED`, not a false `PROCEED`.
- Missing or ambiguous evidence produces `MORE_EVIDENCE_REQUIRED` and blocks both paid artefacts.

Eligibility is not checkout activation. The binding always reports `productionCheckoutEnabled: false`.

## Preview proof boundary

The contract tests prove positive and negative bindings with non-site fixtures. They do not claim that the controlled Byron site has a measured shed footprint or road setback.

The controlled site remains blocked until current authoritative road classification and a site plan provide matching evidence. No Production schema, data, variable or checkout change is required for this contract.
