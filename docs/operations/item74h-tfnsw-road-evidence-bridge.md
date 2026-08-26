# Item 74H TfNSW frontage-to-evidence bridge

Status: PROTECTED BRIDGE IMPLEMENTED / SYNTHETIC ACCEPTANCE ONLY / REAL SITE UNRESOLVED

Last updated: 2026-08-26

## Purpose

Connect the coordinate-scoped Transport for NSW road categorisation contract to the existing Item 74H `ROAD_CLASSIFICATION` fact without allowing an address point, parcel centroid, nearby road, road-name match, or user assumption to masquerade as the relevant road frontage.

## Required frontage binding

The bridge accepts only an `EVIDENCE_VERIFIED` frontage binding produced from either:

- a surveyed frontage point; or
- an authoritative cadastral road-boundary intersection.

The binding carries an opaque SHA-256 evidence digest, verification time and stale time. The protected point exists only in the in-memory query plan. Extra fields, including raw addresses or site identifiers, are rejected.

## Execution contract

The bridge:

- creates exactly one count-only query for the verified State layer and one for the verified Regional layer;
- binds those private requests, verified layer IDs and frontage evidence digest into a plan digest;
- requires each response to match the exact layer ID and class in that plan;
- accepts only current frontage and source evidence;
- emits an `AUTHORITATIVE_SPATIAL` / `EVIDENCE_VERIFIED` `ROAD_CLASSIFICATION` observation after a positive intersection;
- returns no coordinate, request body, raw response, geometry, road name, layer name, object ID or network identifier;
- retains only a one-way redacted source reference in the evidence graph.

A zero result creates no observation and remains `MORE_EVIDENCE_REQUIRED`. It never proves `OTHER_ROAD`.

## Commercial boundary

This bridge satisfies only the road-classification fact when its positive-evidence conditions are met. It does not satisfy the separate survey, proposed layout, footprint, height, road setback, side/rear setback, upload-set or operator-review requirements.

Accordingly, running the bridge alone cannot unlock the A$49 Planning Controls Pack or the A$749 submission SEE.

## Current controlled-site status

No real address or coordinate is used by the contract workflow. The user's local-road and approximately 100 m setback statements remain `USER_ATTESTED`.

The current controlled site has no accepted surveyed frontage point or authoritative cadastral road-boundary intersection. It therefore remains `MORE_EVIDENCE_REQUIRED`.

## Safety

- Preview contract only.
- Synthetic coordinates and responses only in CI.
- Production checkout remains disabled.
- No Production schema, data, environment, payment or checkout mutation.
- PR #347 remains draft and unmerged.
