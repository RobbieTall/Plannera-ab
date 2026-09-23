# Daytime continuity handover — 24 September 2026

Operational owner: RobbieTall. This file records mobile daytime execution so the desktop browser assistant can resume without reconstructing state from chat.

## Read order for desktop continuation

1. Issue #395 latest comments — Item 78C acceptance/diagnostic lane.
2. Acceptance-branch handover at commit `2793aef38433fdb41341c096f7b027689450f525`.
3. Issue #421 — consultant returned-report intake.
4. This file.
5. PR for `feat/consultant-returned-report-intake-20260924`, including checks/review.
6. `docs/project-memory/build-next.md`, `docs/project-memory/decision-register.md`, `docs/COMMERCIALISATION_WORKFLOWS.md`.
7. `docs/operations/consultant-returned-report-intake.md`.

Do not rely only on `main`. Item 78C safeguards currently live on the non-main acceptance branch and the returned-report work is on an independent feature branch.

## Item 78C daytime actions

Robbie explicitly approved the bounded Preview-only package.

Completed:
- PR #420 Draft flag was cleared only because GitHub refused the approved merge while it remained Draft.
- PR #420 was merged into its existing base `accept/item-78c-byron-kempsey-20260914`, not `main`.
- Actual merge SHA: `2793aef38433fdb41341c096f7b027689450f525`.
- Deployment suppression and read-only diagnostic safeguards are therefore installed on that acceptance branch.

Blocked on mobile tooling:
- update `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT` in `item78c-byron-preview`;
- update the same variable in `item78c-kempsey-preview`;
- dispatch the registered Item 77 protected commercial journey.

Exact remaining authorised desktop steps are recorded in Issue #395. Repin both environments to `2793aef38433fdb41341c096f7b027689450f525`, then dispatch only the read-only diagnostic using:
- branch: `accept/item-78c-byron-kempsey-20260914`
- `diagnostic_only=true`
- `expected_commit=2793aef38433fdb41341c096f7b027689450f525`
- `confirmation=READ ONLY PREVIEW LOGIN CHECK`

Do not start the Item 78C whole-funnel acceptance until the diagnostic evidence has been interpreted and separately authorised. Production and checkout remain untouched.

## Independent daytime build lane

Because the mobile connector cannot perform those two protected GitHub Actions controls, work continued on the next independent launch-critical gap rather than stopping.

Tracking: Issue #421.
Branch: `feat/consultant-returned-report-intake-20260924`.
Base at branch creation: `main` SHA `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.

### Problem confirmed from canonical docs

The consultant referral queue exists and can truthfully track delivery, but returned consultant reports were not yet bound back into the exact referral/project evidence chain. The normal workspace upload route is explicitly unsuitable for private consultant reports because it can support guest/public storage.

### Implemented

- Added `CONSULTANT_REPORT` to the Item 74H private-evidence role contract.
- Added `src/lib/consultant-returned-report-intake.ts`.
- Added node tests at `tests/consultant-returned-report-intake.test.ts`.
- Added operations runbook `docs/operations/consultant-returned-report-intake.md`.
- Added durable `ConsultantReturnedReportBinding` schema/migration and an internal idempotent binding service; the row contains no consultant identity, filename, report text, address or URL.
- Added binding-service tests for exact-scope persistence, replay, undelivered referrals, wrong discipline, closed referrals, cross-scope evidence reuse and idempotent evidence-package marking.
- Updated build-next, decision register and commercialisation workflow docs.

The contract is server-authoritative and privacy-minimal. It requires exact:
- referral;
- project;
- referral scope key;
- immutable referral package digest;
- requested discipline; and
- private-evidence content hash.

A report cannot progress before the referral was actually delivered. Quarantined or rejected private evidence stays quarantined/rejected. Even `READY_FOR_EVIDENCE_PACKAGE` does not itself unlock a paid product, final SEE, submission readiness or Production checkout.

### Deliberately not implemented yet

- authenticated private consultant-report upload endpoint;
- durable server returned-report binding model/adapter;
- real private Blob adapter;
- real malware scanner/immutable scan record connection;
- operator-review queue UI;
- evidence applicability review integration;
- workspace returned-report UI;
- protected hosted Preview flight.

Those are later slices and must reuse the existing Item 74H private-evidence boundary. Do not route consultant reports through the existing general workspace upload endpoint.

### CI evidence for tested code head `021cc69e2075b7733fc8c9cd5bc006286b115af0`

All eleven observed PR gates completed successfully:

- Soft launch smoke enforcement — run 35934897958
- Pathway Private Evidence Scanner Contract — run 35934897936
- Item 74H Candidate Spatial Policy — run 35934897948
- Item 74H Candidate Evidence Policy — run 35934897935
- Pathway Private Evidence Upload Policy — run 35934898022
- Pathway Private Evidence Operator Review — run 35934898061
- Item 74H Working SEE Preview Gate — run 35934897956
- Pathway Private Evidence Package Assembly — run 35934898074
- Whole-LGA source matrix enforcement — run 35934898262
- Submission SEE Credit Contract — run 35934897953
- Commercial Funnel Golden Gate — run 35934897964

The Commercial Funnel Golden Gate executed 191 node tests with zero failures and 82 Vitest checks with zero failures. The private-evidence upload policy directly exercised `CONSULTANT_REPORT` quarantine/review behaviour. These are deterministic PR/contract results, not hosted private-upload acceptance or Production evidence.

## Safety boundaries

- No Production deployment, Production DB/schema mutation or checkout enablement.
- No secrets read, copied or exposed.
- No stateful acceptance run started from the mobile session.
- PR/CI evidence for Issue #421 must be read at the exact feature-branch head; do not infer green status from local reasoning.

## Desktop completion target

On return to desktop:
1. Finish Item 78C repin + read-only diagnostic first if protected environment/workflow controls are available.
2. Inspect Issue #421 PR checks and review the returned-report contract.
3. Fix any failing checks on the feature branch without broad refactors.
4. If green and reviewed, decide whether to merge the returned-report contract to `main` or continue the next adapter slice on the same issue.
5. Update this handover plus canonical queue/decisions with the exact terminal results before starting the next unrelated task.
