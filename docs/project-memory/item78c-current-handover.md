## Current Item 78C checkpoint - 2026-09-28: substantive checks passed; final reporting correction

This checkpoint supersedes older setup and next-action instructions below. Historical evidence is preserved, not an instruction to repeat work.

- Overall decision: **HOLD**. Do not claim READY_FOR_NON_PRODUCTION_ACCEPTANCE or commercial launch approval yet.
- [Whole-funnel run 36402055740, attempt 2](https://github.com/RobbieTall/Plannera-ab/actions/runs/36402055740/attempts/2) at immutable runner commit `fcd0c27c68daea81bd51e28b567e469a5fe6b97a` records successful credential-free authorization, independent BYRON and KEMPSEY paid/evidence/working-SEE jobs, canonical SEE compiler/rendering tests, and protected consultant handoff. Council and compiler successes were retained from the earlier attempt; consultant handoff passed in attempt 2.
- The final release-decision job failed during setup because its pinned upload action did not exist. It did NOT compute or publish a decision. The corrected official actions/upload-artifact v7.0.1 commit is `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`; the previous reference incorrectly ended in `0b`. This correction changes that single character only in executable workflow content; safeguards and acceptance coverage are unchanged.
- [Preview referral repair run 36409088185](https://github.com/RobbieTall/Plannera-ab/actions/runs/36409088185) succeeded at `87e0175d485c418a06b5b062b44aef553ee0ed87`, including 37 synthetic tests, source binding, original preservation and replacement validation. The protected Kempsey review reference was updated; the subsequent consultant acceptance passed. Do not regenerate the review or recreate payments merely because historical instructions say preparation is pending.
- Existing independent paid test fixtures and saved credentials remain in place. No new secret entry or payment is required for this reporting correction. Check actual saved state before requesting anything again.
- The corrected runner is the successor commit containing this checkpoint on `accept/item-78c-byron-kempsey-20260914`. The old commit and run remain immutable evidence. The diagnostic branch keeps its own preparation/repair history; neither branch is a Production release.
- Next: record the successor's full SHA in Issue #395, authorize that exact SHA in both protected Preview environments, retain required human approval and exact branch restrictions, then dispatch the whole-funnel workflow with matching expected_commit. Re-running the old failed run would use the old broken reference. Existing successful evidence remains historical evidence, not proof that a new run passed.
- Still required: successful computed/uploaded final decision and representative DOCX/PDF visual inspection. Passing automated rendering tests is not visual inspection. After those gates, separately reconcile launch integration, expired temporary diagnostic/build guards and any unresolved workspace or webhook-routing issues. Research Viewer remains after commercial gates and prerequisite fixes; this change does not expand scope.
- Production checkout must remain disabled. This correction does not alter Production settings, data, schema, hosted deployments, keys, payments or refunds, and does not merge to main. The Preview runner's checkout flags remain false. No fresh read of Production configuration is claimed.
- Publication safety: automatic Vercel Git deployment is disabled for the acceptance branch; install lifecycle scripts are disabled and the existing temporary build wrapper has expired and fails closed. Reviewed workflow triggers do not run stateful acceptance on this branch push. Do not extend the wrapper or deploy to bypass its expiry.
- Mobile/desktop continuation: start with this checkpoint and Issue #395; distinguish the runner SHA from hosted application SHAs. Preserve council separation, original artefacts, concurrent work and all older evidence. Publish only safe run references and results, never credentials, cookies, private fixture identifiers, document contents or authenticated URLs.

## Current status - 28 September 2026: preparation implementation reviewed; execution pending

- The approved retry correction is implemented. Offline validation: **77 tests passed, 0 failed**; the workflow YAML also parsed successfully.
- Follow-up independent review recommends publication with no remaining blocking findings in its reviewed scope. The reviewer checked the supplied unchanged service APIs but did not independently rerun tests or execute live integrations.
- This package is the reviewed replacement-purchase PREPARATION implementation, not evidence of created Checkouts, completed payments, webhook delivery or whole-funnel acceptance. Overall decision remains **HOLD**.
- Next action: inspect/set the separate non-secret `ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT` in both existing council Preview environments to this package's published commit, then manually dispatch the explicit preparation mode and approve its protected jobs. The exact commit and handoff are recorded in [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395). Do not change the existing acceptance or diagnostic pins or recreate saved secrets.
- Production checkout must remain disabled. No Production, main, acceptance snapshot, deployment, schema, refund or payment action is included in publication.

The implementation/review history below is retained; this status and the latest Issue #395 checkpoint supersede older next-action instructions.

## 28 September 2026: approved retry-safety correction

The replacement preparer now refuses a PAID database purchase paired with an open/unpaid provider Checkout, before any provider-reference attachment or payment handoff. Regression cases cover both present and absent provider references. This corrects the independent-review finding recorded in Issue #395; revalidation and follow-up review are required before publication/execution. The prior 75-test result predates these two added cases. No replacement payment or acceptance success is implied.

## Current checkpoint - 28 September 2026: separate replacement preparation runner

This checkpoint supersedes older next-action instructions without deleting history.

- The approved two-purchase repair now has a separate preparation implementation and synthetic regression suite; see [replacement test-purchase runbook](../operations/item78c-test-purchase-preparation.md). From the operations directory use `item78c-test-purchase-preparation.md`.
- Run #73 remains diagnostic success with BOTH councils `saved_proposal_mismatch`, not acceptance success. Original paid purchases and entitlements must remain intact.
- The preparation mode uses its OWN exact commit pin `ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT` in both protected environments. Do not move the acceptance pin or read-only diagnostic pin.
- Source/testing/publication progress and the exact reviewed preparation SHA are recorded in Issue #395. Code presence is not evidence that purchases were created or paid. No replacement execution or final acceptance is claimed by this checkpoint.
- Next: finish synthetic validation and independent review, publish only to the contained diagnostic branch, configure the new exact pin after checking existing saved settings, then use the protected manual preparation mode. Test-payment handoff follows only after both safe preparation results.
- Item 78C remains HOLD. Both replacement payments, complete whole-funnel tests and representative output review remain unproven. Production checkout remains required disabled; no Production setting/data/schema changes.

## Current checkpoint - 28 September 2026: replacement test purchases approved, not executed

This checkpoint supersedes older next-action instructions below. Preserve the historical records and immutable acceptance snapshot.

- Read-only purchase reconciliation [run #73](https://github.com/RobbieTall/Plannera-ab/actions/runs/36379535529) at diagnostic commit `122b55845e2c1e081c0e47bede98f286586b2b68` completed successfully for BOTH councils. Both results are `saved_proposal_mismatch`, not acceptance success.
- Existing paid test purchases, ACTIVE entitlements, ownership, saved sessions, configured QSCs and product/price checks passed. The saved test proposal does not match the paid fingerprint; the corresponding exact purchase and entitlement checks therefore fail. No key rotation or entitlement rewrite is justified.
- Bounded SELECT-only comparison of each council's existing project descriptions/titles/names, artefact payload strings/notes, user chat and pathway inputs found no matching original paid description. This is not a claim that no original exists elsewhere. Do not substitute older memo text or invent a recovered description.
- Robbie explicitly approved one replacement Sandbox test purchase per council, using the existing saved proposal and matching DPP request settings. Preserve all old paid records. This approval does not permit real charges, refunds, Production operations, schema changes or changed acceptance assertions.
- Preparation is a separate, stateful operation and requires its own exact-commit permission and explicit confirmation. The read-only diagnostic pin is NOT write authorization. The generic `Stripe test session preparation` workflow currently targets the older main/ops environment and must not be dispatched unchanged for Item 78C.
- A protected preparation draft is being built around the unchanged normal checkout services, with retry-safe recovery, strict test-key/account/target checks and private handoff. It has NOT been executed. No replacement session or payment is yet proven. Independent design review is not an implementation review.
- The fixed hosted application tree and frozen runner have identical source blobs and relevant package/lock/schema/TypeScript configuration (458 compared entries). Both fixed Preview deployments remain READY at the recorded SHAs. Historical council target-classification evidence is retained; the expired target diagnostic was not extended or bypassed. Static source identity does not prove every runtime effect.
- Keep `accept/item-78c-byron-kempsey-20260914` and acceptance SHA `fcd0c27c68daea81bd51e28b567e469a5fe6b97a` unchanged. Do not merge new preparation work into main or the frozen acceptance branch, redeploy the app, or repin stateful acceptance for this preparation.
- The next live action requires a reviewed preparation candidate, verified publication containment, separate saved authorization, and both normal GitHub human environment approvals. After actual test payment/webhook linkage, update only the existing council session-reference secret with independently verified association, then rerun unchanged acceptance and inspect representative outputs.
- Production checkout must remain disabled. No Production configuration/data/schema change, real charge or refund was performed. Overall decision: **HOLD**.
- [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395) remains the live execution ledger. It records approval and results without secret values, cookies, proposal text, purchase/session identifiers or private Checkout URLs.

## Current checkpoint - 28 September 2026: paid-scope comparison

This checkpoint supersedes older next-action instructions below; historical evidence is preserved.

- Protected run [36371024396](https://github.com/RobbieTall/Plannera-ab/actions/runs/36371024396), diagnostic SHA 43c77a384cb4a29f22d04a54798584e3757c171c, completed both council comparisons. Both exact scopes returned available rather than paid. Changed-proposal and other-project cases also returned available; no request errors occurred. Green diagnostic jobs are NOT acceptance success.
- Independent read-only Preview database checks confirm existing PAID purchases and matching ACTIVE entitlements, valid ownership/scope keys, one configured QSC per fixture and no DPP. No data or secret was changed. The older SEE memo proposal does not match the paid proposal and must not be used to replace the saved test input.
- The next candidate adds a separate default-off scope_reconcile_only mode to the existing registered Item 77 workflow on diag/item78c-paid-scope-20260928. It compares saved session, checkout reference, proposal, QSC, product and entitlement fields using fixed parameterized read-only SQL. It prints only booleans and fixed reasons, never secret values, identifiers, hashes or proposal text. Preparation is not execution.
- Use Issue #395 for the exact published candidate, synthetic-test/review evidence and live result. Before running this NEW mode, both separate diagnostic pins must authorize that exact reviewed SHA; preserve all existing secrets and acceptance pins. Select ONLY scope_reconcile_only, with expected_commit and READ ONLY PREVIEW SCOPE CHECK. Human approval of both environments remains required.
- Frozen stateful acceptance remains accept/item-78c-byron-kempsey-20260914 at fcd0c27c68daea81bd51e28b567e469a5fe6b97a. Main and both hosted deployments are unchanged. No payment, refund, migration or checkout activation is part of reconciliation.
- The diagnostic expiry remains 2026-09-30T00:00:00Z. The older hosted build/target guard has expired and is not extended. No hosted build is needed for this mode.
- Decision: HOLD. After the specific mismatch is corrected, whole-funnel paid replay, DPP/SEE, consultant handoff and representative DOCX/PDF review are still required. Production checkout stays disabled. Remove only the temporary diagnostic branch rules and diagnostic pins after investigation, before using the legacy saved-login mode.

# Item 78C current desktop/mobile handover

## Latest Item 78C checkpoint - 2026-09-27: Byron sign-in repaired; acceptance still HOLD

This checkpoint supersedes the older sign-in and redeployment instructions below. Historical records are retained.

- A missing Byron branch-specific `APP_URL` override was identified. The deployed email helper prioritises `APP_URL` over `VERCEL_URL`; changing `NEXTAUTH_URL` alone did not establish the magic-link origin. The inherited value was not exposed or independently read.
- Robbie saved `APP_URL` for `accept/item-78c-byron-repaired-20260919` only, with Production excluded. No other council's configuration was substituted.
- Replacement Byron Preview deployment `dpl_HyncdptgBatoinZPEex5L44XN3uc` is READY at application SHA `732de603021a3474222927ffbe34bac7a30b70f5`. The protected no-query diagnostic returned HTTP 200 / BYRON. Build-log retrieval was unavailable for this deployment; do not attribute the previous deployment's explicit BUILD_PASSED marker to it.
- A fresh interactive sign-in now reaches authenticated My Projects on the correct repaired Byron Preview, with five saved workspaces visible. This observed journey resolves the prior main-origin redirect symptom. Do not repeat APP_URL, key entry or sign-in setup without a new specific failure.
- Interactive sign-in and a project list do not prove designated fixture access, saved runner-cookie validity, alternative-project ownership, QSC eligibility, purchase linkage, signed webhook delivery, payment idempotency, private evidence, SEE/DPP output quality or consultant handoff.
- Source inspection confirms the existing saved-login diagnostic checks only its fixed primary project/session relationship. It cannot establish alternative-project, QSC or purchase eligibility. Do not substitute another repetition of that diagnostic for whole-funnel evidence.
- Acceptance runner branch was reconciled at `c2518158db07bc1c4e74b75836748e746e0ab0bb` before this documentation update. The last audited protected pins still named `077d0e5d48fb6ab49fb7c5acc8cfa70668270f4d`; they were not changed in this checkpoint. Obtain exact replacement runner authorization and retain required human review before execution. Runner and hosted application SHAs are different identities.
- Next: inspect the existing designated Byron primary workspace under the working login, then establish both councils' primary/alternative project, QSC and paid-scope eligibility. Preserve independent fixtures and do not create another payment merely to bypass an unresolved check. Then run the protected whole-funnel suite at the reviewed, authorised runner SHA and inspect representative DOCX/PDF outputs.
- Hosted Preview test checkout configuration is unchanged from the September 25 checkpoint. Runner flags remain false. Production checkout must remain disabled; no Production setting, data, schema or deployment action was taken. No whole-funnel run, payment, refund or migration was performed for this sign-in repair.
- The temporary Preview diagnostic/build wrapper expires at **2026-09-28 00:00 UTC (10:00 Sydney)**. Do not silently extend or bypass it; it must be removed before Production integration. Expiry does not itself invalidate previously recorded evidence.
- Overall decision: **HOLD**. Whole-funnel acceptance and commercial readiness remain unproven. Issue #395 contains the September 27 live checkpoints. Never publish credentials, cookies, authenticated links, private fixture identifiers or document contents. Do not retry Stripe OAuth authorization.


## Latest Item 78C checkpoint - 2026-09-25: Byron test configuration deployed

This checkpoint supersedes earlier incomplete-configuration and identity-wait instructions below. Historical evidence is retained, not an instruction to repeat setup.

- Byron's GitHub base URL and allowed-base URL are saved for its independent Preview. The earlier GitHub identity confirmation is resolved.
- Byron-only Vercel sign-in URL, Stripe test key, new webhook signing secret, checkout return URLs and diagnostic target list are saved. Existing Kempsey and ops entries were preserved. Credential values were entered by Robbie and were not read by the agent.
- Hosted Byron test checkout is now enabled on its exact repaired Preview branch only. Kempsey's existing branch-specific test checkout was already enabled and was not changed. Workflow runner checkout flags remain false; Production checkout must remain disabled.
- Byron configuration redeployment `dpl_Ehs1rNCVfWUYTVsKC8QA6UiyhpFh` is READY at exact application SHA `732de603021a3474222927ffbe34bac7a30b70f5`. Its guarded build returned BUILD_PASSED and the protected, no-database-query diagnostic returned HTTP 200 / BYRON.
- This is deployment/configuration evidence, not proof of Stripe credentials, webhook delivery, project eligibility, paid replay, outputs or consultant handoff.
- Both GitHub environments retain required review, no administrator bypass and the exact acceptance runner branch restriction. Both workflow pins still name `077d0e5d48fb6ab49fb7c5acc8cfa70668270f4d`; do not dispatch current branch HEAD against those old pins.
- Kempsey's referral variables and required secret names are present. Presence does not prove validity; do not recreate them without a specific failing check.
- Next: confirm current primary and alternative project/QSC/session eligibility; obtain exact replacement runner authorization and keep human environment approval; then run the protected whole-funnel suite. Do not use another council's fixture merely to remove a 404.
- Decision remains HOLD. No whole-funnel rerun, payment, refund, migration, Production deployment or Production setting change occurred in this checkpoint. `main` remains untouched. The temporary diagnostic/build wrapper expires 2026-09-28 00:00 UTC and must be removed before Production integration.
- Read [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395) and `docs/project-memory/item78c-current-handover.md` before continuing. Never retry Stripe connector/OAuth authorization or publish secrets, cookies, private project IDs or document contents.

### Configuration register and next operator actions

| Required setting or evidence | Status at this checkpoint |
| --- | --- |
| Byron GitHub base URL and allowed URL | Confirmed saved for independent Byron alias |
| Byron branch-only sign-in URL, return URLs, Stripe key and webhook secret | Confirmed saved; values not read; deployment completed |
| New Byron Stripe test destination | Confirmed Active; signed delivery remains unproven |
| Hosted Preview planning-pack checkout | Byron true saved and deployed; Kempsey true saved, unchanged; functionality unproven |
| Runner checkout flags | Remain false in the workflow |
| Independent hosted database targets | Byron and Kempsey classification proven separately; not fixture/content proof |
| Both GitHub review/branch protections | Confirmed present; administrator bypass disabled |
| Both workflow authorization pins | Superseded old pin; replacement exact runner SHA and approval still required |
| Required GitHub secret names, including Kempsey referral | Present, not proof of validity; no duplicate setup requested |
| Browser session at the new Byron alias | Guest project page with zero browser-local projects; authenticated access not established |
| Primary/alternative project, QSC, paid scope and referral eligibility | Not yet re-proven against the aligned hosted applications |
| Whole-funnel decision and representative DOCX/PDF inspection | Unproven; HOLD |
| Production checkout | Must remain disabled; no Production changes made |

1. Use the existing repaired Byron Preview, not an older alias. If inspecting projects through Chrome, Robbie must sign in there; the guest browser page does not establish whether the separately saved GitHub runner cookie is valid.
2. Inspect current evidence for primary and alternative project ownership, confirmed site/QSC and paid-session linkage in each independent fixture. Record only safe outcomes. Do not label HTTP 404 an acceptable unpaid denial or repurpose the other council's fixture.
3. Review the exact acceptance runner commit after documentation integration; obtain its replacement authorization and update both protected pins together. Do not confuse the runner SHA with the two application deployment SHAs. Keep the human approval gates.
4. Dispatch only the authorised protected workflow once prerequisites are satisfied. Keep raw credentials, responses and documents out of logs/issue comments.
5. Require both council journeys, replay idempotency, private evidence, rendered outputs and the Kempsey consultant handoff to pass. Inspect representative DOCX/PDF files before accepting READY_FOR_NON_PRODUCTION_ACCEPTANCE.
6. Record the exact run and safe result here and in Issue #395. If human approval/authentication is unavailable, leave a precise checkpoint rather than weakening protections or claiming completion.

The temporary guard expires at 2026-09-28 00:00 UTC. Expiry is not permission to extend or remove it silently. No live payment, refund, Production activation or Production schema work is included.


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


## Independent Preview alignment follow-up - 2026-09-25

Prepared follow-up to the completed diagnostic; not yet deployed or proven.

- Keep the acceptance/workflow branch unchanged. Add a separate hosted Preview branch for the existing independent Byron database; do not copy or merge council fixtures.
- The temporary guarded build now binds each exact Preview branch to one entry in the ordered non-secret target list (Byron first, Kempsey second), rejecting cross-council mismatches before any build process starts.
- Automatic Git deployments remain suppressed for both hosted Preview branches and the preparation branch. Manual deployment must remain pinned to reviewed code.
- Neon injects branch-specific database variables at deployment time; saved project variables alone are not runtime target evidence. Existing branch reuse must be confirmed from deployment metadata and the bounded diagnostic, never assumed from naming alone.
- Check required branch-scoped application settings before requesting manual secret entry. Preserve Production and unrelated Preview settings.
- Both hosted target identities, current session/fixture boundaries, protected workflow pins and fresh whole-funnel results remain required. No payment, migration, fixture mutation or stateful acceptance is authorised or performed by this preparation.
- The existing expiry remains 2026-09-28 UTC. This temporary Preview-only wrapper must not be merged to main or used for Production.
- Canonical continuity: Issue #395. Decision remains HOLD.


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
