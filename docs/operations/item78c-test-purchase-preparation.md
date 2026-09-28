## Current status - 28 September 2026: preparation implementation reviewed; execution pending

- The approved retry correction is implemented. Offline validation: **77 tests passed, 0 failed**; the workflow YAML also parsed successfully.
- Follow-up independent review recommends publication with no remaining blocking findings in its reviewed scope. The reviewer checked the supplied unchanged service APIs but did not independently rerun tests or execute live integrations.
- This package is the reviewed replacement-purchase PREPARATION implementation, not evidence of created Checkouts, completed payments, webhook delivery or whole-funnel acceptance. Overall decision remains **HOLD**.
- Next action: inspect/set the separate non-secret `ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT` in both existing council Preview environments to this package's published commit, then manually dispatch the explicit preparation mode and approve its protected jobs. The exact commit and handoff are recorded in [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395). Do not change the existing acceptance or diagnostic pins or recreate saved secrets.
- Production checkout must remain disabled. No Production, main, acceptance snapshot, deployment, schema, refund or payment action is included in publication.

The implementation/review history below is retained; this status and the latest Issue #395 checkpoint supersede older next-action instructions.

## 28 September 2026: approved retry-safety correction

The replacement preparer now refuses a PAID database purchase paired with an open/unpaid provider Checkout, before any provider-reference attachment or payment handoff. Regression cases cover both present and absent provider references. This corrects the independent-review finding recorded in Issue #395; revalidation and follow-up review are required before publication/execution. The prior 75-test result predates these two added cases. No replacement payment or acceptance success is implied.

# Item 78C replacement test-purchase preparation

## Purpose and status

Robbie approved two replacement Stripe Sandbox/test purchases on 28 September 2026, using the existing saved proposal and matching DPP request for each council. Preserve the original paid purchases and ACTIVE entitlements. The original proposal text was not recovered; do not invent it or reassign an entitlement.

This is fixture preparation, NOT commercial acceptance, not a refund and not a Production checkout activation. Item 78C remains HOLD until both complete whole-funnel journeys and output reviews pass.

Read-only reconciliation run: https://github.com/RobbieTall/Plannera-ab/actions/runs/36379535529
Issue: https://github.com/RobbieTall/Plannera-ab/issues/395

## Explicit stateful boundary

The new mode in `.github/workflows/stripe-test-session-prepare.yml` is manual only. Legacy main-only session preparation is preserved and excluded when the new mode is selected. Do not select or run the legacy mode for these fixtures.

- Branch: `diag/item78c-paid-scope-20260928`.
- Separate non-secret environment variable: `ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT`, set in BOTH existing council environments to the exact reviewed preparation commit.
- Dispatch `item78c_prepare_only=true`, `expected_commit=<that exact 40-character SHA>`, confirmation `PREPARE TWO PREVIEW TEST PURCHASES`, target confirmation `PROTECTED NON-PRODUCTION`.
- Existing acceptance pin `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT` remains `fcd0c27c68daea81bd51e28b567e469a5fe6b97a`.
- Existing read-only pin `ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT` remains `122b55845e2c1e081c0e47bede98f286586b2b68`.
- Authorization expires at 2026-09-30T00:00:00Z. Stop if expired; no silent extension.
- Both environments must actually restrict branch access to the two exact reviewed branch rules, require RobbieTall review, and disallow administrator bypass. The runner reads the policies; it does not assume they exist.
- A credential-free prerequisite job verifies Git ancestry, exact commit/event/branch and both environment policies. After required human review, the protected job repeats authorization and checks its separate commit pin before the step receiving application credentials.
- No direct dispatch-input interpolation into shell commands. Inputs enter through environment data and strict validators.
- Matrix max-parallel=1 and operation-wide workflow concurrency serialize this runner. Do not create parallel checkouts manually for these fixture scopes.

The existing approved application source is reused through PurchaseEntitlementService, createPlanningPackCheckout and StripeCommerceProvider. No alternative settlement, entitlement insertion, refund, cancellation, migration or DPP generation is implemented.

Runner-local checkout feature flags remain false. The isolated preparation provider is explicitly enabled only after test-key/target/authorization checks. It does not change hosted environment flags or settings.

## Existing configuration: inspect before requesting changes

The new variable above is the only new configuration name. Reuse each council's own existing values; do not replace secrets merely because a new runner was published.

Non-secret fields used: `ITEM74H_AUTHORIZED_DATABASE_TARGET`, `PLANNERA_STRIPE_TEST_BASE_URL`, `PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL`, `PLANNERA_STRIPE_TEST_PROJECT_ID`, `PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID`, `PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID`, and the two commit pins.

Protected fields used: `ITEM74H_PREVIEW_DATABASE_URL`, `STRIPE_TEST_SECRET_KEY`, `ITEM78A_STRIPE_TEST_SESSION_ID` (the OLD paid session for preservation checks), `PLANNERA_STRIPE_TEST_SESSION_COOKIE`, `PLANNERA_STRIPE_TEST_VERCEL_BYPASS`, `PLANNERA_STRIPE_TEST_PROPOSAL`, `PLANNERA_STRIPE_TEST_OTHER_PROPOSAL`, `PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON`, `ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN`.

The script checks exact independent database endpoints, project/QSC identity, session ownership/expiry, current cited scope, fixed account/test key, deployed application SHA/ref/alias, active AU test-tax setup, enabled test webhook destination, product/price and original paid entitlement before creating anything. Current Vercel API identity must pass before opening database or Stripe clients. A mismatched or missing setting is a refusal, not permission to recreate resources.

Existing immutable-deployment runtime database classification was recorded separately. This preparation does not reopen or extend the expired temporary diagnostic. Deployment metadata and matching source files are not a proof of all runtime behavior.

## Retry and privacy

Operation identity: `item78c-replacement-20260928`, with separate `BYRON` and `KEMPSEY` metadata.

Normal application purchase idempotency is retained. The wrapper adds operation/council metadata and first reconciles provider sessions against the exact database scope. A retry recovers an existing matching session instead of creating another. Unknown provider references, duplicate scopes/sessions, expired checkouts, pagination uncertainty and an old unbound pending intent fail closed. An uncertain failure may have created a pending record or provider session; inspect before retrying or editing configuration.

This wrapper does not guarantee exclusion of arbitrary external concurrent writers. Operator isolation and the serialized workflow remain required. A changed or ambiguous fixture is HOLD, not permission to delete old rows.

The repository is public. The new mode uploads NO artifacts, checkout links, proposal text, cookies, hashes or session IDs. Raw execution stdout/stderr go to restrictive runner-temporary files, are never printed, and are removed. A separate step without application credentials permits only the fixed summary schema and known reason codes. Malformed/transitive output fails closed. This controls publication, not a sandbox guarantee over every imported dependency; existing pinned dependencies remain executable trusted code.

## Private payment handoff and acceptance

1. Require a safe preparation result for each council. Preparation does not perform any payment.
2. In the authenticated Stripe test Dashboard, identify the exact Checkout using BOTH operation and council metadata, and its matched purchase relationship. Never choose an arbitrary newest session. If exact private recovery cannot be established, stop rather than publishing raw links or re-creating checkouts.
3. Robbie completes each approved test-mode payment. No real card, live mode, Production checkout or refund.
4. Confirm the normal webhook settled the new purchase and entitlement for its exact proposal/QSC/project. Do not settle it manually.
5. Preserve the original paid-session reference for the audit in protected storage before any acceptance-secret replacement. Do not overwrite the old reference while preparation/recovery still needs it. Only after verified payment and preservation should the acceptance session field be switched to the matching new session.
6. Re-run the frozen whole-funnel acceptance with the existing acceptance SHA/pins. Require both councils, entitlement isolation, replay idempotency, private evidence, DPP/SEE output and consultant handoff. Inspect representative DOCX/PDF.
7. Record only safe booleans/reason codes, commit/run links and the exact remaining blocker in Issue #395 and canonical project memory. Do not call this READY until acceptance and output review support it.

## Validation limits and next gate

New dependency-free synthetic tests cover authorisation, injection-shaped inputs, separate pin, non-main Git evidence, credential placement, council isolation, wrong/live targets, first creation, replay, interrupted-provider recovery, paid replay, ambiguous/expired state, old-purchase preservation and strict safe-summary publication.

Local synthetic tests are not execution evidence for Prisma, Stripe, hosted webhook delivery or the whole funnel. No application compilation, dependency installation, migration or stateful acceptance is part of local validation. Independent review and safe publication must finish before setting the new pin and dispatching. The protected workflow generates Prisma against synthetic configuration after installing dependencies without lifecycle scripts; real credentials are introduced only at its final preparation step.

No main merge, acceptance-branch movement, Vercel deployment, Production data/schema/checkout change or refund is authorized by this package.
