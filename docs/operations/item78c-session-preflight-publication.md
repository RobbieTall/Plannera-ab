# Item 78C diagnostic publication boundary

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
