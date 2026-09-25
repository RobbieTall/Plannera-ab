# Item 78C diagnostic publication boundary

## Current Item 78C handover - 2026-09-25: independent hosted targets proven

This checkpoint supersedes earlier prepared/not-deployed alignment status below.

- PR #444 passed its two CI checks and merged into acceptance only. The focused contract suite passed 60 synthetic tests and its TypeScript check; the Golden Gate also passed.
- Both protected Preview deployments are READY and their guarded builds completed. The bounded no-database-query runtime diagnostic independently returned the expected council classification for each deployment.
- Kempsey application commit: `87de1a054ed75290ff9d58e566cf37220f1de406`. Byron application commit: `732de603021a3474222927ffbe34bac7a30b70f5`. Their reviewed file tree is identical: `7e6d1b3677c4fd8d2291e79ce3da7383959bfd10`. Byron's no-file-change commit resolves Vercel's ambiguous branch selection; these are not the same SHA.
- Existing independent databases were reused. No database credentials were revealed or copied, and no Production or schema mutation was performed.
- Byron's GitHub test base URL and allowed-base URL were still pointing at the other app. The attempted correction reached GitHub's fresh identity check; do not record either save as completed until its saved row confirms the new address.
- Byron-only sign-in URL and explicit checkout-off configuration were saved in Vercel after its initial deployment. A new deployment is required before claiming those saved changes are active.
- Byron's branch-scoped Stripe test configuration remains incomplete. Verify saved state before requesting any manual secret entry. Do not duplicate completed setup or enable checkout merely to bypass a missing configuration check.
- The operator confirmed Stripe's authorization-success screen and explicitly requested no more Stripe connector/OAuth access prompts. Do not retry that connector or initiate reauthorization; use the existing signed-in dashboard when needed.
- Workflow/environment acceptance pins remain unchanged. Hosted target classification does not prove database contents, alternative-project eligibility, payment idempotency, private evidence, output quality or consultant handoff.
- Next: complete the two non-secret GitHub URL updates after normal identity confirmation; finish missing branch-only test configuration; redeploy only the reviewed Preview; confirm fixture boundaries and exact execution pins before a separately authorised whole-funnel rerun.
- Decision: HOLD. The whole-funnel gate has not been rerun or passed. Production checkout remains disabled and `main` remains unchanged. Remove the temporary Preview-only guard/diagnostic before any future Production integration; its existing expiry is 2026-09-28 UTC.
- Issue #395 is the privacy-minimal continuity record. Never publish credentials, tokens, connection strings, private project identifiers, document contents or raw authenticated logs.


## Latest Item 78C checkpoint - 2026-09-25

This checkpoint supersedes earlier prepared/not-deployed status below.

- PR #442 merged into the acceptance branch only; deployed application commit: `58d7a6b8ac9dce082c648d35b18811bfd42fcbf2`. `main` was not changed.
- All three candidate CI checks passed, including 57 synthetic tests and the focused TypeScript check. The guarded Vercel Preview build completed successfully and the deployment is READY.
- The approved bounded runtime diagnostic completed successfully and confirmed a Preview application/test-target mismatch. No project records were read by the diagnostic and no database/schema mutation was performed.
- This result does not establish the sole cause of the earlier HTTP 404, prove the alternate-project fixture, or pass whole-funnel acceptance.
- Next: correct independent Preview application/runner alignment, then prove the remaining fixture boundaries before a separately authorised whole-funnel rerun. Do not rerun with mismatched targets or silently merge council fixtures.
- Workflow/environment acceptance pins were not changed by this deployment. Do not assume the workflow pin equals the deployed application commit.
- Decision: HOLD. Production checkout remains disabled; no Production settings, data, or schema were changed. The temporary diagnostic expires on 2026-09-28 UTC and must not be carried into Production.
- Issue #395 remains the privacy-minimal continuity record. No credentials, connection strings, endpoint labels, private project identifiers, or document contents belong in public status notes.


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

### Publication and execution boundary for this refinement

The new branch is `fix/item78c-config-reasons-20260925`, based exactly on acceptance `2793aef38433fdb41341c096f7b027689450f525`. Its initial complete commit must contain the new exact `git.deploymentEnabled=false` entry before the branch reference exists. Preserve the existing two exclusions and all functions/crons. No manual deployment is authorized.

Repository trigger review and final-patch review are separate. Confirm the linked project's configuration and relevant external integrations before publication; repository settings cannot prove that arbitrary third-party automation is absent. Record that evidence and any limitation in Issue #395. This is Git-deployment containment, not a guarantee about dependency behavior, manual deploy hooks, infrastructure audit logs or process isolation. No new cloud setting, credential, environment or fixture is needed.

The registered diagnostic dispatch path was proven to launch in run #65; the diagnostic's database query and saved-login/ownership outcome were not proven. Live diagnostic success would still not certify the deployed app's configuration or the full customer journey.

## Historical record below (superseded operational checkpoints)

## Handoff checkpoint - 24 September 2026

Current decision: HOLD. Read `../project-memory/item78c-current-handover.md` from PR420's current head and Issue #395 before acting. Configuration candidate e5374f939c586445e2a83c5b0a10852d3d8625ad passed all three examined PR checks; the live diagnostic has not run. A later documentation-only head must not be confused with that tested SHA.

Robbie's latest request is to update documentation and prepare mobile continuity, not an unambiguous merge/repin/execution approval. The proposed next approval package and exact manual inputs are in the handover. Existing reviewer protections, credentials and council fixtures must be preserved. No Production, main, database/schema or checkout action is authorised. Mobile tools may differ from desktop; report access limitations instead of requesting credentials in chat or claiming unsaved work is complete.


Draft PR #420 targets the existing acceptance branch, not main. The draft branch is fix/item78c-session-preflight-20260923. After Robbie's approval on 24 September 2026, its vercel.json disables Git deployments for that exact draft branch AND accept/item-78c-byron-kempsey-20260914. The second rule is intended to suppress the acceptance branch's automatic Git deployment when an approved integration includes it. The target branch is not changed merely by publishing this draft. Existing application functions and cron configuration is retained. Main, the active acceptance branch and existing authorised pins are unchanged by publication.

The deployment-disable rule follows https://vercel.com/docs/project-configuration/git-configuration . The initial complete Git tree/commit existed before the branch reference was created, so there was no intermediate new-branch commit without the rule. The inherited workflow push triggers were inspected at the base acceptance SHA; they target other named branches. A post-initial-publication Vercel list query returned zero deployments for the examined time window. This is a point-in-time observation, not protection against a later manual deployment or merging into a differently configured branch.

The diagnostic workflow is manual or reusable-call only; its registered caller selects it only for explicit manual diagnostic mode. Its separate PR contract workflow has no package installation, protected environment or application secrets. Publishing tests does not dispatch the real diagnostic. Existing whole-funnel coverage is not replaced or weakened.

The standalone manual workflow was confirmed absent on main and cannot be assumed dispatchable. Robbie approved integrating a diagnostic-only mode in the already registered item77-protected-commercial-journey.yml. This draft proposes that integration without changing main, retaining original contract steps and exact-commit protections. Live dispatch remains unexecuted.

Initial inspection found reviewer gates missing. Following explicit approval on 23 September 2026, both councils now have RobbieTall as required reviewer and administrator bypass disabled; saved settings were reloaded and confirmed. Prevent self-review is off. Each exact branch rule and all secrets/pins remain unchanged. The diagnostic rechecks those now-saved protections before application credentials. Required API metadata access: https://docs.github.com/en/rest/deployments/environments and https://docs.github.com/en/rest/deployments/branch-policies .

Before merge/repin/run: complete review and CI, preserve canonical project-memory history, establish publication and dispatch safety, record protection settings actually saved, record exact approved SHA, then run the bounded diagnostic. Do not run stateful acceptance unchanged or activate Production checkout. Issue #395 is the rolling evidence record and docs/project-memory/item78c-current-handover.md is the repository handover.

## Independent review and containment limits

A separate read-only AI review of ddead58a7014db1b8e1f68a399b8688d1d4ae88a found no blocking diagnostic-code defect, but held merge because suppression covered only the draft branch. The approved follow-up adds the exact acceptance-branch false entry while retaining the draft entry and all other Vercel configuration. No wildcard, Production/main rule, cloud setting, secret or pin is changed. The original review and 25-test/three-CI PASS evidence remain tied to ddead58; the follow-up candidate must be identified separately in Issue #395.

This configuration addresses Git-triggered deployments, not manual deployments, deploy hooks, other integrations or dependency-code isolation. Do not manually deploy as part of the diagnostic. Prisma generation shares a runner/workspace with the later credentialed step; synthetic generation configuration and disabled install lifecycle scripts are credential scoping, not a sandbox guarantee. No concrete malicious dependency behaviour was identified. GitHub service-side dispatch, PostgreSQL execution and hosted authentication/database alignment remain unproven.

Approval for this configuration/documentation follow-up is not merge, repin or execution approval. Keep main and Production untouched. Before any later integration, retain both exact suppression rules, record the resulting acceptance SHA, and do not equate a GitHub mergeable flag with successful review or operational acceptance.
