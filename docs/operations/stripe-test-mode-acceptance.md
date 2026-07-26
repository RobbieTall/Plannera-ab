# Stripe test-mode acceptance (Item 72C)

This runbook proves the exact deployed Item 72B release in a protected non-production deployment. **Code deployed is not checkout enabled.** Item 72B/72C code may be present everywhere while production `PLANNING_PACK_CHECKOUT_ENABLED` remains false or absent. This procedure neither authorises nor performs production activation, a live charge, a production-data change, or a merge.

## Safety boundary and owners

Use a Stripe **test-mode** account, a dedicated Vercel Preview/development deployment, the protected GitHub environment `stripe-test-acceptance`, and a dedicated signed-in test requester. Never reuse a customer, production project, address, QSC, proposal, cookie, Checkout session, PaymentIntent, or card. The runner permits only HTTPS non-production hosts, `sk_test_` keys and `cs_test_` sessions; follows no redirects; emits only booleans, result reasons, and opaque Stripe IDs; and fails closed.

The operator must configure Stripe Tax registration/settings for Australia in test mode and select an appropriate default product tax code in the Stripe Dashboard. The tax code is an operator/account decision and must never be hard-coded in Plannera. Confirm billing-address collection and automatic tax. Store no test-card data in Plannera, GitHub, Vercel, shell history, notes, screenshots, or artifacts.

## One-time protected setup (do not put values in this document)

1. Create or select a non-production Vercel deployment of the exact reviewed commit. Its deployment environment alone must set `PLANNING_PACK_CHECKOUT_ENABLED=true`, `STRIPE_SECRET_KEY` to a test key, `STRIPE_WEBHOOK_SECRET` to the test endpoint signing secret, and `PLANNING_PACK_CHECKOUT_SUCCESS_URL` / `PLANNING_PACK_CHECKOUT_CANCEL_URL` to that same non-production host. Confirm Production keeps the enable flag false/absent and receives none of this test setup.
2. In Stripe test mode, create `/api/webhooks/stripe` on that deployment as the webhook endpoint. Subscribe only to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.created`, and `refund.updated`. Record webhook delivery status in Stripe, not raw payloads elsewhere.
3. Create the GitHub environment `stripe-test-acceptance`, require designated reviewer approval, prevent self-approval where available, and restrict deployment branches to `main`. The workflow does not create the environment or its secrets.
4. Add environment variables `PLANNERA_STRIPE_TEST_BASE_URL`, `PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL` (the exact same protected URL), `PLANNERA_STRIPE_TEST_PROJECT_ID`, `PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID`, and `PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID`. Add environment secrets `STRIPE_TEST_SECRET_KEY`, `PLANNERA_STRIPE_TEST_SESSION_COOKIE`, `PLANNERA_STRIPE_TEST_PROPOSAL`, `PLANNERA_STRIPE_TEST_OTHER_PROPOSAL`, and `PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON`. The JSON secret must contain exactly `projectId` and `proposalBrief`, equal to the protected exact project/proposal inputs; never print it. The second project and second normalized proposal must be independent negative scopes. Never use a production cookie or secret.
5. Under the dedicated requester, prepare two disposable non-production projects. The acceptance project must have one current confirmed site, a current cited QSC, one fixed proposal, and the DPP path; the other must have a different site and QSC. Capture only their opaque IDs in protected variables. Do not paste addresses, proposal/contact text, provider responses, or secrets into Actions inputs or artifacts.

## Execute and resume deterministically

Acceptance is three explicit, independently resumable phases. Re-dispatching the same phase and `cs_test_…` ID repeats the same bounded checks: it creates no Checkout or refund; the first `paid` execution creates the one acceptance DPP, while later `paid` executions find that exact project/QSC/proposal marker and do not call generation again. Response bodies remain private.

1. Create exactly one Checkout through the normal signed-in application for the dedicated scope. Before entering card data, copy only its `cs_test_…` ID. Dispatch phase **`before_payment`**. Automation requires a test-mode open/unpaid session, exact application `state=waiting`, and a real exact DPP POST denied with 402 before retrieval/persistence. It proves the hosted URL/redirect alone grants nothing.
2. Perform the one manual action: complete Stripe-hosted Checkout using Stripe's documented Australian test payment method and Australian billing address. Never automate or retain card/address data. Wait for Stripe's signed webhook delivery. Dispatch phase **`paid`** with the same ID. Automation requires completed/paid provider facts, AUD 49.00 with AUD 4.45 tax, exact `state=paid`, both changed scopes not paid, two real duplicate checkout POSTs returning 409 with no new provider session, the first exact DPP POST returning 201, later paid replays reusing that single exact project/QSC/proposal artefact without another generation POST, and changed-proposal/other-project DPP POSTs returning 402.
3. Confirm the exact generated DPP preserves evidence-derived cited/unresolved state, `acceptedJourney`, `commercialReady`, and routing. Automation proves HTTP gates and settlement facts, not the semantic contents of the private DPP response.
4. Perform the manual operator full-refund action through the approved provider/server operational path. Wait for its signed webhook. Dispatch phase **`refunded`** using the same ID. Automation requires exactly one succeeded AUD 49.00 provider refund, exact `state=refunded`, and exact DPP denial with 402.
5. Each phase paginates all non-expired Checkout sessions in the bounded test creation window and fails closed on cursor/page uncertainty. Download only `stripe-test-acceptance-summary`; it has a fixed schema of booleans (including whether the one DPP was created in this run), one fixed reason code, phase and an opaque session ID restricted to `^cs_test_[A-Za-z0-9]{1,247}$` (255 characters total maximum). Never retain response bodies, stderr, network/provider payloads, address/proposal/contact/card data, cookies, request JSON, or secrets.

## DPP, reconciliation, support, and refund proof

For missing/late webhooks, duplicate sessions, contradictory terminal events, wrong tax/amount/currency, or status disagreement, stop. Disable the test deployment flag, preserve only opaque IDs, compare Stripe Dashboard delivery/event status with the safe runner reason, and escalate to the payment operator. Do not replay a contradictory event until reconciled and do not mark a redirect as paid.

For a genuine system/retrieval failure before DPP persistence, an authorised operator requests a **full** AUD 49.00 refund to the original test method through the existing server/provider operational path. Never issue a partial refund. Wait for the signed refund webhook, dispatch `refunded` with the same `cs_test_` ID, and require application `state=refunded`, DPP HTTP 402, one refund of AUD 49.00, and provider status succeeded. Capture only the safe summary and Stripe Dashboard screenshot cropped to opaque IDs, amount/currency/tax/refund status—no billing or card/contact data.

## Disable / rollback

Set `PLANNING_PACK_CHECKOUT_ENABLED` false/remove it in the non-production deployment, redeploy, and verify status reports the free/disabled state. Disable the test webhook endpoint and rotate/delete temporary test keys, webhook secret, session cookie, and proposal secrets according to operator policy. Delete disposable non-production data through normal requester controls. Production remains untouched. Code rollback is a normal reviewed revert PR; environment disablement is the immediate kill switch.

## Separate production activation checklist (future explicitly approved PR only)

- [ ] Item 72C protected run passed on the exact candidate SHA, including AUD 49.00 / AUD 4.45 GST provider facts, exact entitlement/DPP gate, negative scopes, and full-refund confirmation.
- [ ] Commercial Funnel Golden Gate, lint, typecheck, Vercel build, deployment, and the established Byron/Kempsey protected audit are green for that SHA without weakening `acceptedJourney` or `commercialReady`.
- [ ] Legal/commercial owner approves Stripe account, Tax registration/settings, default product tax code, terms, support owner, reconciliation cadence, refund authority, privacy/retention, and launch timing.
- [ ] Production webhook URL/events, least-privilege live keys, signing-secret rotation, success/cancel URLs, monitoring, alerting, and rollback owner are peer reviewed without values in Git/docs/PR.
- [ ] A separate activation PR documents exact production configuration steps and explicit approval. Only then may an operator deliberately set the Production flag. Deploying Item 72B/72C code alone never enables checkout.
