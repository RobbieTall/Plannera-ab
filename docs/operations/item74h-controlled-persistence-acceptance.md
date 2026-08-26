# Item 74H controlled persistence acceptance

Status: **PREVIEW ACCEPTED / PRODUCTION DISABLED / PAID OUTPUTS BLOCKED / CLEANUP VERIFIED**

Date: 2026-08-25 (Australia/Sydney)

## Purpose

This record documents the protected Preview acceptance for the first evidence-confirmed Item 74H persistence slice. It does not certify launch readiness, paid-output eligibility, operator approval, or Production schema readiness.

The controlled slice is limited to:

- Byron LGA;
- RU2 Rural Landscape;
- shed/outbuilding proposal type;
- one public address used only through temporary Sensitive Preview variables;
- the current repository LEP, DCP and Codes SEPP evidence available to the acceptance harness; and
- a deterministic `MORE_EVIDENCE_REQUIRED` result.

## Accepted exact scope

Repository commit: `c5dbf67123a8989ffbe81cb8e977cd45d315bcac`

Controlled Preview deployment: `dpl_APZpQLxN1qLXee5W7LNmPPLDymAz`

Final clean-state Preview deployment: `dpl_DCGnWaodNEch6o8crd7Q7ay5mTPr`

The controlled deployment proved:

- the public address resolved to exactly one Byron RU2 site;
- authoritative NSW spatial zoning identified Byron LEP 2014 and RU2;
- current repository LEP, Byron DCP and Codes SEPP evidence was retrieved;
- 4 evidence snapshots, 17 control snapshots and 6 gate snapshots were durably written;
- the assessment was created once and the replay reused the same assessment;
- reload preserved evidence, controls, gates and spatial provenance;
- an unsafe `PROCEED` attempt was rejected without a write;
- the free Pathway Check binding was replay-safe;
- the A$49 Planning Controls Pack binding was blocked;
- the A$749 submission SEE binding was blocked;
- raw address, coordinates and parcel identifiers were not retained;
- synthetic and controlled cleanup both reconciled to zero rows; and
- Production checkout and Production mutation remained false.

## Engineering correction made during acceptance

The first controlled write exposed an interactive-transaction timeout after sequential control-snapshot inserts. The failed transaction rolled back, and a read-only Neon reconciliation confirmed zero residual controlled rows.

The persistence service was corrected to batch evidence and control snapshot inserts while retaining:

- serializable transaction isolation;
- deterministic evidence-to-control foreign-key bindings;
- existing validation and fail-closed behavior;
- idempotency checks; and
- the same cleanup boundary.

The corrected service passed all repository workflows, safe-default hosted acceptance, controlled hosted acceptance and final clean-state deployment.

## Final protected state

The temporary variables `ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE` and `ITEM74H_CONTROLLED_ADDRESS` were deleted after the flight. The final deployment confirms both controlled harnesses are disabled with reason `approval_gated`.

The isolated Neon branch `br-silent-boat-a74zto1n` contains the approved additive Item 74H Preview schema. A read-only post-flight query returned zero controlled rows across assessments, definitions, spatial provenance, artefact bindings, artefacts, sites, projects, properties and users.

No Production variable, checkout flag, schema or data was changed.

## Commercial boundary

This acceptance proves the durable free site-triage path and its evidence boundary. It deliberately does not make the paid products green.

The next evidence work must resolve the site facts still required for an evidence-verified decision, including proposal dimensions and use, legal landholding area, existing farm-building aggregate, road classification and setbacks, waterbody/ridgeline/heritage/environmental-sensitivity checks, mapped constraints, source currentness and operator review.

Only after those facts are genuinely verified may the same accepted evidence scope bind to the A$49 Planning Controls Pack and then feed the A$749 submission SEE.


## Public DA catalog binding acceptance: 2026-08-27

Repository commit `c4c7cacf815ae55bad3ebbce460551f80171bb04` and protected
Preview deployment `dpl_DUAsaQgJT4KcuBL5svwfTVLSptYu` extend the accepted
controlled scope without a schema change.

The same controlled Byron RU2 assessment now persists 5 evidence snapshots.
The fifth is a metadata-only official Council DA catalog, stored under the
existing `OPERATOR_NOTE` evidence kind and identified by
`pathway-public-da-evidence.v1`. Its deterministic digest participates in
the assessment-wide evidence digest and survives replay/reload with the
token-free Council tracker URL.

This does not verify document content or proposal measurements. The accepted
result remains `MORE_EVIDENCE_REQUIRED`, both paid artefacts remain blocked,
cleanup reconciles to zero rows, and Production checkout and mutation remain
false.

The temporary controlled-address variables were deleted immediately after the
flight. The next clean-state deployment must report both controlled runners as
disabled with reason `approval_gated`.
