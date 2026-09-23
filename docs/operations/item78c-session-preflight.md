# Item 78C saved-login diagnostic

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
