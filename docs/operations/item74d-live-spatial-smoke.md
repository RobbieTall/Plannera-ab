# Item 74D live spatial provenance smoke

Status: **IMPLEMENTED / LIVE GREEN**

This gate checks the public NSW Land Zoning feature layer directly. For each
LGA it selects a current official polygon by exact LEP instrument and zone,
computes a point safely inside that polygon, and requires the point query to
resolve back to the same OBJECTID. It uses no database, API key, address
string, parcel identifier, or Production environment variable.

## Command

```bash
npx tsx scripts/spatial-provenance-live-smoke.ts
```

The GitHub workflow is named Live NSW Spatial Provenance.

## Acceptance boundary

Each flight must return exactly one intersecting zoning feature and must match:

| Flight | Instrument | Zone |
| --- | --- | --- |
| Byron | Byron Local Environmental Plan 2014 | SP3 |
| Kempsey | Kempsey Local Environmental Plan 2013 | E2 |

The returned feature must include an OBJECTID and the source must be the exact
official HTTPS NSW Land Zoning layer.

## Latest evidence

Run 32362702543 completed successfully on 20 August 2026:

| Flight | Feature | Result |
| --- | --- | --- |
| Byron SP3 | OBJECTID:824345 | Byron LEP 2014 / SP3 |
| Kempsey E2 | OBJECTID:875459 | Kempsey LEP 2013 / E2 |

Both flights round-tripped to the same source feature and the gate reported
SPATIAL PROVENANCE LIVE READY: 2/2.

The gate is red when:

- the service is unavailable after three bounded attempts;
- the response contains an ArcGIS error;
- no feature is returned;
- more than one feature is returned by the round-trip;
- no safe interior point can be computed from the official polygon;
- the round-trip resolves a different OBJECTID;
- the LEP instrument differs;
- the zone differs;
- OBJECTID provenance is absent; or
- the configured source is not HTTPS.

Multiple features are not silently reduced to the first result. They represent
a potential boundary or instrument ambiguity and require operator review.

## Output safety

The gate reports the flight identifier, LGA, instrument, zone, feature
identifier, official layer URL, and check timestamp. It does not print the
query coordinates, an address, a parcel identifier, credentials, tokens, or a
raw provider payload.

## Scope

A green result proves live official-service connectivity and the two named
zone-polygon evidence flights. It does not prove whole-LGA address resolution,
database persistence, the Vercel application path, or submission-grade output.

The isolated Vercel Preview flight remains required. It is currently waiting
for explicit approval to delete one archived zero-write Neon Preview branch so
the Item 74D branch can be provisioned.

## Safety

- Production checkout remains disabled.
- The command performs public read-only HTTP requests.
- The command does not connect to a database.
- The command does not mutate Production or Preview data.
- Do not weaken an expected instrument or zone to make the gate green.
