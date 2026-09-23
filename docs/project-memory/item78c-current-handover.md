# Item 78C current desktop/mobile handover

Updated: 24 September 2026 (Australia/Sydney). Operational owner: RobbieTall. Rolling evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395).

## Read this first

This checkpoint supersedes older Item 78C status and approval-pending notes. It does not certify commercial readiness. Older README, build-next, decision-register and commercialisation/runbook checkpoints have not all been reconciled; do not treat them as proof of completed acceptance. Their existing content is preserved.

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
