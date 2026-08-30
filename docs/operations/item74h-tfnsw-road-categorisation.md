# Item 74H Transport for NSW road categorisation

Status: COORDINATE-SCOPED CONTRACT IMPLEMENTED / CONTROLLED FRONTAGE NOT EXECUTED

Last updated: 2026-08-26

## Purpose

Resolve the Byron rural road-frontage branch from current authoritative spatial evidence without treating a user's "local road" assumption, a statewide road-name match, or a nearby road as evidence for the relevant frontage.

The previous road-name-only contract was safety-held before controlled-site use because road names are not unique across NSW. It was never connected to runtime, the Byron setback decision, or either paid product.

## Authoritative source

Transport for NSW publishes the NSW Road Network Categorisation dataset through Data.NSW:

- dataset: https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation
- ArcGIS item: https://www.arcgis.com/home/item.html?id=a72722ea615445f1aa10deb1ffe02e9b
- fixed item ID: `a72722ea615445f1aa10deb1ffe02e9b`
- publisher: Transport for NSW
- supported categories: `State Roads` and `Regional Roads`

The resolver does not hardcode a FeatureServer endpoint. Each execution reads the fixed official ArcGIS item metadata, accepts only a trusted HTTPS ArcGIS or NSW Government FeatureServer URL, and verifies exactly one State layer and one Regional layer before querying.

The authoritative item modification time is carried into the evidence record and must not be later than the protected check time. Source freshness must be reviewed when the controlled flight is executed rather than being inferred from a hardcoded date.

## Protected spatial query

The caller must supply a protected frontage point that is already bound to the relevant property frontage by authoritative evidence.

A parcel centroid, generic geocoder point, road-name search, proximity-only search, or user estimate is not a frontage point and must not be used.

For each verified layer, the resolver:

- sends the coordinates only in a POST body;
- uses an exact point intersection;
- requests `returnCountOnly=true`;
- requests `returnGeometry=false`;
- requests no attributes, road names, object IDs, or network identifiers;
- disables caching;
- never returns the coordinates, raw service response, geometry, layer name, road name, or network identifier.

The request body is private operational material and must never be logged, persisted, attached to CI output, or copied into a PR comment.

## Decision rule

- A positive intersection with the verified State or Regional layer confirms `CLASSIFIED_ROAD`.
- A zero count does not prove `OTHER_ROAD`; it remains `DATASET_ABSENCE_ONLY` and `MORE_EVIDENCE_REQUIRED`.
- Missing layers, duplicate layers, unexpected hosts, malformed counts, service errors, invalid dates, or incomplete responses fail closed.
- The existing Byron setback contract applies 55 m only after a positive classified-road intersection.
- The 15 m other-road branch still requires explicit authoritative evidence and is never inferred from absence.

## Current controlled-site boundary

The user has attested that the frontage is a local road and that the proposed shed is approximately 100 m from it. Those facts remain `USER_ATTESTED`.

The 100 m estimate is useful preliminary guidance, but it is not a surveyed measurement. The currently available address coordinate is not automatically treated as the frontage point. Until an authoritative frontage point or other explicit road-class evidence is available, the real site remains `MORE_EVIDENCE_REQUIRED`.

No controlled address or coordinate was used to author or test this contract.

## Acceptance and operating boundary

The focused GitHub workflow:

- executes only synthetic coordinate and response fixtures;
- explicitly fixes both checkout flags to `false`;
- checks positive State and Regional intersections;
- checks that absence remains unresolved;
- checks trusted service and exact layer discovery;
- checks that result objects contain no coordinates, geometry, road names, raw responses, or identifiers.

A later protected Preview flight may execute the official metadata and count-only requests once an authoritative frontage point is available. It must not print request bodies or private inputs, and it must leave Production untouched.

## Commercial boundary

This contract does not activate checkout and does not make either paid product eligible. The A$49 Planning Controls Pack still requires the complete evidence-verified site manifest. The A$749 submission SEE additionally requires operator approval and the exact accepted upload set.

Production checkout remains disabled. No Production schema, data, environment, payment, or checkout mutation is authorised by this contract.
