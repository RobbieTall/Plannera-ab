# Representative Byron/Kempsey address-and-proposal golden journeys

Status: **DETERMINISTIC TEST EXPANSION / NOT LIVE ACCEPTANCE**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #427.

## Purpose

The whole-LGA source matrix proves authoritative source/projection coverage across 22 Byron zones and 23 Kempsey zones, while the existing commercial golden gate proves persisted end-to-end service integration for Byron SP3 and Kempsey E2.

This slice adds two representative address-and-proposal truth cases already established elsewhere in the repository:

- Byron R2 — `33 Lorikeet Lane, Mullumbimby NSW 2482`, reviewed Item 74H case with parcel-interior R2 and an approved 24 sqm storage shed ancillary to the residential case.
- Kempsey SP2 — `32 Smith St, Kempsey NSW 2440`, a known SP2 Infrastructure truth case that must never be treated as the E2 Commercial Centre QA fixture.

## Test contract

The representative cases intentionally do **not** inject unsupported evidence.

They must prove:

- caller-supplied forged site/proposal fields cannot replace the server-authoritative saved scope;
- Byron R2 preserves the reviewed address/zone, reaches an unresolved DPP with all five DCP topics `Unavailable`, blocks SEE generation for lack of applicable cited DCP evidence, and routes to expert review;
- Kempsey SP2 preserves 32 Smith St as Infrastructure with empty statutory land-use buckets in this fixture, is not labelled `Cited`, and is stopped before paid-pack generation by the existing quality-valid-QSC gate;
- Kempsey 32 Smith St never inherits E2/Commercial premises evidence.

For Byron R2, the Quick Site Check fixture may use the repository-established Zone R2 statutory term `Dwelling houses` as permitted with consent. The storage shed proposal remains framed as ancillary to the reviewed residential case; this deterministic test does not independently re-determine that Council approval.

For Kempsey SP2, no permitted-with-consent term is asserted by this slice because the repository evidence inspected for this task establishes the zone identity but not a proposal-specific statutory use term.

## Boundary

This is not:

- a live address resolver test;
- every-zone proposal acceptance;
- live DCP retrieval;
- overlay/hazard acceptance;
- payment acceptance;
- rendered DOCX/PDF inspection;
- Production data mutation; or
- operator sign-off.

It expands deterministic regression coverage only. Existing SP3/E2 quality-chain tests remain unchanged.
