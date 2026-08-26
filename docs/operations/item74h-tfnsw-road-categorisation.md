# Item 74H Transport for NSW road categorisation

Status: POSITIVE-MATCH CONTRACT IMPLEMENTED / CONTROLLED SITE NOT EXECUTED

Last updated: 2026-08-26

## Purpose

Resolve the Byron rural road-frontage branch from a current authoritative source without treating a user's "local road" assumption as evidence.

This contract complements the generic NSW Transport Theme road-reference query. The generic layer exposes undocumented numeric reference codes, so those codes remain `MORE_EVIDENCE_REQUIRED`.

## Authoritative source

Transport for NSW publishes the NSW Road Network Categorisation dataset through Data.NSW:

- dataset: https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation
- publisher: Transport for NSW
- machine-readable resource: CSV/DataStore
- resource ID: `2bff2775-4949-4ae1-89c6-0159662fc0c2`
- fields used: `road_name` and `admin_class`
- supported categories: `State` and `Regional`
- source data last updated on 17 July 2026 when this contract was authored

The query is read-only and uses the protected road name only in the request body. The result object excludes the road name, raw rows, road number and network identifiers.

## Decision rule

- An exact road-name match whose every matching record is `State` or `Regional` is positive authoritative evidence for `CLASSIFIED_ROAD`.
- No matching row is not proof of an `OTHER_ROAD`; it remains `DATASET_ABSENCE_ONLY` and `MORE_EVIDENCE_REQUIRED`.
- A `Local`, unknown, malformed or conflicting class remains `MORE_EVIDENCE_REQUIRED`.
- The existing Byron setback contract applies 55 m only after the positive State/Regional match.
- The 15 m other-road branch still requires explicit authoritative evidence and is never inferred from absence.

## Current controlled-site boundary

The user has attested that the frontage is a local road and that the proposed shed is approximately 100 m from it. Those facts remain user attestations.

The 100 m value exceeds both possible DCP road-frontage minima, so it is useful preliminary guidance. It is not a surveyed measurement and does not complete the paid evidence manifest.

A later protected controlled-address flight may extract the route component in memory and call this resolver. It must not print or persist the road name and must restore the disabled environment state afterward.

## Commercial boundary

This contract does not activate checkout and does not make either paid product eligible. The A$49 Planning Controls Pack still requires the complete evidence-verified site manifest. The A$749 submission SEE additionally requires operator approval and the exact accepted upload set.
