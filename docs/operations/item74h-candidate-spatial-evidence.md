# Item 74H candidate spatial evidence

## Purpose

This acceptance protects the second Byron shed candidate from a false single-zone conclusion before any document is bound to the free Pathway Check, A$49 Planning Controls Pack or A$749 SEE.

## Exact candidate

- Byron Council DA: `10.2026.223.1`
- Address: `33 Lorikeet Lane, Mullumbimby`
- Deposited-plan lot: `Lot 138 DP1265934`
- Current NSW cadastral identity: `cadid 180752773`, `planoid 3829161`
- Plan lot area: `2331.671 m2`

## Authoritative result

The full current parcel polygon from NSW Spatial Services intersects two current NSW Department of Planning zoning polygons:

- `C2 Environmental Conservation`
- `R2 Low Density Residential`

Both records identify `Byron Local Environmental Plan 2014`, EPI type `LEP`, PCO reference `2014-297`.

A centroid lookup returns only `R2`. That is not adequate evidence for a split-zoned parcel and must never be used to infer the proposed shed's zone.

## Product decision

The parcel split is confirmed. The proposal zone is not confirmed.

The customer-facing outcome remains `MORE_EVIDENCE_REQUIRED` until a georeferenced survey or site plan locates the proposed shed against the authoritative zoning polygons. This does not block purchase or preparation of a clearly labelled working SEE. It blocks only unsupported final/submission-grade assertions and explains what evidence would upgrade the work.

## Acceptance boundary

`npm run accept:item74h-candidate-da-preview` runs the spatial preflight before protected document review.

The live spatial query executes only when all conditions hold:

- `ITEM74H_CANDIDATE_DA_ACCEPTANCE_ENABLED=true`
- `VERCEL_ENV=preview`
- `VERCEL_GIT_COMMIT_REF=agent/item74h-candidate-evidence-20260901`
- `PLANNING_PACK_CHECKOUT_ENABLED` is off

Outside that exact boundary it reports `SKIPPED` without network or storage mutation.

The gate:

- verifies exact current parcel identity and polygon;
- queries zoning using the full polygon, not a point or envelope;
- requires exactly the reviewed `C2/R2` split;
- requires the expected current Byron LEP provenance;
- emits no raw parcel geometry;
- makes no database, Blob, Production, payment or checkout mutation.

## Official sources

- NSW Spatial Services Cadastre History, Lot_M layer: https://portal.spatial.nsw.gov.au/server/rest/services/Cadastre_History/FeatureServer/3
- NSW Department of Planning EPI Land Zoning layer: https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2
