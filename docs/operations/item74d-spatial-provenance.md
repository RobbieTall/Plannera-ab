# Item 74D spatial provenance acceptance

Status: **RESPONSE INTEGRATION IMPLEMENTED / HOSTED PREVIEW NOT EXECUTED**

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
- insecure or non-official service URLs; and
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

## Hosted Preview blocker

PR #344 reached GitHub CI but Vercel stopped before build with Resource
provisioning failed. Read-only diagnosis confirmed the Neon project branch
limit is exhausted, and no Item 74D Preview branch was created. An archived,
unused Preview branch must be explicitly approved for deletion before Vercel
can provision the isolated branch and run hosted address-level flight tests.

## Safety boundary

- PLANNING_PACK_CHECKOUT_ENABLED remains off/false in Production.
- Do not merge or activate Production checkout from this work.
- Do not write to the Production database.
- Do not weaken partial or unresolved results to make a gate green.
- Do not log addresses, coordinates, parcel identifiers, credentials, or raw
  provider payloads in CI output.
- Use isolated Preview data for hosted checks.
- Do not delete an archived Preview branch without explicit approval.
- Keep operator review mandatory for ambiguity, boundary cases, unavailable
  services, and conflicting evidence.

## Relationship to Item 74

This contract supports the spatial evidence required by the A$749 Statement of
Environmental Effects and the A$49 Planning Controls Pack credit. It does not
complete those product paths. Submission-grade document generation,
evidence-aware uploads, polished DOCX/PDF output, credit handling, and
whole-flow commercial acceptance remain separate Item 74 requirements.
