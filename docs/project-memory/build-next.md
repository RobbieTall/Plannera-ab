# Build Next (Execution Queue)

This is the active sequence for what to build next so direction is never lost.

## 1) Just-in-Time LGA Activation Core — DONE ✓

- Implement LGA coverage-state persistence.
- Implement job de-duplication/locking.
- Implement async `prepare_lga_pack(<LGA_CODE>)` worker contract.
- Add project-level status + completion notification.

**Success signal:** unsupported LGA requests return immediately with baseline guidance while local preparation runs in background.

## 2) Confidence-State Surface Area — DONE ✓

- Ensure outputs consistently distinguish:
  - confirmed / cited / inferred / user-provided / unresolved.
- Add UI-visible confidence + source state for local controls.

**Success signal:** no local-control claim is shown as verified unless coverage state is `VERIFIED`.

## 3) Regeneration Flow After Local Readiness — DONE ✓

- Trigger or prompt regeneration of:
  - Quick Site Check
  - SEE sections
  - risk summary
  - feasibility notes

**Success signal:** user can refresh project artefacts immediately after local controls become available.

## 4) Coverage Maturity Promotion — DONE ✓

- Support progression across:
  - `NOT_STARTED` → `QUEUED` → `PROCESSING` → `SEARCHABLE_READY` → `STRUCTURED_PARTIAL` → `VERIFIED`.
- Add QA checks/golden tests required before `VERIFIED` promotion.

**Success signal:** deterministic checks gated behind `VERIFIED` state only.

## 5) LGA Coverage Status Panel — DONE ✓ (this goal)

Real-time polling hook + status panel component wired into workspace.

**Success signal:** user sees live progress while LGA data is being indexed.

## 6) End-to-End Notification: LGA Ready In-App Alert — DONE ✓

When an LGA transitions to `SEARCHABLE_READY`, notify the project owner with a persistent, dismissible in-app notification stored in the DB.

**Success signal:** user is proactively informed when their LGA becomes available without needing to refresh.

## 7) Project Intelligence Summary Card

A persistent "Project Intelligence" card in the workspace sidebar that shows:

- Site address and zone
- LGA coverage maturity level (human-readable)
- Artefact freshness (last generated, stale count)
- Confidence breakdown (% cited vs inferred vs unresolved from last chat session)

**Success signal:** user can assess data quality at a glance without asking the chat.

## 8) Workspace Chat History Persistence & Thread UX

Persist chat messages to the Project model so conversation history survives page refresh.
Add a "New thread" button to clear the UI without deleting history.

**Success signal:** users can return to a project and continue a conversation.
