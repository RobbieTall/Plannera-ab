# Item 74H private evidence scan and operator-review promotion

Status: **IMPLEMENTED AS CONTRACT / EXTERNAL ADAPTERS NOT CONNECTED**

Last updated: 2026-08-27 (Australia/Sydney)

## Purpose

A private upload is not accepted planning evidence. This contract controls the
separate transition from quarantine to a candidate for the real-site evidence
package.

The transition is server-authoritative. A browser or API caller supplies only
an opaque evidence reference. It cannot supply a scan result, reviewer result,
content hash, page reference or storage fact.

## Authoritative records

The promotion service loads three records through trusted dependencies:

- the private quarantined evidence record;
- the security scanner record; and
- the operator-review record.

All three must bind to the same opaque evidence reference and full SHA-256
content hash. A mismatch remains quarantined.

The evidence record must confirm private storage and `QUARANTINED` state.

The scanner record must:

- identify itself as a server security-scan record;
- report `CLEAN`;
- identify the scanner engine, engine version and definition version;
- include a valid scan timestamp no later than evaluation.

Pending or errored scanning remains quarantined. An infected result is rejected
and reports that object deletion is required.

The operator-review record must:

- identify itself as a server operator-review record;
- report `EVIDENCE_VERIFIED`;
- use an opaque reviewer reference;
- occur after the accepted scan and no later than evaluation;
- contain one to twenty unique page or sheet references.

Rejected review remains rejected. Missing or malformed review remains
quarantined.

## Promotion boundary

`promotePathwayPrivateEvidence` first rejects:

- non-Preview execution;
- a disabled feature;
- missing operator authentication or authorization;
- a malformed evidence reference;
- unsupported caller fields.

Only then does it load authoritative records. A clean matching reviewed record
is written as `READY_FOR_EVIDENCE_PACKAGE` through an injected persistence
dependency. If that write fails, the result returns to `QUARANTINED` and no
commercial eligibility is reported.

The privacy-minimal result never includes:

- the evidence reference or content hash;
- scanner or reviewer identifiers;
- page or sheet tokens;
- an address, filename, URL, coordinate, parcel or geometry;
- extracted or uploaded content.

## Commercial meaning

`READY_FOR_EVIDENCE_PACKAGE` is not:

- an evidence-confirmed site package;
- a planning decision;
- A$49 Planning Controls Pack eligibility;
- A$749 submission SEE eligibility;
- operator approval of the final SEE;
- Production activation.

It means only that one private document is eligible to enter the existing
real-site evidence package. The complete package must still satisfy document
roles, authority, currentness, measurement provenance, spatial evidence,
deterministic controls and exact-scope commercial binding.

Every result keeps both paid products and Production checkout false.

## Remaining external implementation

The following remain deliberately unconnected:

1. Preview-only private Blob storage.
2. The real private quarantine adapter.
3. A real malware-scanning service and immutable scan record.
4. An authenticated operator-review queue.
5. Durable ready/rejected state persistence.
6. A synthetic hosted upload/read/scan-state/review-state/delete flight.
7. Binding of clean reviewed records into the real-site evidence digest.

No scan may be labelled `CLEAN` from parser success, MIME inspection, an LLM
response or an operator assertion. It must originate from the accepted scanner
integration.
