# Item 74H private evidence operator-review persistence

Status: **ACCEPTED IN PREVIEW / DISABLED IN NORMAL BUILDS**

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

## Accepted hosted synthetic flight

- Flight commit: `7e51ff6659f3ace48ef9467192022caad72078cf`.
- Protected Preview deployment: `dpl_FHwt679d1xzHtPhpwD9LdNLPXfNg`.
- GitHub result: 22 of 22 workflows passed.
- Vercel result: `READY`.
- Gate result: `PASS` with synthetic data only.
- One pending record was created and replayed without duplication.
- One verified terminal record was created and replayed without duplication.
- A conflicting terminal decision was refused.
- Evidence-package promotion was persisted once and replayed without duplication.
- A$49 and A$749 eligibility remained false.
- Production checkout remained false.
- Cleanup reconciled both review and promotion tables to zero rows.
- The aggregate record contained no secret, evidence reference, content hash, reviewer reference or page reference.

## Restored disabled state

- The temporary branch-only activation variable was deleted after the flight.
- Clean-state commit: `0754444844f7763b51d9df57ef41a6beb4f1e897`.
- Clean-state deployment: `dpl_9QqoAVWjNwFXss2j9DwrWtenPoMx`.
- GitHub result: 22 of 22 workflows passed.
- Vercel result: `READY`.
- Gate result: `SKIPPED_FEATURE_DISABLED`.
- Production checkout remained false.

## Remaining boundary

This acceptance proves the durable review transition for one synthetic document. A real Byron pathway remains `MORE_EVIDENCE_REQUIRED` until all required roles are privately supplied, scanned, reviewed, promoted and bound to the same confirmed site and proposal measurements.

No real document was used or certified by this acceptance.