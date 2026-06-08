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

## 7) Project Intelligence Summary Card — DONE ✓

A persistent "Project Intelligence" card in the workspace sidebar now shows:

- Site address and zone
- LGA coverage maturity level (human-readable)
- Artefact freshness (last generated, stale count)
- Confidence breakdown (% cited vs inferred vs unresolved from last chat session)

**Success signal:** user can assess data quality at a glance without asking the chat.

## 8) Workspace Chat History Persistence & Thread UX — DONE ✓

Persist chat messages to the Project model so conversation history survives page refresh.
Add a "New thread" button to clear the UI without deleting history.

**Success signal:** users can return to a project and continue a conversation.

## 9) Real LEP Zone Data in Quick Site Check and Pre-SEE Artefacts — DONE ✓

Wire retrieved LEP context and parsed zone data into Quick Site Check artefacts, Pre-SEE planning memo grounding context, and workspace-chat system prompts.

**Success signal:** site check, chat, and Pre-SEE outputs prefer real retrieved LEP zone/permissibility/control evidence and flag LEP-sourced controls in artefact JSON.

## 10) DCP Clause Injection into SEE Sections — DONE ✓

Pull the top-5 DCP clauses by SEE section type (setbacks, heights, parking, landscaping) into each SEE section prompt so the AI writes to actual control numbers.

**Success signal:** each generated SEE section cites section-specific DCP clause text and avoids generic control numbers when a retrieved DCP clause is unavailable.

## 11) Workspace-chat DCP grounding — DONE ✓

Inject top-5 DCP clauses into workspace-chat system prompt for user-initiated questions about setbacks, height, parking, and landscaping, keyed by the detected topic from the user's message.

**Success signal:** workspace-chat retrieves topic-aware DCP clauses for setbacks, height, parking, landscaping and related controls before building the system prompt, and falls back gracefully when no topic-specific clauses are available.

## 12) Artefact confidence scoring — DONE ✓

After each chat response, parse assistant message for confidence signals (cited clause numbers, hedging language, unresolved gaps) and persist a `confidence_score` + `confidence_breakdown` JSON to the ChatMessage row.

## 13) Surface confidence score in the workspace UI — DONE ✓

Show a small confidence badge on each assistant chat bubble, sourced from the `confidenceScore` field returned by the chat-history GET endpoint.

- Green for scores ≥0.7
- Amber for scores 0.4–0.69
- Red for scores <0.4

## 14) Workspace chat export — DONE ✓

Add a Copy transcript button to the chat panel that copies the full conversation as markdown to the clipboard, including assistant confidence scores as footnotes.

## 15) Smart follow-up suggestions

After each assistant response, show 2-3 clickable question chips generated locally from the reply (no API call). Clicking chips pre-fills the input.
