# Item 74H private evidence operator-review persistence

Status: **IMPLEMENTED AS PREVIEW-ONLY CONTRACT / HOSTED SYNTHETIC FLIGHT PENDING**

Last updated: 2026-08-28 (Australia/Sydney)

## Purpose

The malware scanner can establish that one private object is clean. It cannot establish that the object is the correct, current or site-bound planning evidence.

This layer adds the missing authenticated operator-review queue and durable server record. It remains separate from planning approval and paid eligibility.

## Review sequence

- A trusted Preview operator creates one `PENDING` queue record.
- The exact evidence reference, content hash and document role remain server-side.
- A pending record may become exactly one terminal `EVIDENCE_VERIFIED` or `REJECTED` record.
- A verified review requires one to twenty unique page or sheet references.
- A rejection uses a structured reason code and stores no free-text note.
- Terminal decisions are immutable. A changed decision requires a newly ingested evidence object and a new review chain.
- Matching idempotent replay reuses the same record. Reusing an idempotency key for different intent fails closed.

## Durable Preview records

The additive Preview migration creates:

- `PathwayPrivateEvidenceOperatorReview`, an append-only hash-linked review sequence; and
- `PathwayPrivateEvidencePromotion`, a separate idempotent marker that one reviewed document may enter an evidence package.

Database constraints restrict the environment to Preview, enforce hash and state shapes, prevent duplicate revisions and idempotency keys, and require promotion to reference an accepted review record.

Neither table contains a paid-unlock field.

## Privacy boundary

The public result contains only status, role, revision, reference count and structured rejection state. It never returns the evidence reference, content hash, operator reference, page tokens, object location, filename, address, coordinate, parcel identifier or document content.

## Commercial boundary

`EVIDENCE_VERIFIED` and `READY_FOR_EVIDENCE_PACKAGE` do not mean:

- a complete evidence-confirmed Byron site package;
- a deterministic `PROCEED` or `MERIT` decision;
- A$49 Planning Controls Pack eligibility;
- A$749 submission SEE eligibility;
- final SEE operator approval; or
- Production activation.

Every result keeps both paid products and Production checkout false.

## Hosted acceptance

The disabled-by-default hosted runner will use synthetic records only. It must prove pending creation and replay, one terminal verified transition and replay, terminal immutability, idempotent evidence-package promotion, and cleanup to zero database residue.

No real document is permitted in this acceptance.