# Item 74D spatial provenance acceptance

Status: **RESPONSE INTEGRATION IMPLEMENTED / HOSTED BUILD GREEN / ADDRESS FLIGHTS NOT EXECUTED**

This slice defines and integrates the fail-closed evidence contract for
address-level planning controls in Byron and Kempsey. Fresh site-context
responses can carry source provenance without modifying the database schema.
It does not enable checkout or claim durable submission-grade persistence.

## Commercial acceptance boundary

A zoning result is verified only when all of the following are present:

- a non-empty zone code;
- an authoritative NSW planning-layer source;
- the exact official HTTPS NSW EPI service or zoning-layer URL;
- a coordinate intersection or parcel lookup with valid location evidence;
- a non-empty source feature identifier;
- a valid resolution timestamp; and
- no conflicting zone result.

Anything less remains partial or unresolved. Candidate values, launch fixtures,
and manual entries can never become authoritative merely by carrying an
authoritative-looking source label.

Boundary ambiguity or conflicting zone evidence is unresolved and must be sent
to operator review. The acceptance contract must not guess, select the more
commercially convenient zone, or discard contrary evidence.

## Deterministic CI gate

The Spatial Provenance Acceptance workflow runs without database credentials
and checks:

- authoritative Byron coordinate evidence;
- authoritative Kempsey parcel evidence;
- missing feature identifiers;
- fixture and candidate fallbacks;
- conflicting zones;
- insecure or non-official service URLs;
- timestamp preservation and invalid timestamps;
- fresh authoritative response integration;
- explicit launch-fixture and candidate labels; and
- fail-closed reloads when source evidence was not persisted.

The workflow is deliberately separate from hosted Preview evidence checks.
This makes the fail-closed classification contract repeatable on every relevant
pull request without exposing DATABASE_URL.

## Current integration state

A fresh authoritative zoning lookup now carries the NSW service and layer URL,
OBJECTID-style feature identifier, coordinate or parcel resolution method, and
resolution timestamp into the site-context response. Candidate values and
launch fixtures use explicit CANDIDATE or LAUNCH_FIXTURE sources and cannot be
verified.

This evidence is intentionally transient. Reloaded records are unresolved
because the existing schema did not store the feature identifier, source URL,
method, or source timestamp. The response must not reconstruct or invent those
fields from a zone label.

A durable schema change remains a separate, explicitly approved change because
it could affect Production data.

## Hosted Preview evidence

After explicit approval to delete one archived zero-write Preview branch,
Vercel provisioned isolated Neon branch
`preview/agent/item74d-spatial-provenance`
(`br-sweet-pine-a7m4u4fk`). A guarded one-time repair populated only that
Preview branch. The repair hook was then removed.

Clean head `40ea1ec835ada9a2a94e5edb46affdebe14aad5c` reached Vercel READY using
the normal non-mutating build. Hosted results were:

- `smoke:launch`: 18 green, 0 amber, 0 red;
- `smoke:whole-lga`: 60 green, 0 red;
- Spatial Provenance Acceptance run 32366798539: success;
- Live NSW Spatial Provenance run 32366798528: success; and
- Commercial Funnel Golden Gate run 32366798519: success.

This proves protected Preview connectivity, whole-LGA launch evidence, the
fail-closed response contract, and two current official polygon round-trips.
It does not prove authenticated address-level resolution through the deployed
application. That representative application flight remains required and must
not print or persist address, coordinate, parcel, credential, or raw provider
evidence in CI logs.

## Safety boundary

- PLANNING_PACK_CHECKOUT_ENABLED remains off/false in Production.
- Do not merge or activate Production checkout from this work.
- Do not write to the Production database.
- Do not weaken partial or unresolved results to make a gate green.
- Do not log addresses, coordinates, parcel identifiers, credentials, or raw
  provider payloads in CI output.
- Use isolated Preview data for hosted checks.
- Keep operator review mandatory for ambiguity, boundary cases, unavailable
  services, and conflicting evidence.

## Relationship to Item 74

This contract supports the spatial evidence required by the A$749 Statement of
Environmental Effects and the A$49 Planning Controls Pack credit. It does not
complete those product paths. Authenticated address-level application flights,
durable persistence, submission-grade document generation, evidence-aware
uploads, polished DOCX/PDF output, credit handling, and whole-flow commercial
acceptance remain separate Item 74 requirements.
