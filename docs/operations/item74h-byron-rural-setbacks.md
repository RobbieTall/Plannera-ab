# Item 74H Byron rural setback contract

## Purpose

This contract turns the current Byron rural road-frontage setback rule into deterministic, versioned evidence without pretending that every site has a confirmed road category or measured design setback.

It applies only to the Item 74H Byron rural shed/outbuilding proof. It does not activate either paid product.

## Authoritative controls

Byron Shire DCP 2014 Chapter D2 was adopted on 9 February 2023 and became effective on 28 February 2023.

For dwellings and other buildings in rural zones, Chapter D2 prescribes:

- 55 metres from the boundary of a classified road.
- 15 metres from the boundary of other roads.
- Side and rear setbacks are determined on merit against the objectives and performance criteria and must comply with the Building Code of Australia.

The current Part A amendment register was checked on 25 August 2026. It records the last Chapter D2 amendment as effective 28 February 2023. The later 6 June 2025 amendment applies to Chapter C2 flood controls, not Chapter D2.

Sources:

- [Current Byron DCP 2014 index](https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014)
- [Chapter D2 rural zones](https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d2-residential-accommodation-and-ancillary-development-in-rural-zones-adopted-9-february-2023-effective-28-february-2023-amendments-and-ct-2022-combined-adopted-version.pdf)
- [Part A amendment register](https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-part-a-preliminary-adopted-22-may-2025-effective-6-june-2025.pdf)
- [Transport for NSW Road Network Categorisation](https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation)

## Evidence rules

A classified road can be confirmed by a current positive spatial match in the Transport for NSW State and Regional road dataset.

An other road cannot be inferred only because a road is absent from that dataset. This contract requires explicit current Byron Council evidence for the other-road classification.

Evidence must have:

- an HTTPS authoritative source;
- a source publication or version date;
- a check timestamp no more than 31 days old;
- a valid evidence basis matching the asserted category.

Missing, stale, failed, or logically inconsistent evidence produces `MORE_EVIDENCE_REQUIRED`.

## Decisions

- `PROCEED`: confirmed category, measured proposal setback, and the applicable 55 m or 15 m minimum is met.
- `MERIT_ASSESSED`: confirmed category and measurement, but the proposed setback is below the prescriptive minimum.
- `MORE_EVIDENCE_REQUIRED`: road category or measured setback is not conclusively established.

Every result keeps side and rear setbacks at `MERIT_ASSESSED`.

## Commercial boundary

This contract always returns:

- `siteEvidenceComplete: false`
- `paidEligibilityUnlocked: false`

It is one evidence component only. The A$49 Planning Controls Pack and A$749 submission SEE remain blocked until the complete site-evidence manifest, including mapped constraints and design measurements, is satisfied.
