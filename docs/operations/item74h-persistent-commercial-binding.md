# Item 74H persistent paid artefact enforcement

## Purpose

A passing in-memory commercial binding is not enough. The persistent artefact binding must enforce the same exact site evidence, deterministic outcome and stage trust for both creation and replay.

## Enforced policy

Paid artefact creation and replay require:

- an eligible Item 74H commercial binding;
- a non-null exact scope digest;
- exact equality between the persisted assessment scope key and the commercial scope digest;
- exact equality between the persisted evidence digest and the bound site-evidence digest;
- a persisted assessment decision matching `PROCEED` or `MERIT_ASSESSED`;
- a current active assessment, evidence snapshots and control snapshots;
- at least `EVIDENCE_VERIFIED` trust for the A$49 Planning Controls Pack; and
- at least `OPERATOR_APPROVED` trust for the A$749 submission SEE.

The policy also requires `productionCheckoutEnabled: false`.

## Replay safety

An existing paid binding is not returned before policy evaluation. Replay must present the same assessment, stage, scope key, evidence digest and currently eligible commercial binding.

This prevents an old binding from bypassing later source expiry, control staleness, trust reduction or scope changes.

## Decision semantics

The commercial contract uses `MERIT_ASSESSED`; persistence stores the equivalent `MERIT_ASSESSMENT` decision. This mapping is explicit and tested.

A merit result is not represented as compliance. It can support a paid scope only when the evidence manifest is complete and, for a submission SEE, an operator has approved that exact merit scope.

## Safety boundary

This change is code and contract enforcement only. It adds no schema, data, environment variable or payment mutation. Production checkout remains disabled.
