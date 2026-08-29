# Item 74E submission-grade SEE acceptance

Status: **ACCEPTANCE CONTRACT IMPLEMENTED / PRODUCT GENERATION NOT EXECUTED**

## Purpose

The existing `/api/artefacts/generate-see` route creates an MVP pre-SEE
planning memo. Its own payload says that it is not a final legal Statement of
Environmental Effects. That artefact must never be represented as the A$749
submission product.

Item 74E establishes the fail-closed acceptance boundary for the actual
submission-grade Statement of Environmental Effects before generation, export,
payment, or Production activation is attempted.

## Ready boundary

A candidate is ready only when every requirement is green:

- document type is `statement_of_environmental_effects`;
- product code is `submission_see`;
- price is exactly A$749;
- commercial mode is Preview or test, never Production;
- council is Byron or Kempsey;
- confirmed site and zone match the current project;
- spatial provenance is authoritative, verified, current, feature-identified,
  limitation-free, and backed by an official HTTPS service;
- the Detailed Planning Pack and Quick Site Check provenance chain matches the
  project, council, and zone;
- the source Detailed Planning Pack is commercially ready with no unresolved
  topics;
- the proposal summary is substantive;
- LEP, DCP, spatial, and uploaded evidence is attributable;
- all eight required SEE sections are substantive and cite registered sources;
- uploaded evidence is hash-backed, indexed, reviewed, current for the site,
  and used by identified sections;
- polished DOCX and PDF outputs both exist with correct MIME type, extension,
  content hash, byte length, and generation timestamp;
- the artefact does not declare itself draft, pre-SEE, non-final, or non-legal;
  and
- an operator has approved the versioned submission checklist with no
  unresolved issues.

Any missing, stale, conflicting, invented, unreadable, uncited, or unreviewed
evidence blocks the candidate. There is no amber-to-green fallback.

## Required sections

1. Executive summary
2. Site and surrounds
3. Proposed development
4. Statutory planning framework
5. Planning controls assessment
6. Environmental impacts
7. Mitigation measures
8. Conclusion

This is a minimum product contract, not a claim that those headings alone
satisfy every proposal or council requirement. Specialist and proposal-specific
material must be added as evidence requires.

## Deterministic CI

The Submission SEE Acceptance workflow checks:

- complete Byron SP3 and Kempsey E2 evidence chains;
- current MVP pre-SEE memo remains blocked;
- unverified spatial provenance;
- mismatched project and DPP provenance;
- absent DCP evidence;
- missing sections and invented citations;
- unreadable uploads;
- missing DOCX or PDF output;
- wrong price;
- attempted Production execution;
- explicit non-final limitations; and
- incomplete operator review.

Fixtures use non-address labels and synthetic hashes. They prove the contract,
not real document quality or hosted product execution.

## Current boundary

This slice does not yet generate the submission SEE, render DOCX/PDF files,
perform an operator review, execute Stripe acceptance, persist new schema
fields, or enable checkout. The next implementation step is to build a
submission SEE candidate from the current commercial-ready DPP/QSC chain and
evidence register, then keep it blocked until real rendered outputs and operator
approval satisfy this gate.

## Safety

- `PLANNING_PACK_CHECKOUT_ENABLED` remains off/false in Production.
- Do not merge or activate Production checkout from this work.
- Do not write to the Production database.
- Do not weaken the gate to classify the current pre-SEE memo as the A$749
  product.
- Do not print addresses, coordinates, parcel identifiers, uploaded content,
  credentials, or raw provider payloads in CI.
- Real submission acceptance requires protected Preview evidence and human
  operator sign-off.
