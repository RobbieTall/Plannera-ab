# Research Viewer first implementation task

27 September 2026. **New clean feature branch after current commercial gates. Planned, not started.**

## Task overview

Implement RV0 and then RV1 from [Research Viewer](../product/research-viewer.md): a controlled native spatial viewer for the existing Byron/Kempsey project workspace, with Capture to Project and immutable evidence reopening. Begin by inspecting the current source, evidence, authorisation, site-revision and private-storage code. Reuse the existing registry at `src/lib/lga-map-registry.ts` and existing persistence/review services.

The current registry contains URLs and platform labels; those are not verified native service descriptors. Resolve the Byron application to a usable WebMap/service and verify suitable state layers for Kempsey. Use official NSW state layers first, with official council layers as available supplements; record publisher, authority, currency, coverage, scale and state/council conflicts per layer. Missing state coverage may use an authoritative council layer for that topic. Unresolved conflicts must remain visible and cannot clear a planning gate. Record unsupported sources as external. Do not recreate a registry or import legacy Drive Supabase schemas as a new stack.

## Scope and sequence

1. Read AGENTS.md, AGENT_EXECUTION_PROTOCOL.md, build-next and current commercial acceptance records. Confirm the commercial work is complete before starting the feature; this task does not grant acceptance-workflow or Production approval.
2. Produce the two-LGA source/capability matrix and minimal implementation plan, identifying any actual schema dependency. Preserve existing APIs and project/requester semantics.
3. Add native viewer behind a disabled-by-default rollout flag, verified source selection, confirmed-site focus, layer controls and truthful failure/fallback states.
4. Save image plus versioned metadata using server-authorised project/site binding, integrity hash, private storage and idempotent writes. Preserve review status and source attribution; do not mark planning evidence verified merely because capture succeeded.
5. Show saved evidence with source/capture metadata after refresh, alongside a separate open-live-source action.

Remote browsing, a general URL bar, automated DA parsing, new LGAs, billing changes, production activation and replacement of core planning evaluation are excluded. RV2 handles one tracker and reviewed downstream evidence inclusion after RV1 acceptance.

## Acceptance and output

Prove independent Byron/Kempsey journeys and the failure/access cases in the product contract. Check that capture excludes or separately preserves pop-ups/legend, required layers load, retries do not duplicate records and stale/wrong-site evidence cannot support current decisions. Run focused tests, type/lint/build checks required by the repo, and inspect the rendered evidence. Use approved isolated environments for stateful verification.

Return files changed, tests and observed outcomes, short user verification steps, remaining source limitations and clear status. Update build-next and decision/operating records with evidence. Do not record DONE until the slice passes. Rollback by disabling the feature while preserving existing authorised evidence access.
