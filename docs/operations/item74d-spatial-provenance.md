# Item 74D spatial provenance acceptance

Status: **ACCEPTANCE CONTRACT IMPLEMENTED / APPLICATION INTEGRATION NOT EXECUTED**

This slice defines the fail-closed evidence contract for address-level planning
controls in Byron and Kempsey. It does not enable checkout, modify a database,
or claim that the application already persists submission-grade spatial
provenance.

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
- timestamp preservation and invalid timestamps.

The workflow is deliberately separate from hosted Preview evidence checks.
This makes the fail-closed classification contract repeatable on every relevant
pull request without exposing DATABASE_URL.

## Current integration gap

The existing site-context path stores the resolved zone and source label, but
does not yet persist the planning-layer feature identifier, service/layer URL,
resolution method, evidence timestamp, or conflict state as a complete
provenance record. Therefore the new contract is not evidence of end-to-end
commercial acceptance by itself.

The next safe implementation step is to expose a non-persistent provenance
summary from the existing site-context response and add representative
Byron/Kempsey flight tests. A durable schema change must remain a separate,
explicitly approved change because it could affect Production data.

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
complete those product paths. Submission-grade document generation,
evidence-aware uploads, polished DOCX/PDF output, credit handling, and
whole-flow commercial acceptance remain separate Item 74 requirements.
