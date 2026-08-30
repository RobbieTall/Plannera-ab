# Item 74H Pathway Check operating contract

Status: SAFE DELIVERY CONTRACT / NO PRODUCTION ACTIVATION

Last updated: 2026-08-24

## Purpose

This runbook governs the first Pathway Check proof and the durable evidence chain that feeds the A$49 Planning Controls Pack and A$749 submission SEE.

It must be read with:

- `docs/project-memory/item74h-pathway-check.md`;
- the Item 74 launch and whole-LGA smoke runbooks;
- the spatial provenance runbooks;
- the submission SEE acceptance runbooks; and
- the submission SEE credit runbook.

## Authoritative predecessor state

The current stacked candidate is based on Item 74F commit `0523e2b9cdc7fc901f4be437661b9de18e517d89`.

Accepted evidence at that boundary includes:

- `npm run smoke:launch`: 18 green, 0 amber, 0 red;
- `npm run smoke:whole-lga`: 60 green, 0 red;
- hosted Byron and Kempsey source evidence;
- live official NSW spatial round trips;
- deterministic submission SEE candidate, sections and DOCX/PDF rendering;
- exact A$749, A$49 credit and A$700 payable calculations;
- persistent Preview credit lifecycle and replay acceptance;
- Preview cleanup to zero synthetic credit rows; and
- final disabled acceptance state.

Still not executed:

- durable address-level spatial persistence;
- a real authenticated address flight;
- a deterministic pathway graph;
- claim-level numeric-control provenance;
- a real customer submission SEE;
- final operator DOCX review;
- Production payment or checkout;
- Production schema or data mutation; and
- merge or Production release.

## First protected slice

The intended product case is Byron RU2 and a detached shed or outbuilding, but this pairing is provisional until current repository and official-source evidence confirms it.

The acceptance fixture must be synthetic first. A customer-like address flight is a separate controlled action and must not use a real customer's data.

## Acceptance order

The delivery must proceed in this order:

1. Define a pure, credential-free pathway acceptance contract.
2. Define typed controls, gates, outcomes, trust levels and source requirements.
3. Add deterministic green and red fixtures without an address or database.
4. Design the additive persistence change for durable site and pathway evidence.
5. Obtain explicit approval before applying that schema to an isolated Preview branch.
6. Run the existing launch and whole-LGA checks before the new pathway acceptance.
7. Run synthetic pathway acceptance in protected Preview.
8. Reconcile all temporary rows and prove cleanup.
9. Obtain separate approval before one controlled customer-like address flight.
10. Render the same accepted evidence as pathway, A$49 pack and A$749 SEE inputs.
11. Keep Production checkout disabled and leave merge as a separate review decision.

## Required pathway outcomes

The deterministic engine must support:

- `STOP`: current accepted evidence establishes a disqualifying condition for the stated objective;
- `PROCEED`: current accepted evidence satisfies the gate;
- `MERIT_ASSESSMENT`: the proposal is not resolved through a simple deterministic compliance path and requires written assessment;
- `MORE_EVIDENCE_REQUIRED`: a required fact is missing, stale, conflicting or unresolved.

Unknown must never be treated as false. A missing constraint response produces `MORE_EVIDENCE_REQUIRED`, not `PROCEED`.

## Required red paths

Acceptance must block at least:

- unsupported or unconfirmed LGA and zone;
- missing confirmed site ID or address fingerprint;
- fixture, manual or non-authoritative spatial evidence;
- zone conflict;
- missing proposal or ancillary-use classification;
- missing or overlapping land-area band;
- untyped numeric value or unit;
- source without an official URL or locator;
- stale, superseded or unverifiable control;
- unknown branch predicate;
- result generated from a different graph or instrument version;
- paid output with only general-guidance evidence;
- section citation without claim-level control evidence;
- reloaded site that loses provenance;
- Production commercial mode; and
- any attempt to weaken a blocker to satisfy the fixture.

## Evidence record

A protected acceptance summary may report only non-sensitive evidence:

- commit and branch;
- Preview deployment identifier;
- acceptance contract version;
- synthetic fixture identifiers;
- LGA, zone and proposal category;
- instrument slugs and public official URLs;
- graph and control version identifiers;
- counts of gates, controls and outcomes;
- green, amber and red counts;
- row counts before and after synthetic cleanup; and
- checkout flags as enabled or disabled.

Never report:

- `DATABASE_URL` or any fragment of it;
- credential, token or secret values;
- real customer addresses;
- coordinates or parcel identifiers for a private customer fixture;
- uploaded customer content;
- Stripe customer or payment details; or
- raw provider payloads.

## Schema approval boundary

Documentation, pure TypeScript acceptance and credential-free CI fixtures do not require a database approval.

Applying an additive migration to an isolated Preview branch requires explicit approval and must include:

- target branch and database identity;
- additive migration review;
- no destructive SQL;
- rollback or branch-disposal path;
- synthetic fixture and cleanup design;
- checkout-disabled environment guard; and
- post-run row reconciliation.

Production schema application remains prohibited without a separate explicit Production approval.

## Completion boundary

Item 74H is not accepted merely because a polished brief renders.

The first slice is accepted only when one current, source-backed Byron pathway:

- persists exact site and spatial provenance;
- evaluates deterministic gates;
- binds every material number and branch to current evidence;
- survives reload;
- detects stale and unresolved evidence;
- renders a free pathway view;
- supplies the A$49 pack;
- supplies the A$749 SEE candidate;
- passes protected Preview acceptance; and
- leaves Production checkout disabled.
