# Item 74H persistent paid artefact enforcement

## Purpose

The exact commercial binding is embedded in the persisted Preview assessment result. The artefact binder reads durable evidence instead of trusting a new caller-supplied eligibility object. No schema change is required.

## Assessment write enforcement

When a commercial binding is supplied, persistence requires a recomputed valid scope digest; matching assessment scope, evidence digest and decision; Planning Controls Pack eligibility; and Production checkout disabled. The versioned binding participates in idempotent replay identity.

Assessments without a commercial binding remain valid for free or `MORE_EVIDENCE_REQUIRED` flows, but cannot bind a paid artefact.

## Paid creation and replay

Both first creation and replay require the persisted binding, current assessment/evidence/controls, exact scope and evidence equality, and matching deterministic outcome. The A$49 pack requires `EVIDENCE_VERIFIED` trust. The A$749 SEE requires `OPERATOR_APPROVED` trust.

## Merit safety

`MERIT_ASSESSMENT` receives the same currency, evidence, spatial and control checks as `PROCEED`. Merit gates may contain only `PROCEED` or `MERIT_ASSESSMENT`; any STOP or unresolved gate blocks the assessment.

This is protected Preview code only. It makes no schema, Production data, environment, checkout or payment change.
