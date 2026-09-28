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

- The approved two-purchase repair now has a separate preparation implementation and synthetic regression suite; see [replacement test-purchase runbook](item78c-test-purchase-preparation.md). From the operations directory use `item78c-test-purchase-preparation.md`.
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

## Purchase-field reconciliation mode

The separate scope_reconcile_only mode is NOT the older three-request scope_only mode described below. Select exactly one mode. Mixed modes select no credential-bearing job. It preserves the old scope-only code and its tests.

Reconciliation adds the existing ITEM74H_PREVIEW_DATABASE_URL and ITEM78A_STRIPE_TEST_SESSION_ID to the FINAL protected step only. No new secret, Stripe API key, Vercel API token, Blob token, npm dependency, install or Prisma generation is needed. Application credentials are not exposed to the prerequisite authorization job. The existing exact-SHA/Git ancestry checks and both actual environment-protection checks remain mandatory and are repeated after human approval.

The database URL is validated in memory against the council-specific existing Preview endpoint and neondb, TLS, protocol, port and bounded options. Redirects are refused. The script uses Neon's SQL-over-HTTP batch protocol with Neon-Batch-Read-Only=true and RepeatableRead; the SELECT also verifies transaction_read_only=on before accepting any comparison. Query parameters carry the saved session and hashes calculated with the application's exact proposal normalization. No input is interpolated into SQL or shell. Only one bounded SELECT transaction is executed, and only approved boolean fields leave the runner. No raw provider response or error is printed.

Protocol references (official source):
- https://github.com/neondatabase/serverless/blob/main/src/httpQuery.ts
- https://github.com/neondatabase/serverless/blob/main/src/shims/net/index.ts
- https://github.com/neondatabase/neon/blob/main/proxy/README.md

This reads the independently allowlisted runner database; it does NOT freshly attest the hosted application's runtime database, reproduce all QSC Zod/site-currentness logic, or establish payment acceptance. A saved_inputs_match_database result with an application available result requires further hosted-scope reconciliation, not a fabricated success. Missing/ambiguous purchase reference or unsupported response fails closed. Old memo text is not an authoritative recovery source for a paid proposal.

Synthetic checks: node --test tests/item78c-paid-scope-diagnostic.test.mjs tests/item78c-paid-scope-entry.test.mjs tests/item78c-paid-scope-reconcile.test.mjs.
Do not report these tests or independent review as passed until Issue #395 records their actual result.

## Historical three-request mode documentation

# Item 78C read-only paid-scope diagnostic

Status: CORRECTED DRAFT / LIVE EXECUTION NOT PERFORMED. Item 78C remains HOLD.
This document is not evidence of a successful diagnostic or acceptance.
Current synthetic validation and independent-review results are recorded in
Issue #395. Do not treat a prior draft's passing tests as validation of a new revision.

## Review corrections

The 28 September independent review found two draft defects, both reproduced
using synthetic data before correction. Reviewer validation now requires exactly
one required-reviewers rule containing only RobbieTall (User ID 106786418).
Additional users, teams and duplicate reviewer rules are rejected; unrelated
protection rule types remain compatible. The diagnostic rejects identical
trimmed proposal inputs before any application request. Distinct proposal inputs
and the existing safe diagnostic result format remain supported.

These corrections do not alter workflow jobs, Preview targets, existing secrets,
the frozen acceptance pin, or Production settings. The corrected package needs
its own synthetic validation and follow-up independent review before publication
or live execution; Issue #395 records whether those steps have completed.

## Why this exists

Run 36320194019, attempt 2, at acceptance SHA
fcd0c27c68daea81bd51e28b567e469a5fe6b97a passed both private Blob and
Sandbox/ClamAV cleanup gates, with zero reported residue, and the SEE compiler
checks. Both bridges stopped at stripe_paid_source / scope_mismatch.
Read-only Preview SQL subsequently confirmed both primary purchases are PAID,
have ACTIVE matching entitlements, and reference their configured current QSC.
The alternate projects also have paid purchases, but for DIFFERENT proposal
fingerprints. That alone does not invalidate the negative scope test.

The runner's scope_mismatch combines three cases. This diagnostic distinguishes
them without changing purchases, proposals, QSCs, entitlements, fixtures or gates.

## Frozen acceptance

- Keep accept/item-78c-byron-kempsey-20260914 and its approved SHA unchanged.
- Keep ITEM74H_WORKFLOW_AUTHORIZED_COMMIT at the acceptance SHA above in BOTH environments.
- The diagnostic branch is diag/item78c-paid-scope-20260928.
- Its separate permission variable is ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT.
- It may not run from main or a commit already contained in main.
- Never substitute the diagnostic SHA for the stateful acceptance pin.
- Never merge this temporary diagnostic into main or the acceptance branch.

## Operation and boundary

The new scripts have no npm dependencies. No npm install, Prisma generation,
database connection, Stripe call, Blob operation, deployment, checkout, document
generation, refund or migration is invoked by the scope-only jobs.

The ONLY application operation is POST /api/planning-pack/status, with three
request bodies matching the acceptance checks. This particular POST was reviewed
as read-only in the pinned application source; POST in general is NOT read-only.
Only two fixed immutable Preview origins can be contacted, redirects are rejected,
responses are time/size bounded, and only approved states/errors are emitted.

Byron app: deployment dpl_HyncdptgBatoinZPEex5L44XN3uc,
commit 732de603021a3474222927ffbe34bac7a30b70f5.
Kempsey app: deployment dpl_3Z7RZqws114FgjZ9MqCHuH5XiN37,
commit 87de1a054ed75290ff9d58e566cf37220f1de406.
Both deployments were READY, non-Production, in the expected Vercel project at
preparation time. Their fixed URLs are in the diagnostic target map.
Results describe these immutable deployments, NOT arbitrary future alias targets.

No secret values, cookies, proposal text, identifiers, hashes, raw responses or
raw exceptions are printed. No artifact upload is used. The workflow provides
only the existing scoped app-session/bypass/proposal secrets in the final step.
It does NOT provide DATABASE_URL, Stripe keys, Blob keys, or a Vercel access token.

A completed diagnostic is NOT an acceptance pass. Even three_scope_checks_match
does not prove payment replay, DPP/SEE output quality, consultant handoff or release
readiness. Configuration failures and HTTP errors must be investigated, not waived.

## Before any run

1. Explicitly authorize and complete synthetic tests and independent review.
   Cover malicious inputs, redirect refusal, response size/shape, secret leakage,
   exact-ref/SHA restrictions, contained-in-main rejection, authorization failure,
   required reviewers/admin bypass/branch policies, and step-level credentials.
   Validate the corrected revision, including extra-reviewer and identical-input regressions.
2. Record the reviewed full diagnostic commit in Issue #395.
3. In EACH existing Preview environment, preserve the acceptance branch rule and
   add ONLY the exact diagnostic branch rule. No wildcards or tags.
4. Confirm exactly one required-reviewers rule, with RobbieTall as its sole reviewer,
   and administrator bypass disabled.
   The script validates BOTH environments through GitHub read APIs and refuses
   unavailable metadata or unexpected policies. Do not weaken this if the default
   workflow token cannot read the environment APIs; resolve authorization separately.
5. Add the non-secret ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT variable in each
   environment with the reviewed diagnostic SHA. Do not change the acceptance pin.
6. No credential replacement is required. Retain the existing council fixtures.
7. Open the existing "Item 77 protected commercial journey" workflow:
   https://github.com/RobbieTall/Plannera-ab/actions/workflows/item77-protected-commercial-journey.yml
   Select the exact diagnostic branch FIRST. Set scope_only=true, leave
   diagnostic_only=false and presence_only=false, set expected_commit to the
   newly reviewed diagnostic SHA, and confirmation=READ ONLY PREVIEW SCOPE CHECK.
   Do NOT run the default main branch or dispatch whole-funnel acceptance.
   If the scope_only field does not appear after selecting the diagnostic branch,
   stop and report the visible form rather than running another mode.

   The standalone item78c-session-preflight.yml file is NOT registered on main.
   Its direct Actions link reported "This workflow does not exist". The prior
   instruction to use that link was incorrect. The registered Item 77 entry now
   has a separate scope-only path with the same reviewed protected steps.
   Scope-only mode skips every legacy commercial, login and presence job.
   No main change is needed for this diagnostic-branch entry-point correction.
8. Inspect the pending jobs and approve BOTH protected Preview environments.
9. Record only safe result enums/booleans in Issue #395. Reconcile the cause before
   any repair; never repeat a payment or alter data to force a pass.

The script expires at 2026-09-30T00:00:00Z. This is a separate diagnostic window,
NOT an extension of the old database-target/build guard, which still expires
2026-09-28T00:00:00Z. No hosted application build is required.

## Publication safety and cleanup

The new branch must FIRST point at a commit containing its deploymentEnabled=false
entry in vercel.json. Do not create it at the old tree and then add the disable rule.
All inherited GitHub workflow triggers were inspected: push triggers are restricted
to main or agent/item74h-pathway-check, not the diagnostic branch. No PR is opened
by this preparation, so pull-request checks are not represented as executed.

Vercel's branch exclusion is documented at:
https://vercel.com/docs/project-configuration/git-configuration
It does not prohibit a person from manually deploying; no manual deployment is
authorized for this diagnostic.

After diagnosis, remove ONLY the temporary diagnostic branch permission and
diagnostic pin from both environments, retaining the acceptance permission/pin.
Confirm no diagnostic run remains before removing authorization. Preserve the
reviewable commit and safe results for continuity; no branch/resource deletion
is performed by this diagnostic.

## Continuity

Issue #395 is the live checkpoint while acceptance is frozen. Main, Production,
commercial activation, PR #448 and its Research Viewer sequence are unchanged.
Existing login diagnostic jobs remain present; scope_only defaults false.
