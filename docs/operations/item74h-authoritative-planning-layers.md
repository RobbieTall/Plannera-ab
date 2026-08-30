# Item 74H authoritative planning layers

## Purpose

This read-only contract adds three official NSW point-intersection checks to the
Item 74H evidence boundary:

- primary EPI heritage;
- primary EPI flood planning;
- the Biodiversity Values Map.

It is a partial mapped-constraint check, not a complete site clearance and not
a planning approval decision. Production checkout remains disabled.

## Query minimisation

The protected site coordinates may appear only in an in-memory ArcGIS request.
Queries request no geometry and omit object IDs, heritage item IDs, heritage
item names and free-text comments. Returned observations contain only public
instrument names, mapped classes or categories, source currency/version dates,
precise interpretation labels and a SHA-256 evidence hash.

The contract ignores unexpected identifier and geometry fields if an upstream
response includes them. Those values must never enter an observation, log,
database record or acceptance summary.

## Interpretation boundary

Each result is phrased as either an intersection or no intersection in the
specific configured layer. In particular:

- no primary EPI heritage intersection is not proof of no heritage risk;
- no primary EPI flood intersection is not proof that the land cannot flood;
- no Biodiversity Values Map intersection is not proof of no ecological
  constraint.

These checks do not cover every Byron LEP, DCP, SEPP, council or environmental
map. They must remain one part of the MAPPED_CONSTRAINTS source group.

## Commercial boundary

A positive mapped result must flow into the deterministic pathway as a
constraint or evidence requirement. A negative result may remove only that
specific mapped-layer flag.

The A$49 Planning Controls Pack remains blocked until the complete Item 74H
site-evidence manifest is satisfied, including title/survey corroboration,
proposal measurements, road classification, exact setback evidence and all
relevant mapped constraints. The A$749 SEE additionally requires the evidence
upload set and operator approval.

## Acceptance

The secret-free GitHub workflow `Authoritative Planning Layers Contract`
verifies:

- read-only, geometry-free and identifier-minimized query construction;
- precise intersection/no-intersection labels;
- source currency/version handling;
- redaction of unexpected identifiers and geometry;
- fail-closed ArcGIS error and malformed-response handling.

A later approved protected Preview flight may call these sources for the
controlled Byron address. It must emit only aggregate statuses, source
references, dates and hashes, then remove temporary protected variables and
synthetic records. It must never print or persist the address, coordinates,
parcel identifiers or raw ArcGIS responses.

## Protected Preview acceptance: 2026-08-25

- Accepted flight: `dpl_FcyaLKA11xz3MzzXXsHUZq3ML8fQ` at commit `155063e4af21324f025512f89076fdd2fee2b5dc`.
- Scope was uniquely resolved to the controlled Byron RU2 shed/outbuilding case using an exact normalized address match and authoritative NSW EPI coordinate-intersection zoning.
- Seven authoritative observation groups were retrieved: cadastral lot, bushfire, water proximity, road reference, heritage, flood planning, and biodiversity values.
- The response returned no address, coordinates, parcel identifiers, geometry, or raw source responses.
- Production checkout remained disabled. The A$49 Planning Controls Pack and A$749 submission SEE remained ineligible, with the pathway held at `MORE_EVIDENCE_REQUIRED`.
- An earlier run was invalidated after a resolver diagnostic included the controlled input in protected Preview logs. Request-scoped resolver log suppression was added and contract-tested before the accepted rerun; the accepted run produced only privacy-safe stage and evidence summaries.
- Both temporary branch-scoped Preview variables were removed immediately after acceptance.
- Clean closure deployment `dpl_Hf6FDPm2G9WdWcKEtxnw1JqmBJRY` at commit `0730fc762ad86a4a4ae2fabfe23cd1bf93216b43` completed successfully with the controlled acceptances disabled, paid outputs blocked, Production checkout off, and synthetic persistence cleanup at zero residual rows.
- The exact-head Pathway Check, authoritative spatial, authoritative planning-layer, site-evidence manifest, submission SEE credit, and commercial funnel workflows all passed.
