# Item 74H customer evidence taxonomy

Status: PROTECTED PREVIEW CONTRACT

## Purpose

Make the free Pathway Check tell a customer exactly what evidence is missing
without predicting approval, weakening a gate, or enabling a paid output.

## Deterministic source

The customer checklist is derived only from persisted, ordered pathway gates.
It does not call an LLM, inspect private uploads, infer a favourable pathway, or
accept user estimates as verified facts.

The general road, survey, source, control and gate requests remain available.
The Byron shed proof adds three explicit actions when the authored blocking
gates contain the corresponding evidence state:

1. Obtain the registered cadastral plan from NSW Land Registry Services.
2. Reconcile the registered-plan area against the current official cadastral
   area and the reviewed Council-hosted survey area.
3. Confirm legally classified road, side and rear setbacks from a reviewed
   registered survey and proposed shed layout.

The area-reconciliation action preserves the exact persisted gate reasoning, so
the customer can see the conflicting recorded areas rather than a generic
survey request. The legal-setback action does not treat an indicative
shed-to-fence dimension as a legal setback.

## Commercial boundary

These actions support the free Pathway Check only. They do not make the A$49
Planning Controls Pack or A$749 submission SEE eligible. Both products remain
blocked until the required evidence is reviewed against the same confirmed
site and proposal, all persisted gates are re-evaluated, and the exact
commercial scope is eligible.

Production checkout remains disabled. This contract makes no Production data,
schema, payment or checkout change.

## Acceptance

The focused contract must prove:

- unrelated generic checklist behavior is unchanged;
- a registered-plan gate creates separate registered-plan and area
  reconciliation actions;
- conflicting recorded areas remain visible in the persisted reason;
- all gates that depend on legal setbacks are linked to the setback action;
- the existing per-gate evidence requests remain present;
- protected addresses, coordinates, parcel identifiers and evidence digests
  are not projected; and
- an evidence-complete PROCEED result produces no missing-evidence checklist.
