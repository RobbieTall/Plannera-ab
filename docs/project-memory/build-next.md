# Build Next (Execution Queue)

This is the active sequence for what to build next so direction is never lost.

## 1) Statutory-First Baseline (NEW PRIORITY)

- Ensure every site can return useful clause-cited statutory answers (SEPP/LEP/Acts) even when DCP is unavailable.
- Add deterministic response sections:
  - statutory controls available now,
  - local controls unresolved,
  - exact next ingestion target.
- Add test coverage for “DCP missing but statutory answer still useful and cited.”

**Success signal:** users still get factual, useful answers immediately without waiting on DCP ingestion.

## 2) Just-in-Time LGA Activation Core

- Implement LGA coverage-state persistence.
- Implement job de-duplication/locking.
- Implement async `prepare_lga_pack(<LGA_CODE>)` worker contract.
- Add project-level status + completion notification.

**Success signal:** unsupported LGA requests return immediately with baseline guidance while local preparation runs in background.

## 3) Confidence-State Surface Area

- Ensure outputs consistently distinguish:
  - confirmed / cited / inferred / user-provided / unresolved.
- Add UI-visible confidence + source state for local controls.

**Success signal:** no local-control claim is shown as verified unless coverage state is `VERIFIED`.

## 4) Regeneration Flow After Local Readiness

- Trigger or prompt regeneration of:
  - Quick Site Check
  - SEE sections
  - risk summary
  - feasibility notes

**Success signal:** user can refresh project artefacts immediately after local controls become available.

## 5) Coverage Maturity Promotion

- Support progression across:
  - `NOT_STARTED` → `QUEUED` → `PROCESSING` → `SEARCHABLE_READY` → `STRUCTURED_PARTIAL` → `VERIFIED`.
- Add QA checks/golden tests required before `VERIFIED` promotion.

**Success signal:** deterministic checks gated behind `VERIFIED` state only.
