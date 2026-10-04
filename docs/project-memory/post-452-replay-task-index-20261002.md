# Post-#452 replay task index — 2 October 2026

These tasks are prepared so the browser assistant can continue immediately once the core #452 customer-document gate is resolved.

Execution order:

1. `task-replay-pr429-representative-golden-20261002.md`
   - tests/docs only;
   - expands fail-closed representative coverage;
   - should run first after #452 because it hardens truth without adding a customer-facing feature.

2. `task-replay-pr424-lga-service-truth-20261002.md`
   - corrects the live “few minutes” mismatch;
   - reimplements paid LGA preparation timing/refund truth against current code;
   - specifically avoids copying the old weekday/DST limitation blindly.

3. `task-replay-pr426-consultant-disclosure-20261002.md`
   - very small pre-launch disclosure slice;
   - applies only if direct consultant referral remains launch scope.

Post-gate roadmap consolidation is also prepared:
- `task-post-gate-roadmap-consolidation-20261002.md` — recreate #448 → #451 → #449 from current main, with authoritative per-layer Research Viewer sourcing and sanitised public pilot/case-study IDs.

Deferred foundation tasks are now also prepared:
- `task-replay-pr422-consultant-returned-reports-20261002.md` — replay into the current private/progressive evidence graph, not the fixed four-document package;
- `task-redesign-pr438-private-ocr-20261002.md` — retain the OCR lifecycle concepts but redesign away from the legacy generic WorkspaceUpload/public-Blob path;
- roadmap/documentation: #448 → #451 → #449.

Do not execute these tasks on the current #452 evidence branch while its protected commercial acceptance is still unresolved unless the branch strategy is explicitly changed.


## Additional future compliance track

- `task-future-council-employed-planner-cohort-20261002.md` — preserve the council-employed planner idea as an off-by-default, policy-driven future cohort. Recheck the post-12-October-2026 NSW staff-code reform and each employing council's stricter policy before any pilot.
