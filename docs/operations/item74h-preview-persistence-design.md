# Item 74H Preview persistence design

Status: ADDITIVE DESIGN ONLY / NOT APPLIED

Last updated: 2026-08-24

## Purpose

Define the durable address-to-artefact evidence records required for one accepted Pathway Check to survive reload and feed the free pathway view, the A$49 Planning Controls Pack and the A$749 submission SEE.

This document is not an executable migration and authorizes no database change.

## Current evidence boundary

The credential-free Item 74H contract is green at commit `08dcc98765211147f8e74e5c0a6f768c23a9dc36`.

- Pathway Check Acceptance run `32709833707`: passed.
- Commercial Funnel Golden Gate run `32709833673`: passed.
- Vercel did not begin the build because linked Preview resource provisioning failed.
- Neon project `red-term-77984898` is at its 10-branch limit.
- No Item 74H database branch, schema or row exists.

The archived superseded branch proposed for approval-gated cleanup is `preview/agent/item74-launch-gate` (`br-round-salad-a74ayw79`).

## Design principles

The persistence layer must be:

- additive;
- append-only for accepted evidence;
- exact-site and exact-proposal scoped;
- versioned by graph and instrument evidence;
- deterministic under replay;
- fail-closed on reload;
- privacy-minimizing;
- synthetic-fixture cleanable;
- reusable by all three output tiers; and
- incapable of enabling Production checkout.

Unknown, missing, stale, conflicting or superseded evidence must remain unresolved after persistence. A reload must never promote trust.

## Proposed records

Names are provisional until the existing Prisma schema is updated in one reviewed patch.

### SiteSpatialProvenance

One current accepted spatial record for a confirmed SiteContext, with historical superseded rows retained.

Required fields:

- immutable ID;
- SiteContext relation;
- confirmed site identifier;
- SHA-256 address fingerprint;
- normalized LGA and zone;
- authority and official HTTPS service URL;
- service layer identifier;
- official feature identifier;
- resolution timestamp;
- evidence content hash;
- provenance status;
- structured limitations;
- source-check timestamp;
- superseded timestamp;
- created and updated timestamps.

Raw credentials and provider payloads are forbidden. A private address does not belong in this record; it remains in the existing protected project/site context. Coordinates must not be duplicated unless the spatial revalidation contract proves they are required.

### PathwayDefinition

Immutable published decision graph metadata.

Required fields:

- stable graph ID;
- normalized LGA, zone and proposal type;
- semantic version;
- SHA-256 graph content hash;
- authoring and review status;
- published timestamp;
- retired timestamp;
- created timestamp.

The unique identity is graph ID plus version. Publishing a changed graph creates a new version rather than updating accepted history.

### PathwayAssessment

The exact persisted result for one site, proposal, graph and evidence set.

Required fields:

- immutable assessment ID;
- project and SiteContext relations;
- confirmed site identifier;
- SHA-256 address fingerprint;
- normalized proposal fingerprint;
- PathwayDefinition relation;
- evidence-set digest;
- trust level;
- overall outcome;
- acceptance status;
- generated and persisted timestamps;
- stale and superseded timestamps;
- deterministic idempotency key;
- optional synthetic fixture scope key;
- cleanup deadline for synthetic rows; and
- created timestamp.

The idempotency key must bind the project, confirmed site, address fingerprint, proposal fingerprint, graph version and evidence-set digest. Same-scope replay returns the same assessment. Changed site, proposal, graph or evidence creates a new assessment and supersedes the prior current result.

### PathwayEvidenceSnapshot

Immutable source evidence used by an assessment.

Required fields:

- assessment relation;
- source type;
- source registry identifier;
- title;
- official HTTPS URL;
- instrument and edition identifier;
- clause or source locator;
- source content hash;
- retrieval timestamp;
- effective-from and effective-to timestamps;
- verification status and timestamp;
- superseded status;
- fixture marker; and
- created timestamp.

LEP and DCP snapshots require a clause locator. Spatial snapshots require the SiteSpatialProvenance relation. Upload snapshots require an accepted current-site upload hash and section applicability.

### PathwayControlSnapshot

Typed control actually evaluated by the pathway.

Required fields:

- assessment relation;
- stable control key;
- control kind;
- comparator;
- numeric value or boolean value, with exactly one populated;
- unit;
- source snapshot relation;
- normalized LGA;
- applicable zone;
- proposal type;
- ancillary-use category;
- minimum lot area inclusive;
- maximum lot area exclusive;
- verification status; and
- created timestamp.

Overlapping accepted bands for the same control, zone, proposal and ancillary-use category must be rejected before persistence.

### PathwayGateSnapshot

The deterministic gate result.

Required fields:

- assessment relation;
- stable gate key;
- zero-based order;
- title and question;
- predicate state;
- outcome;
- stop-condition flag;
- evidence-backed reasoning;
- created timestamp.

Gate order is unique within an assessment. Unknown or conflicting predicates may persist only with `MORE_EVIDENCE_REQUIRED`. `STOP` and the stop-condition flag must agree.

Gate-to-source and gate-to-control join records preserve claim-level evidence. A narrative-only section citation is insufficient.

### PathwayArtefactBinding

Connects one accepted assessment to its renderings.

Required fields:

- assessment relation;
- artefact relation;
- binding type: `PATHWAY_PREVIEW`, `PLANNING_CONTROLS_PACK` or `SUBMISSION_SEE`;
- artefact content hash;
- bound timestamp; and
- created timestamp.

The A$49 and A$749 bindings require at least `EVIDENCE_VERIFIED` trust, no fixture evidence, no stale source and no unresolved gate. The A$749 binding additionally remains subject to the existing submission SEE operator-review and DOCX/PDF gate.

## Proposed invariants

The reviewed schema and service must enforce:

- unique graph ID and version;
- unique assessment idempotency key;
- unique current assessment for an exact site, proposal and graph version;
- unique source identifier within an assessment;
- unique control key within an assessment;
- unique gate key and gate order within an assessment;
- unique artefact binding type within an assessment;
- no deletion of accepted customer evidence through ordinary service methods;
- synthetic rows identifiable by exact scope and cleanup deadline;
- no fixture source in A$49 or A$749 bindings;
- no Production commercial mode in Item 74H Preview acceptance; and
- transactionally consistent assessment, snapshots, gates and bindings.

Where a database constraint cannot express a cross-record rule, a serializable transaction and deterministic acceptance assessor must enforce it before commit.

## Reload contract

A reloaded pathway is accepted only when:

1. the Project and SiteContext still match the stored confirmed site;
2. the address fingerprint matches;
3. the spatial record remains current and authoritative;
4. the graph ID, version and hash match;
5. every source snapshot remains attributable;
6. no source or control is stale or superseded;
7. the recomputed evidence-set digest matches;
8. the proposal fingerprint matches;
9. gate order and references are complete;
10. the recomputed acceptance result equals the persisted result; and
11. the requested output trust is not higher than the persisted evidence allows.

Any mismatch returns blocked and records no higher-trust artefact.

## Synthetic Preview lifecycle

After explicit schema-application approval, the protected lifecycle must:

1. verify Vercel environment is Preview;
2. verify the exact Item 74H Git ref;
3. verify the expected isolated Neon branch identity;
4. verify all checkout flags are false;
5. create only exact random `item74h-` fixture IDs and `.invalid` identities;
6. persist one synthetic site, spatial provenance, graph, assessment, sources, controls and gates;
7. reload the assessment through the normal repository path;
8. prove deterministic digest and outcome equality;
9. replay the same request and prove one persistent assessment;
10. change site, proposal, graph and evidence independently and prove scope separation;
11. prove fixture evidence cannot bind to A$49 or A$749 artefacts;
12. exercise stop, proceed, merit and more-evidence outcomes;
13. remove every synthetic row in reverse dependency order;
14. report exact before and after row counts; and
15. reconcile zero `item74h-` rows after cleanup and final disabled redeployment.

No real customer address, payment or Production resource participates.

## Controlled address flight

A customer-like address flight is separate from the synthetic lifecycle and requires explicit approval.

Before that approval, evidence must show:

- the synthetic lifecycle passed;
- cleanup reconciled to zero;
- the address is non-customer and approved for controlled testing;
- official source URLs and clauses are current;
- the Byron zone and shed/outbuilding proposal pairing is evidence-confirmed;
- the address is not printed in logs, summaries or repository data;
- output remains Preview-only; and
- Production checkout remains disabled.

## Migration safety review

The future migration proposal must contain only additive operations:

- create enums if not represented as strings;
- create new tables;
- create indexes and uniqueness constraints;
- create foreign keys with reviewed delete behavior; and
- add no automatic data backfill.

Forbidden without a new decision:

- dropping or renaming existing tables or columns;
- rewriting existing Project, SiteContext, Artefact, Purchase, Entitlement or SubmissionSeeCredit rows;
- changing Production schema;
- copying Production data;
- enabling checkout;
- storing credentials or raw provider payloads; and
- treating legacy transient provenance as accepted durable evidence.

## Approval boundaries

Separate explicit approval is required for:

- deleting any Neon branch to restore Preview capacity;
- applying the additive migration to an isolated Preview branch;
- running the synthetic mutation lifecycle;
- running one controlled address flight;
- any Stripe or payment activity;
- merge; and
- any Production schema, data, environment or checkout change.
