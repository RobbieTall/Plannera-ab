# Research Viewer operating plan

27 September 2026. Planned capability; no viewer deployment or acceptance is claimed.

## Release sequence

Complete the current commercial gates and their required fixes first. Research Viewer follows on a new feature branch; keep immutable acceptance branches unchanged. Implement RV0/RV1 for Byron and Kempsey before a DA-tracker adapter. Remote browsing has separate acceptance and remains disabled initially. The [product contract](../product/research-viewer.md) owns scope and evidence requirements.

## Source onboarding and upkeep

The implementing engineer records the official publisher, source URLs, service/WebMap identifiers, licence/attribution, capabilities, CORS/embedding/capture findings, adapter version and validation date. Use official NSW state layers first and official council supplements where available; record the authority, source date, scale, coverage and role of every layer. The product owner accepts the pilot source matrix, including gaps and disagreements. A platform label or HTTP 200 alone is insufficient evidence of compatibility or accuracy. Conflicts remain unresolved until checked against the applicable instrument/map or responsible authority; never silently prefer the newer-looking display.

At implementation, add a daily low-volume health check for enabled pilot sources, within provider terms/rate limits, plus a weekly operator review of failures and source changes. This is an operating requirement, not a scheduled job created by this documentation change. Check schemas, required layers, redirect domains and capture capability after adapter/provider changes and before expansion. Failure disables the affected capability or falls back externally; never silently substitutes a different dataset.

Monitor source-open success, complete-capture success, capture/save latency, retry rate, orphan objects, fallback reasons, denied access, storage growth and cost per successful evidence record. Do not log private site details, image contents, tokens or search terms. Establish numerical performance/cost budgets from RV0/RV1 measurements before rollout.

## Evidence lifecycle and incidents

Store originals and versioned metadata privately; regenerate derivatives without overwriting originals. Apply existing project retention/deletion and restore requirements to images, manifests and derivatives. Test project deletion and failed-upload cleanup. Hashes support integrity checks, not claims of source truth.

On a broken layer or capture failure, preserve the last saved evidence with its historical timestamp, show the live-source error and offer the official external link. Do not present an old capture as a current map. On suspected cross-project access or untrusted-content execution, disable the affected adapter, preserve minimal audit events and investigate before reactivation.

Rollback disables the viewer/source feature flag and restores external links. Existing evidence remains accessible to authorised users. Database changes, stateful Preview acceptance and Production changes continue to follow the repository's change-control process; deployment builds stay non-mutating.

## Go live evidence

Record exact commit, tested source descriptor versions, independent Byron and Kempsey journeys, access-control and failure cases, visual review of evidence sheets, operator decision and rollback check. Do not claim launch readiness based on a green build alone. Keep commercial acceptance and Research Viewer acceptance as separate records.
