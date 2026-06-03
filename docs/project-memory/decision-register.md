# Decision Register

A compact register of active product/architecture decisions.

## DR-001 — Product Philosophy Anchor

**Status:** Active  
**Decision:** Plannera turns planning complexity into project intelligence, with explicit confidence handling and source-aware guidance.  
**Reference:** `docs/plannera-product-philosophy.md`

## DR-002 — Staged Intelligence Delivery

**Status:** Active  
**Decision:** Start with usable search-supported capability, then progress to structured controls and verified rule packs. Do not pretend partial ingestion is complete intelligence. Workspace chat must surface source confidence explicitly so retrieved statutory/DCP excerpts are shown as cited, model-only guidance is labelled inferred, and coverage gaps remain unresolved until local controls are available.
**Reference:** `docs/plannera-product-philosophy.md`

## DR-003 — Just-in-Time LGA Activation

**Status:** Active  
**Decision:** For unsupported LGAs, return immediate baseline guidance and trigger asynchronous local DCP/mapping preparation. Do not run full DCP parse in live request path.  
**Reference:** `docs/architecture/just-in-time-lga-activation.md`

## DR-004 — Truthful User Messaging

**Status:** Active  
**Decision:** Use restrained language during local preparation (e.g., “reviewing local controls”); avoid “correct/complete” certainty until confidence level supports it.  
**Reference:** `docs/architecture/just-in-time-lga-activation.md`

## DR-005 — Statutory-First Data Strategy

**Status:** Active

**Decision:** Prioritise authoritative statutory instruments (LEPs, SEPPs, and council DCP source material) as the primary grounding layer before heuristic or model-inferred planning guidance. Local-control answers must cite retrieved statutory/DCP excerpts where available and must identify unresolved controls when source coverage is not yet searchable or verified.

**Reference:** `docs/architecture/just-in-time-lga-activation.md`


## DR-006 — Stale-not-deleted Artefact Strategy

**Status:** Active

**Decision:** When an LGA reaches `SEARCHABLE_READY`, existing artefacts are marked with `staleAt` rather than deleted, preserving history while surfacing a regeneration prompt to the user.

**Reference:** `docs/project-memory/build-next.md`

## DR-007 — Deterministic QA Gates for Coverage Maturity

**Status:** Active

**Decision:** Deterministic QA gates for coverage maturity — VERIFIED state requires ≥50 clauses with zoning and height/FSR coverage, plus all STRUCTURED_PARTIAL checks. Checks run automatically post-ingestion and can be re-run via admin API. FAILED_REVIEW_NEEDED is set on any check failure to surface issues without blocking the system.

**Reference:** `docs/project-memory/build-next.md`
