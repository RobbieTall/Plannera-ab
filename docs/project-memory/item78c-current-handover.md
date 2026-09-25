# Item 78C current desktop/mobile handover

## Item 78C runtime-target diagnostic checkpoint - 25 September 2026

**HOLD: whole-funnel acceptance and commercial launch remain unproven.**
This checkpoint supersedes historical next-step instructions below.

Both council saved-login checks passed in [run #71](https://github.com/RobbieTall/Plannera-ab/actions/runs/36086708887). This proves the checked primary session/project relationships in the runner databases, not hosted alignment, alternate-fixture eligibility, payment/output acceptance or commercial readiness. Do not repeat credential setup.

Robbie approved preparing, testing and deploying a bounded Preview-only database-target diagnostic. This patch is preparation, not deployment or execution evidence. The diagnostic performs an in-process configuration comparison only, without database queries, session updates, network calls or secret output. It is restricted to the acceptance Preview branch and expires automatically. A result identifies configuration only; it does not certify connectivity, data identity, fixture readiness or historical deployments.

Follow [the diagnostic runbook](/docs/operations/item78c-database-target-diagnostic.md). Confirm deployment protection, exact candidate/build safety and unchanged Production before a manual Preview deployment. Keep automatic Git deployment suppressed. Record actual candidate/deployment/result evidence in Issue #395. Do not dispatch stateful acceptance merely because this diagnostic passes. Production checkout stays disabled; no Production data/schema changes are authorized. Preserve independent council fixtures and unrelated work.



## Current checkpoint: direct read-only follow-up - 25 September 2026

**HOLD. Neither whole-funnel acceptance nor commercial launch is proven.**
This section supersedes operational instructions in the historical checkpoints below.

The limited presence-only diagnostic in [run #68](https://github.com/RobbieTall/Plannera-ab/actions/runs/36079877207) completed successfully for both councils. PR #440 is merged into the acceptance branch only. This result establishes presence, not credential validity, session/project ownership, hosted alignment or the original failure's cause. Do not ask for duplicate setup or rerun the earlier failure unchanged.

This follow-up prepares direct orchestration of the existing saved-login diagnostic in the registered Item 77 workflow. Its query, configuration validator and allowlisted summary are unchanged. Manual-only selection, credential-free prerequisite, exact non-main commit evidence, council-specific protection/pin rechecks, final-step-only credentials and cleanup are retained. Presence-only mode and ordinary commercial coverage remain separate and unchanged. Direct orchestration is a bounded workaround; the reusable-delivery root cause remains unproven.

Preparation is NOT approval for a database-connected run. Require synthetic tests, independent exact-commit review, safe publication/integration and confirmed replacement pins, then request explicit approval for one manual read-only Preview session lookup at the actual reviewed full SHA. Permit normal connection/audit activity only; no writes, migrations, credential changes, deployment, Production access or automatic reruns. Human environment approval remains required.

Only after real session/project evidence is obtained should the original whole-funnel blocker be investigated further. Keep Production checkout disabled and council fixtures independent. Preserve unrelated feature PRs. Record privacy-minimal exact commit/run/outcome checkpoints in Issue #395; never publish secrets or sensitive operational details.

### Direct saved-login mode

The registered Item 77 workflow uses `diagnostic_only=true`, `presence_only=false`, the approved full `expected_commit`, and `confirmation=READ ONLY PREVIEW LOGIN CHECK`. This mode differs from the successful presence-only run: its final diagnostic process receives the existing two credentials and can connect to the validated council-specific Preview database.

A separate credential-free prerequisite validates commit evidence and both environment protections. Each direct protected job repeats authorization, installs with lifecycle scripts disabled and no application credentials, generates Prisma using synthetic configuration, then runs the unchanged parameterized SELECT inside a read-only transaction. A distinct summary step allowlists output; raw temporary files are not uploaded and are removed. Database connection/audit records may occur.

The registered caller no longer invokes the reusable workflow for this mode, preventing duplicate direct/reusable execution. The existing standalone file remains unchanged for historical coverage, but is not the operating entry point. Presence-only mode remains available separately; do not repeat it without a concrete new question.

Publication branch: `fix/item78c-direct-login-20260925`. Its initial complete commit must suppress that exact branch's automatic Git deployment and preserve the existing exclusions. No manual deployment is authorized. Record actual reviewed/published/integrated SHAs in Issue #395 rather than guessing them.

## Historical checkpoints retained below


## Current checkpoint: limited presence diagnostic - 25 September 2026

**HOLD. Whole-funnel acceptance and commercial launch remain unproven.**
This section supersedes operational instructions in the historical checkpoints below.

PR #439 is merged into the acceptance branch, not main. The subsequent diagnostic run #66 is terminal and did not establish acceptance. Independent review recommends a limited presence-only comparison before requesting repeated setup. Its result will not establish credential validity, database alignment, session ownership or the original application failure's cause.

Robbie approved preparing, reviewing and running this limited Preview diagnostic. This change adds an optional direct protected mode to the registered Item 77 workflow while retaining the existing diagnostic and commercial tests. It reports exactly two presence booleans and does not pass raw application credentials to its process, install dependencies, connect to databases, or invoke hosted application endpoints. Authorization still checks exact commit evidence, non-main ancestry and saved protections before the protected jobs can proceed; protected jobs recheck the approved pin and target.

Next: require synthetic tests, independent review and publication-safety evidence; integrate only into the acceptance branch, save its actual reviewed replacement pin, and dispatch the limited mode with human environment approval. Record exact candidate, integration and run evidence in Issue #395. Preparation is not execution or a passing result.

Do not recreate existing configuration blindly. Keep the councils independent and Production checkout disabled. No Production changes, stateful acceptance, deployment, live payment or refund are authorized by this diagnostic. Preserve unrelated PRs. Public handoff notes must omit sensitive operational details. Use one visible Chrome working tab for any necessary user copy/paste, and never ask for secret values in chat.

### Limited-mode operating instructions

Use the registered Item 77 workflow on the approved acceptance branch. Select BOTH `diagnostic_only=true` and `presence_only=true`; supply the actual reviewed full `expected_commit` and `confirmation=READ ONLY PREVIEW LOGIN CHECK`. The existing environment pins must match that executing commit. Do not use a fix branch to bypass the acceptance-branch restriction.

The direct prerequisite rejects a missing diagnostic-only selection. Protected jobs depend on prerequisite success, use distinct existing council environments, and recheck protections and pins. Only the final step evaluates two setting-presence expressions. The runner receives literal boolean strings, not the stored values. Missing or malformed flags fail; a successful probe proves presence only. GitHub metadata reads and normal runner/audit activity still occur.

If both flags are true, investigate differences from the reusable diagnostic path without claiming the root cause proven. If either is false, investigate saved configuration and platform delivery before requesting any replacement. Do not repeat an unchanged failing run. Keep detailed operational evidence private; publish only the minimum safe status.

The new fix branch `fix/item78c-presence-only-20260925` must have its exact Git-deployment suppression entry in its initial commit. The existing acceptance suppression is retained. Inspect CI and external deployment triggers before creating its branch reference. Suppression does not prevent manual deployment or prove all transitive dependency behavior safe.

Synthetic validation: `node --test tests/item78c-session-preflight*.test.mjs`. Tests do not certify GitHub service-side secret delivery. The existing reusable saved-login diagnostic remains separately available with `presence_only=false`; it is not invoked by presence-only mode.

## Historical checkpoints retained below


## Current Item 78C checkpoint - 25 September 2026

**HOLD. Neither Preview whole-funnel acceptance nor commercial launch is proven.**
This checkpoint supersedes all older operational instructions and approval/pin status below; historical product requirements and evidence are preserved.

- PR #420 was merged into `accept/item-78c-byron-kempsey-20260914` at `2793aef38433fdb41341c096f7b027689450f525`, not main. Both existing Preview environment commit pins were saved and confirmed at that SHA on 25 September.
- The registered Item 77 diagnostic-only [run #65, attempt 1](https://github.com/RobbieTall/Plannera-ab/actions/runs/36069159099) completed. Credential-free and protected authorization passed. Both councils returned `configuration_invalid`, `council=null`, `checks=null`; they stopped before the diagnostic database query. Cleanup passed. This does not establish a login, ownership or database alignment result.
- Robbie approved a bounded diagnostic refinement, synthetic tests, independent review and replacement Preview pin. This branch prepares fixed, non-disclosing failure categories without relaxing configuration checks. Its exact published/tested head and review outcome must be recorded in [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395); preparation is not merge, repin or successful execution.
- The previous whole-funnel [run #21](https://github.com/RobbieTall/Plannera-ab/actions/runs/35859336870) remains failed at both paid-source bridges. Do not repeat payments or replace any key based on the generic diagnostic result.
- Preserve council fixture independence, existing secrets, exact branch restrictions, required reviewers and disabled administrator bypass. No Production or main changes, database/schema mutation, stateful acceptance or deployment are part of this refinement. Production checkout must remain disabled; its live value was not freshly audited here.
- Current handover: `docs/project-memory/item78c-current-handover.md` from this diagnostic-fix PR, together with the latest Issue #395 checkpoint. Mobile feature work remains separate in PRs #422, #424, #426, #429 and #434; their checks do not prove Item 78C or authorize bulk integration.

### Desktop/mobile continuity

Read Issue #395 first, then this file from the latest diagnostic-fix PR. Do not use an older main copy or treat historical approval-pending statements below as current. Run #65 is terminal; no process needs polling or a duplicate dispatch. Both last-confirmed environment pins are `2793aef38433fdb41341c096f7b027689450f525`.

The exact blocker is that the existing safe diagnostic conflates configuration failures and did not establish which protected input failed. The approved refinement makes that category observable without exposing values. Until its reviewed replacement is integrated, pinned and executed, do not claim the invalid field, login status or original 404 cause is known.

Every meaningful save, commit, review, merge, run and blocker must be recorded in Issue #395 with exact SHA/run/attempt, actual outcome, remaining uncertainty and one next action. Reconcile these canonical documents before handoff. Write configuration names only. State which documents are on a PR versus merged acceptance or main. Mobile agents must report unavailable tools rather than asking for credentials in chat or claiming unsaved work.

The separate daytime feature handover is in [PR #434](https://github.com/RobbieTall/Plannera-ab/pull/434), `docs/project-memory/daytime-continuity-2026-09-24.md`. Preserve that work and PRs #422/#424/#426/#429; they are not part of this diagnostic fix.

### Active queue

1. Publish the narrowly scoped refinement only after trigger/deployment safety is established. Retain exact Git-deployment suppression for the new fix branch and the acceptance branch.
2. Require synthetic regression success and independent review at the exact candidate commit; report any unrun checks honestly.
3. Before integration, record the exact reviewed candidate and obtain any outstanding integration approval. Never invent a merge SHA. Repin only the two existing Preview commit variables to the actual approved acceptance commit.
4. Dispatch the registered `Item 77 protected commercial journey` on the acceptance branch with `diagnostic_only=true`, `expected_commit=<actual approved full SHA>`, and `confirmation=READ ONLY PREVIEW LOGIN CHECK`. Preserve human environment review.
5. Use only fixed reason codes to identify the failing category before asking for any secret entry. A format rejection is not proof that a key is wrong; do not weaken validation.
6. After the evidenced cause is corrected within its approval scope, separately complete independent whole-funnel acceptance, payment replay idempotency, private evidence, DPP/SEE outputs, consultant handoff and representative DOCX/PDF inspection.
7. Require the actual final `READY_FOR_NON_PRODUCTION_ACCEPTANCE` decision and stop. Production activation requires separate explicit approval.

## Historical record below (superseded operational checkpoints)

Updated: 24 September 2026 (Australia/Sydney). Operational owner: RobbieTall. Rolling evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395).

## Read this first

This checkpoint supersedes older Item 78C status and approval-pending notes. It does not certify commercial readiness. README, build-next, decision-register, commercialisation workflows and the two diagnostic runbooks now carry matching current Item78C status/handoff boundaries on this PR branch. Older sections remain historical; this update is not a full audit of every product claim. Main and the acceptance branch have not received these unmerged documentation updates.

**Decision: HOLD.** The required READY_FOR_NON_PRODUCTION_ACCEPTANCE result is not proven. Production checkout must remain disabled; no Production data/schema mutation is authorised by this work.

## Current status summary (24 September 2026)

- Decision remains HOLD; no new whole-funnel acceptance result.
- Diagnostic code reviewed at exact commit `ddead58a7014db1b8e1f68a399b8688d1d4ae88a`: separate read-only AI review found no blocking diagnostic-code defect, not a human approval or safety guarantee.
- At that commit, 25 local synthetic tests and GitHub runs [35868963262](https://github.com/RobbieTall/Plannera-ab/actions/runs/35868963262), [35868964063](https://github.com/RobbieTall/Plannera-ab/actions/runs/35868964063) and [35868963288](https://github.com/RobbieTall/Plannera-ab/actions/runs/35868963288) passed. The protected diagnostic correctly skipped on the PR event.
- Robbie approved adding an exact acceptance-branch Git deployment block and clarifying this handover. This follow-up changes only `vercel.json` and documentation; the reviewed diagnostic code is unchanged.
- The new publication SHA and any new CI results belong in Issue #395 / PR #420. Previous green checks do not certify the follow-up commit.
- Deployment suppression is configured in the draft for both the draft and exact acceptance branch. It is not installed on the acceptance branch until an approved integration includes it. Manual deployments are not blocked by this setting.
- No merge, replacement acceptance pin, live diagnostic, stateful rerun or Production action is authorised by this follow-up. Acceptance remains `1cc7d2950077f145862a36174c0cc141a9161043`.

Historical sections below record earlier checkpoints, not additional current blockers or current review results.

## Mobile agent: start here

This is a documentation handoff, not authority to merge or run anything. Read the latest Issue #395 comments, PR #420 metadata/review and this file from its current head branch `fix/item78c-session-preflight-20260923`. Do not assume the mobile app has the desktop's connectors, Chrome tabs, local files or credentials. Confirm available GitHub access first. If a write cannot be made, provide a labelled draft for Robbie; never claim it was saved.

### Evidence at handoff

- Whole-funnel decision: HOLD; run #21 failed and is terminal. Do not blindly rerun it.
- Diagnostic code reviewed: `ddead58a7014db1b8e1f68a399b8688d1d4ae88a`.
- Latest tested configuration candidate before this docs-only update: `e5374f939c586445e2a83c5b0a10852d3d8625ad`.
- All three candidate checks passed: [diagnostic contract](https://github.com/RobbieTall/Plannera-ab/actions/runs/35923603434), [preserved commercial journey](https://github.com/RobbieTall/Plannera-ab/actions/runs/35923603701), [golden gate](https://github.com/RobbieTall/Plannera-ab/actions/runs/35923603404). Protected live diagnostic skipped on PR as intended.
- PR420 remains draft, base acceptance1cc7; no merge, repin, live diagnostic, stateful rerun or Production action.
- The documentation-only update creates a new head; discover its exact SHA from current PR metadata, and distinguish those checks from the earlier candidate's checks.

### Read order

1. Issue #395 latest comments and PR #420 current head/base, review and check evidence.
2. This handover, README current-status notice, build-next current queue, decision-register current decisions and COMMERCIALISATION_WORKFLOWS current release boundary.
3. `docs/operations/item78c-session-preflight.md` and `docs/operations/item78c-session-preflight-publication.md`.
4. Exact workflow/scripts at the approved candidate only when needed. Do not use stale local copies or earlier branch/SHA instructions.

### Next permitted work and next approval

Safe now: read current state, reconcile documents, explain blockers, and prepare an exact action proposal. The next proposed package needs explicit approval: merge PR420 into the acceptance branch (not main) with both exact deployment-disable rules retained; record actual merge SHA; repin only `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT` in both existing Preview environments; run only the read-only saved-login diagnostic. Do not invent an anticipated merge SHA or reuse the old pin.

After that approval and verified prerequisites, use the registered `Item 77 protected commercial journey`, not the full Item78C acceptance. Select acceptance branch, diagnostic_only=true, expected_commit=actual approved resulting full SHA, confirmation=READ ONLY PREVIEW LOGIN CHECK. Required GitHub environment approvals still apply. No secret copying should be needed for this diagnostic. If tools cannot perform a step, state the exact limitation and leave it pending for desktop.

The safe script checks the saved session's presence, expiry and project ownership independently in each selected Preview database. Match is not proof of hosted database/auth alignment; mismatch is not permission to change ownership, fabricate data or replace keys blindly. Record only allowlisted results. Stateful acceptance remains a later separately scoped step.

### Return-to-desktop handback

Before ending a mobile session, write a privacy-minimal Issue395 checkpoint and update this handover/queue/decisions if state changed. Include exact current branch/head/base/pins and PR status; every action actually taken; all run URLs, attempt numbers and terminal or in-progress results; approvals consumed and still needed; exact blocker; one next permitted action. Identify any live run so desktop polls it rather than starting duplicates. Link the saved documentation commit. If nothing changed, say so.

Then give Robbie a short pasteable handback. Never include credentials, cookies, connection strings, private signed URLs or personal evidence. Never claim a test, save, merge or deployment occurred without actual tool evidence. The agent owns continuity; Robbie should not reconstruct the history from approvals.

## Current authoritative identity

- Acceptance branch: `accept/item-78c-byron-kempsey-20260914`.
- Acceptance commit: `1cc7d2950077f145862a36174c0cc141a9161043`.
- Latest examined run: [Item 78C #21](https://github.com/RobbieTall/Plannera-ab/actions/runs/35859336870), failed.
- Diagnostic preparation branch: `fix/item78c-session-preflight-20260923`. This is not the deployed or authorised acceptance version.
- Unrelated draft PR #419 must remain untouched.

No replacement acceptance pin has been installed. Resolve current GitHub state before taking the next action; do not silently substitute main or an older September 11 commit.

## What has been proved and what has not

Run #21 passed credential-free authorisation, target checks, private Blob persistence/cleanup, private Sandbox/ClamAV cleanup and the compiler/rendered-output test job. Both council durable bridge jobs failed at `stripe_paid_source` with `application_request_failed`. Consultant handoff and the final release decision were skipped.

Vercel runtime evidence showed two HTTP 404 responses from POST `/api/planning-pack/status`. The hosted Preview was at the approved acceptance SHA. Source inspection shows project resolution includes authenticated-user ownership. Root cause is still unproven: saved-login mismatch, effective auth configuration and hosted/runner database alignment require discrimination. A 404 does not prove Stripe rejected payment or that a secret key is wrong.

A matching saved session in a runner database would not prove the hosted deployment uses that database or the same identity. Target validation does not prove database authentication. Synthetic test results do not prove live acceptance. Representative final council DOCX/PDF inspection and consultant handoff are still required.

## Completed setup: do not ask Robbie to repeat it

Both council QSC identifiers were corrected. Byron's encrypted Preview database secret was saved directly by Robbie and its authorised endpoint corrected. Kempsey's existing endpoint was confirmed. Secret contents were never retrieved or printed.

The existing secret NAMES needed by the diagnostic are `ITEM74H_PREVIEW_DATABASE_URL` and `PLANNERA_STRIPE_TEST_SESSION_COOKIE`. It needs no Stripe, Vercel or Blob access key, no replacement payment, and no new customer document.

## Historical checkpoint: original local preparation

Robbie approved the safe Preview troubleshooting check after a plain-English explanation. The diagnostic package was prepared in an isolated local directory, leaving other working copies intact.

Prepared files, now included in the diagnostic draft (not merged, deployed or executed):
- `scripts/item78c-session-preflight.mjs`
- `scripts/item78c-session-preflight-authorize.mjs`
- `tests/item78c-session-preflight.test.mjs`
- `tests/item78c-session-preflight-authorize.test.mjs`
- `.github/workflows/item78c-session-preflight.yml`
- `docs/operations/item78c-session-preflight.md`
- `docs/operations/item78c-session-preflight-publication.md`

Local package directory on Robbie's Mac: `item78c-session-preflight/` inside the current Codex workspace. The draft now contains these files, plus a credential-free PR contract workflow. A mobile agent can inspect them from this branch; do not mistake publication for approval or successful cloud execution.

**19 synthetic tests passed, 0 failed.** Command: `node --test tests/item78c-session-preflight.test.mjs tests/item78c-session-preflight-authorize.test.mjs`. No live credentials, network or database were used in those tests. Tests exercise injected database/Git/metadata fakes, not actual GitHub workflow execution. Workflow integration review is outstanding.

The prepared diagnostic uses a parameterised SELECT after SET TRANSACTION READ ONLY, with fixed independent council/project/Preview endpoint pairs. It checks session presence/expiry and ownership and emits only fixed codes and booleans. It does not call hosted auth endpoints, refresh sessions, create Stripe sessions, generate paid documents or upload evidence. Infrastructure can still log database connections and statements. Never claim complete absence of infrastructure side effects.

## Saved protection configuration: gap corrected

On 23 September 2026 Robbie explicitly approved strengthening both existing Preview environments. Both were saved and reloaded:
- Required reviewers: ON, RobbieTall selected.
- Administrator bypass: OFF.
- Prevent self-review: OFF; required approval does not mean independent review.
- Exactly one allowed branch, zero tags: `accept/item-78c-byron-kempsey-20260914`.
- Existing secrets, target variables and acceptance commit pins unchanged.

The diagnostic still checks actual metadata before application credentials and rechecks approved commit/target variables inside each environment. GitHub metadata access errors fail closed. No Production settings changed.

## Publication safety

Vercel is Git-connected with Automatic ignored-build behavior and no custom build/install override. A normal new branch commit could deploy. The draft now sets `git.deploymentEnabled` to false for exactly `fix/item78c-session-preflight-20260923` and `accept/item-78c-byron-kempsey-20260914`, retaining the existing functions and cron entries unchanged.

The original rule covered only the draft branch. Following the independent review and Robbie's 24 September approval, the draft also contains an exact acceptance-branch rule, to suppress its Git-triggered deployment when an approved integration includes this configuration. Neither rule changes main or Production deployment selection. It follows [Vercel's documented branch-specific configuration](https://vercel.com/docs/project-configuration/git-configuration). The complete tree/commit is created before the branch reference, so there is no intermediate new branch commit missing that rule. Inspected automatic push workflows target main or agent/item74h-pathway-check, not this draft branch. Manual deployment remains a separate action and is not authorised merely by this checkpoint.

Do not merge this branch into acceptance until publication/workflow review, final commit approval and execution prerequisites are recorded. A new workflow's dispatch availability must be established; do not assume a file present only on a non-default branch is dispatchable. No acceptance rerun or automatic promotion follows from publishing documentation.

## Next steps in order

1. Complete the approved deployment-containment follow-up and record its exact candidate SHA and CI results. The diagnostic code at ddead58a7014db1b8e1f68a399b8688d1d4ae88a has received separate read-only review; preserve all acceptance coverage.
2. Reconcile the canonical README, project-memory queue/decision register and operational runbooks using preserved full contents. Link this checkpoint; do not overwrite historical decisions or claim unexecuted work passed.
3. Confirm the registered manual launch path on the approved integrated commit. Required reviewer safeguards are already saved; do not recreate them. Before integration, record deployment containment and retain its exact branch-only scope.
4. Approve the exact reviewed replacement commit and repin both environments. Keep council fixtures independent.
5. Run the read-only saved-login diagnostic; interpret its safe result before modifying any session, ownership or database configuration.
6. Correct the genuine cause, then rerun the complete protected Item 78C acceptance.
7. Require both councils, payment replay idempotency, private evidence, DPP/SEE outputs, consultant handoff and representative DOCX/PDF inspection before READY_FOR_NON_PRODUCTION_ACCEPTANCE.
8. Stop at that non-production decision. Production activation needs separate explicit approval.

## Mandatory continuity rule

Record every meaningful action in GitHub before moving on: approval scope; exact branch/commit/run; action taken; actual result; unproven claims; configuration NAMES only; remaining blocker and next permitted action. Clearly label work local, published, reviewed, merged, deployed or executed. Issue #395 is the rolling record; repository handover/queue/decisions must be reconciled as work changes.

Never include keys, cookies, connection strings, signed private URLs or personal evidence. Do not request repeated key entry without verifying existing saved state. Do not bypass browser security or the observed blocked session-endpoint navigation. Do not invoke local keyring tooling that triggers the earlier macOS warning.

The assistant owns this continuity obligation; Robbie is not expected to reconstruct technical history from approvals.

## Historical checkpoint: original diagnostic publication

The diagnostic source, tests, manual workflow and runbooks are now proposed in draft PR #420. A separate PR-only synthetic contract workflow runs without dependencies or application credentials. At that original publication checkpoint, existing whole-funnel workflow files were unchanged. The subsequent registered Item 77 caller correction is recorded below. Local 19-test results are recorded above. At implementation commit `997461dbda07ba0302ae2515e70211640d9c5215`, GitHub's diagnostic synthetic contract passed (run 35866925459) and the existing Commercial Funnel Golden Gate passed (run 35866925281). These are synthetic/contract results, not the protected live diagnostic or full council acceptance. Review, dispatch-registration availability, reviewer safeguards, replacement-pin approval and live diagnostic execution remain outstanding. No new acceptance result has been produced.

## Historical checkpoint: original published-code CI

- [Diagnostic synthetic contract](https://github.com/RobbieTall/Plannera-ab/actions/runs/35866925459): PASS, including the test execution step, at `997461dbda07ba0302ae2515e70211640d9c5215`.
- [Commercial Funnel Golden Gate](https://github.com/RobbieTall/Plannera-ab/actions/runs/35866925281): PASS at that same implementation commit.
- Post-publication Vercel query from 23 September 2026 12:55 UTC returned no deployments at observation time.
- GitHub connector refused the manual-workflow metadata URL; this is not evidence that the workflow is absent or dispatchable. Registration still needs an authorised supported UI/API check.
- At the earlier CI checkpoint protection settings were unchanged; the later approved correction is recorded above. No merge, pin change, database diagnostic or stateful rerun has occurred. Independent review has not been obtained; do not describe this draft as independently reviewed.

## Historical checkpoint: approved dispatch-wiring correction

Robbie approved using the already registered Item 77 protected commercial journey instead of assuming the new standalone manual workflow was registered. Its original main and acceptance blob was confirmed identical (20a32d8aed4e1dda7886b0144f42eb4386e381c9). Draft PR #420 now proposes optional diagnostic_only=true forwarding to a same-commit reusable workflow, with no caller application secrets. Original PR/default manual test steps are retained. The new wiring regression tests supplement the original 19 synthetic tests. All 25 synthetic tests passed locally with no live credentials or network, including six new dispatch-wiring regressions. The first shell invocation lacked node on PATH and performed no tests; rerunning with the existing /usr/local/bin/node succeeded. GitHub CI and live dispatch for this correction remain to be observed.

Both reviewer safeguards are completed. Remaining sequence: validate/review this correction, establish merge-to-acceptance deployment safety, approve the exact replacement commit/pins, then run the bounded read-only diagnostic. No merge, repin, live diagnostic, stateful rerun or Production action has occurred. Main remains untouched. The 404 cause and Item 78C readiness remain unproven.
