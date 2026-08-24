# Item 74H authoritative spatial evidence

## Purpose

This contract turns a resolved site point into a small, redacted set of official
NSW spatial observations for the Byron RU2 shed pathway. It is read-only and
fail-closed. It does not make a planning approval decision and it does not make
the A$49 Planning Controls Pack or A$749 SEE eligible by itself.

Production checkout remains disabled.

## Official sources

The first source set is intentionally narrow:

- NSW Land Parcel Property Theme, Lot layer: plan area and source dates only.
- NSW Bush Fire Prone Land: point intersection and mapped category only.
- NSW Water Theme: count-only proximity checks across four configured water
  layers within 50 metres.
- NSW Transport Theme, RoadSegment: non-identifying hierarchy/type reference
  codes within 100 metres.

The query contract always requests no geometry. It excludes lot, plan, parcel,
road-name and object identifiers from requested fields. Coordinates exist only
inside the in-memory ArcGIS request URL and must never be logged, persisted or
included in acceptance output.

## Evidence meaning

The labels are deliberately precise:

- A cadastral plan area can satisfy the site-confirmed landholding-area fact
  when exactly one lot intersects the resolved point and the unit is supported.
- A bushfire result says whether the point intersects the configured statewide
  layer. No intersection is not represented as proof of no bushfire risk.
- A water result says only whether a configured mapped water feature occurs
  within the 50 metre search radius. It is not an exact surveyed setback.
- RoadSegment returns numeric reference codes without a published domain
  mapping in the layer. Those codes must remain MORE_EVIDENCE_REQUIRED and
  cannot be translated into a Byron DCP classified-road conclusion.

Unsupported area units, ambiguous lots, ArcGIS errors, missing feature arrays,
invalid counts and incomplete water-layer coverage fail closed.

## Commercial boundary

This source set advances LANDHOLDING_AREA_SQM and mapped-constraint evidence.
It does not replace:

- title or survey corroboration;
- a site plan showing the proposed building envelope;
- exact boundary, waterbody or ridgeline measurements;
- an authoritative determination of classified-road status;
- heritage, biodiversity, flood or other relevant planning layers;
- evidence uploads and operator review.

The free Pathway Check may report these observations and remaining evidence.
The A$49 pack remains blocked until every required site-evidence group is
satisfied. The A$749 SEE additionally requires the upload set and operator
approval under the Item 74H site-evidence manifest.

## Acceptance

The secret-free GitHub workflow
`Authoritative Spatial Evidence Contract` verifies query minimisation,
coordinate redaction, area normalization, fail-closed parsing, precise mapped
layer labels and the prohibition on promoting transport reference codes into a
DCP road classification.

A later protected Preview flight may resolve the approved controlled address
and call these query URLs. It must emit only aggregate statuses, public source
references, dates and hashes, then remove all temporary protected variables and
synthetic records. It must never print the address, coordinates or parcel
identifiers.
