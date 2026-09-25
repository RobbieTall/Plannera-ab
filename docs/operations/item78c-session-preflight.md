# Item 78C saved-login diagnostic

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

### Non-disclosing configuration reasons

The diagnostic retains its `item78c_session_preflight.v1` output shape. The added reasons report only a fixed category, never a credential value, length, URL, hostname from input, token, raw error, or database row.

| Reason | Field/category to inspect inside the protected environment |
| --- | --- |
| `configuration_council_invalid` | Fixed workflow council selection |
| `configuration_confirmation_invalid` | Exact read-only confirmation |
| `configuration_branch_invalid` | Exact acceptance branch |
| `configuration_commit_invalid` | Exact expected commit and executing commit |
| `database_url_missing` / `database_url_invalid` | Database URL availability or parseability |
| `database_protocol_invalid` / `database_port_invalid` / `database_name_invalid` | Required Postgres protocol, port and database name |
| `database_target_mismatch` | Fixed council-specific Preview endpoint |
| `database_credentials_missing` | URL username/password components present, not whether they authenticate |
| `database_fragment_forbidden` | Forbidden URL fragment |
| `database_tls_invalid` | Required TLS mode |
| `database_options_invalid` | Unknown or duplicated connection option |
| `session_cookie_missing` | Saved cookie availability |
| `session_cookie_format_invalid` / `session_cookie_value_invalid` | Existing header/value format limits |
| `session_cookie_duplicate` / `session_cookie_conflict` | Ambiguous session cookie names or values |
| `configuration_invalid` | Unexpected configuration exception; do not expose the exception |

Every new configuration reason requires `matched=false`, `council=null`, `checks=null`. It exits before the database adapter. The existing `nextauth_cookie_missing`, session/project reasons, fixed database errors and read-only transaction are preserved. The emitter independently allowlists the reasons and rejects added fields, injected strings or false-success summaries. Synthetic cases cover both councils and the CLI without live credentials or network. These tests do not prove real credentials, PostgreSQL behavior or hosted alignment.

### Active queue

1. Publish the narrowly scoped refinement only after trigger/deployment safety is established. Retain exact Git-deployment suppression for the new fix branch and the acceptance branch.
2. Require synthetic regression success and independent review at the exact candidate commit; report any unrun checks honestly.
3. Before integration, record the exact reviewed candidate and obtain any outstanding integration approval. Never invent a merge SHA. Repin only the two existing Preview commit variables to the actual approved acceptance commit.
4. Dispatch the registered `Item 77 protected commercial journey` on the acceptance branch with `diagnostic_only=true`, `expected_commit=<actual approved full SHA>`, and `confirmation=READ ONLY PREVIEW LOGIN CHECK`. Preserve human environment review.
5. Use only fixed reason codes to identify the failing category before asking for any secret entry. A format rejection is not proof that a key is wrong; do not weaken validation.
6. After the evidenced cause is corrected within its approval scope, separately complete independent whole-funnel acceptance, payment replay idempotency, private evidence, DPP/SEE outputs, consultant handoff and representative DOCX/PDF inspection.
7. Require the actual final `READY_FOR_NON_PRODUCTION_ACCEPTANCE` decision and stop. Production activation requires separate explicit approval.

## Historical record below (superseded operational checkpoints)

## Handoff checkpoint - 24 September 2026

Current decision: HOLD. Read `../project-memory/item78c-current-handover.md` from PR420's current head and Issue #395 before acting. Configuration candidate e5374f939c586445e2a83c5b0a10852d3d8625ad passed all three examined PR checks; the live diagnostic has not run. A later documentation-only head must not be confused with that tested SHA.

Robbie's latest request is to update documentation and prepare mobile continuity, not an unambiguous merge/repin/execution approval. The proposed next approval package and exact manual inputs are in the handover. Existing reviewer protections, credentials and council fixtures must be preserved. No Production, main, database/schema or checkout action is authorised. Mobile tools may differ from desktop; report access limitations instead of requesting credentials in chat or claiming unsaved work is complete.


Status: proposed in draft PR #420; not approved for cloud execution. See ../project-memory/item78c-current-handover.md and Issue #395 for the current acceptance decision.

## Purpose

Check whether the existing protected NextAuth cookie identifies an unexpired Session owning the fixed council project in that council's explicitly selected Preview database. This is not whole-funnel acceptance. A successful match does not prove that the deployed app uses the same database or effective auth configuration.

The script executes one parameterised SELECT inside a transaction which first sets READ ONLY. It does not call hosted authentication endpoints, refresh sessions, create Stripe sessions, upload files, run migrations or generate paid documents. Database connection/audit logs and transient connections may still occur. Only fixed reason codes and booleans are returned. Database driver errors and private rows are not printed.

## Protection requirements

The manual workflow is separate from credential-free PR contract tests. Before using application credentials it verifies exact dispatch/HEAD commit evidence, rejects commits reachable from main, reads both council environments' protection metadata, and requires required reviewers, disabled administrator bypass and only the exact acceptance branch (no wildcard or tag rule). The protected job repeats the checks and compares the existing ITEM74H_WORKFLOW_AUTHORIZED_COMMIT and ITEM74H_AUTHORIZED_DATABASE_TARGET variables. Failure to read metadata means stop, not assume protection.

The GitHub built-in token requires contents:read and actions:read only. The application secrets ITEM74H_PREVIEW_DATABASE_URL and PLANNERA_STRIPE_TEST_SESSION_COOKIE are exposed only to the final diagnostic step. No new secret, Stripe key or Vercel key is needed. Inputs travel through environment variables, not shell interpolation. Dependency installation disables lifecycle scripts and receives no application credentials. Prisma generation has a synthetic URL. Raw output is not uploaded or printed; a separate fixed-shape validator controls emitted summaries and temporary output is removed.

## Execution prerequisites

Do not run locally with live credentials. Do not dispatch from the draft branch. Establish workflow registration/dispatch availability, reviewed code, the replacement exact acceptance SHA and actual saved protections first. The fixed execution branch is accept/item-78c-byron-kempsey-20260914. Supply the reviewed full expected_commit and READ ONLY PREVIEW LOGIN CHECK confirmation. Updating environment pins requires the reviewed replacement commit; no pin changes automatically because the draft is published.

On 23 September 2026, after Robbie's explicit approval, both environment reviewer gates were enabled with RobbieTall selected and administrator bypass disabled. Saved settings were reloaded and confirmed. Prevent self-review remains off; this is not independent review. Each exact acceptance-branch restriction, secret and commit pin was preserved. The workflow rechecks metadata at execution rather than trusting this checkpoint.

## Result interpretation

- session_missing / session_expired: the stored login is absent or expired in this selected database. Establish correct target and login before replacing a cookie.
- session_owner_mismatch: login and project owner differ here; do not change ownership just to pass.
- project_missing: check target alignment; do not fabricate a fixture.
- session_project_match: match only in this database, not evidence of hosted configuration or full acceptance.
- nextauth_cookie_missing: an np_session anonymous cookie is not sufficient.
- configuration/database/summary failure: stop without printing raw errors or widening the endpoint allowlist.

## Synthetic tests

`node --test tests/item78c-session-preflight.test.mjs tests/item78c-session-preflight-authorize.test.mjs tests/item78c-session-preflight-wiring.test.mjs`

Tests require no dependencies, live secrets or network; they inject fake Git, metadata and database adapters. They do not prove real workflow credentials, PostgreSQL behaviour, remote login or deployment safety. PR contract CI runs this command without package installation or protected environments. Final application acceptance and representative DOCX/PDF inspection remain outstanding.

## Registered launch path (proposed, not executed)

The existing `.github/workflows/item77-protected-commercial-journey.yml` exists on main and acceptance (observed original blob 20a32d8aed4e1dda7886b0144f42eb4386e381c9). Its optional `diagnostic_only=true` dispatch mode calls the diagnostic locally at the same commit. Default dispatch and PR events retain every original commercial test step; only explicit diagnostic mode skips them. Do not use the new standalone workflow's UI registration as a prerequisite and do not change main to register it.

After code review, safe acceptance-branch integration and approval of the replacement exact pin, dispatch the registered Item 77 protected commercial journey on the acceptance branch with diagnostic_only=true, expected_commit=<reviewed full SHA>, confirmation=READ ONLY PREVIEW LOGIN CHECK. The caller passes no application secrets. The reusable workflow uses its own protected environment secrets after credential-free authorisation and human approval. This follows https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows . A supported dispatch and real execution are still unproven; static wiring tests cannot prove GitHub's service-side behaviour.
