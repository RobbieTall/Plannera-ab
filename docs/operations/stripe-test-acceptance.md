# Stripe test acceptance verification

Status: **HARDENING IMPLEMENTED / NOT RE-EXECUTED**

This note records the code-review boundary for the Item 72C replay and input-validation hardening in draft PR #341. It does not claim that this draft was dispatched through a fresh protected Stripe lifecycle, authorise a merge, enable checkout, make a payment or refund, or change any deployment or database state.

The original protected Item 72C lifecycle was executed successfully before this hardening draft. Merged commercialisation records document one dedicated Stripe test Checkout completing `before_payment`, `paid`, paid replay and `refunded`, with A$49.00 AUD including A$4.45 GST, exactly one persistent DPP, exact-scope entitlement, changed-scope denial and one full test refund. Do not erase or contradict that historical acceptance by describing Item 72C itself as unexecuted.

Production checkout must remain disabled: `PLANNING_PACK_CHECKOUT_ENABLED` is false or absent in Production. Any later activation requires a separate, explicitly approved Production change.

## Verified hardening contract

- `package.json` maps `accept:stripe-test` to `tsx scripts/stripe-test-acceptance.ts`.
- The runner accepts only `sk_test_` credentials and Checkout session IDs matching `^cs_test_[A-Za-z0-9]{1,247}$`.
- Session-ID validation completes before the ID can be used in a provider path or copied into the privacy-minimal summary. Invalid values leave the summary ID as `unavailable` and make no request.
- The `before_payment` phase is run before the one manual Stripe-hosted test payment.
- The first `paid` run may create exactly one exact-scope DPP. A later `paid` replay discovers that persisted project/QSC/proposal DPP and must not POST exact DPP generation again.
- The same dedicated `cs_test_` ID is reused for `before_payment`, `paid`, paid replay and `refunded`.
- Changed-proposal and other-project scopes remain denied, duplicate Checkout creation remains denied, and safe output remains limited to the allowlisted summary schema.

## Evidence boundary

Focused deterministic tests cover malformed Checkout IDs and persistent paid replay. They prove the draft hardening implementation only. The draft hardening remains **NOT RE-EXECUTED** until an operator deliberately runs the protected workflow against an approved non-Production candidate and reviews the privacy-minimal evidence.

A fresh payment/refund lifecycle is not a prerequisite merely to continue Item 74 development. Require a new protected lifecycle only when a reviewed release candidate, payment contract or deployment boundary changes enough that the existing acceptance is no longer representative.

Use [stripe-test-mode-acceptance.md](./stripe-test-mode-acceptance.md) for the protected setup, manual-payment boundary, refund procedure, safe evidence rules and rollback steps. Never place keys, cookies, proposals, provider payloads, card or billing data, or unredacted environment values in GitHub inputs, logs, documentation or artifacts.

## Item 74 handoff

Item 74 must consume the accepted A$49 Planning Controls Pack commercial fact without enabling Production checkout. The next implementation boundary is an exact-scope, single-use A$49 credit against the A$749 submission SEE, leaving A$700 payable only where the current requester/project/site/QSC/proposal/product scope qualifies. Do not treat historical Item 72C acceptance as proof that this new SEE credit path exists or is accepted.
