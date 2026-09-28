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
7. Use the already registered item78c-session-preflight.yml workflow on the exact
   diagnostic branch, set scope_only=true, expected_commit to the reviewed SHA,
   confirmation=READ ONLY PREVIEW SCOPE CHECK. Do NOT dispatch whole-funnel acceptance.
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
