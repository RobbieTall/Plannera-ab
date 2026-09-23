# Item 78C current desktop/mobile handover

Updated: 23 September 2026. Operational owner: RobbieTall. Rolling evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395).

## Read this first

This checkpoint supersedes older Item 78C status and approval-pending notes. It does not certify commercial readiness. Older README, build-next, decision-register and commercialisation/runbook checkpoints have not all been reconciled; do not treat them as proof of completed acceptance. Their existing content is preserved.

**Decision: HOLD.** The required READY_FOR_NON_PRODUCTION_ACCEPTANCE result is not proven. Production checkout must remain disabled; no Production data/schema mutation is authorised by this work.

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

## Approved work and local preparation

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

## Saved protection configuration: confirmed gap

Read-only GitHub settings inspection found BOTH council environments configured as follows:
- Required reviewers: OFF.
- Administrator bypass: ON.
- Exactly one allowed branch, no tags: `accept/item-78c-byron-kempsey-20260914`.

The existing branch restriction is real, but required-reviewer protection was not enabled. Earlier shorthand describing these environments as protected must not be read as confirmation of that missing gate. These settings were not changed during inspection. This is a separate safety gap, not a proven cause of the 404.

The draft manual workflow deliberately refuses to proceed until required reviewers are configured, administrator bypass is disabled, and the exact branch-only rule remains. It checks Git evidence and both environment metadata sets before application credentials, then rechecks the existing approved commit/target variables inside the selected environment. The built-in GitHub token needs contents:read and actions:read. Metadata errors fail closed. Do not broaden branch rules or weaken checks to make the diagnostic run.

## Publication safety

Vercel is Git-connected with Automatic ignored-build behavior and no custom build/install override. A normal new branch commit could deploy. This checkpoint therefore adds `git.deploymentEnabled["fix/item78c-session-preflight-20260923"] = false` in vercel.json, retaining the existing functions and cron entries unchanged.

This rule applies only to the draft branch, not main or the acceptance branch. It follows [Vercel's documented branch-specific configuration](https://vercel.com/docs/project-configuration/git-configuration). The complete tree/commit is created before the branch reference, so there is no intermediate new branch commit missing that rule. Inspected automatic push workflows target main or agent/item74h-pathway-check, not this draft branch. Manual deployment remains a separate action and is not authorised merely by this checkpoint.

Do not merge this branch into acceptance until publication/workflow review, final commit approval and execution prerequisites are recorded. A new workflow's dispatch availability must be established; do not assume a file present only on a non-default branch is dispatchable. No acceptance rerun or automatic promotion follows from publishing documentation.

## Next steps in order

1. Publish and review the prepared diagnostic code and workflow without triggering an application deployment. Preserve all existing acceptance coverage.
2. Reconcile the canonical README, project-memory queue/decision register and operational runbooks using preserved full contents. Link this checkpoint; do not overwrite historical decisions or claim unexecuted work passed.
3. Establish manual-workflow dispatch availability and required environment protections. Record actual saved settings, not intent.
4. Approve the exact reviewed replacement commit and repin both environments. Keep council fixtures independent.
5. Run the read-only saved-login diagnostic; interpret its safe result before modifying any session, ownership or database configuration.
6. Correct the genuine cause, then rerun the complete protected Item 78C acceptance.
7. Require both councils, payment replay idempotency, private evidence, DPP/SEE outputs, consultant handoff and representative DOCX/PDF inspection before READY_FOR_NON_PRODUCTION_ACCEPTANCE.
8. Stop at that non-production decision. Production activation needs separate explicit approval.

## Mandatory continuity rule

Record every meaningful action in GitHub before moving on: approval scope; exact branch/commit/run; action taken; actual result; unproven claims; configuration NAMES only; remaining blocker and next permitted action. Clearly label work local, published, reviewed, merged, deployed or executed. Issue #395 is the rolling record; repository handover/queue/decisions must be reconciled as work changes.

Never include keys, cookies, connection strings, signed private URLs or personal evidence. Do not request repeated key entry without verifying existing saved state. Do not bypass browser security or the observed blocked session-endpoint navigation. Do not invoke local keyring tooling that triggers the earlier macOS warning.

The assistant owns this continuity obligation; Robbie is not expected to reconstruct technical history from approvals.

## Diagnostic publication update

The diagnostic source, tests, manual workflow and runbooks are now proposed in draft PR #420. A separate PR-only synthetic contract workflow runs without dependencies or application credentials. Existing whole-funnel workflow files are unchanged. Local 19-test results are recorded above; await the published-commit CI result before claiming that CI passed. Review, dispatch-registration availability, reviewer safeguards, replacement-pin approval and live diagnostic execution remain outstanding. No new acceptance result has been produced.
