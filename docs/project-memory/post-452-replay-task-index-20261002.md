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

Deferred until later:
- #422 returned consultant-report foundation;
- #438 OCR review lifecycle;
- roadmap/documentation: #448 → #451 → #449.

Do not execute these tasks on the current #452 evidence branch while its protected commercial acceptance is still unresolved unless the branch strategy is explicitly changed.
