# Stripe test acceptance verification

Status: **IMPLEMENTED / NOT EXECUTED**

This note records the code-review boundary for Item 72C hardening. It does not claim a fresh protected Stripe lifecycle run, authorise a merge, enable checkout, make a payment or refund, or change any deployment or database state.

Production checkout must remain disabled: `PLANNING_PACK_CHECKOUT_ENABLED` is false or absent in Production. Any later activation requires a separate, explicitly approved production change.

## Verified implementation contract

- `package.json` maps `accept:stripe-test` to `tsx scripts/stripe-test-acceptance.ts`.
- The runner accepts only `sk_test_` credentials and Checkout session IDs matching `^cs_test_[A-Za-z0-9]{1,247}$`.
- Session-ID validation completes before the ID can be used in a provider path or copied into the privacy-minimal summary. Invalid values leave the summary ID as `unavailable` and make no request.
- The `before_payment` phase is run before the one manual Stripe-hosted test payment.
- The first `paid` run may create exactly one exact-scope DPP. A later `paid` replay discovers that persisted project/QSC/proposal DPP and must not POST exact DPP generation again.
- The same dedicated `cs_test_` ID is reused for `before_payment`, `paid`, paid replay, and `refunded`.
- Changed-proposal and other-project scopes remain denied, duplicate Checkout creation remains denied, and safe output remains limited to the allowlisted summary schema.

## Evidence boundary

Focused deterministic tests cover malformed Checkout IDs and persistent paid replay. They are implementation evidence only. Item 72C remains **IMPLEMENTED / NOT EXECUTED** until the protected GitHub workflow is deliberately run against an approved non-production Vercel deployment and the resulting privacy-minimal evidence is reviewed.

Use [stripe-test-mode-acceptance.md](./stripe-test-mode-acceptance.md) for the protected setup, manual-payment boundary, refund procedure, safe evidence rules, and rollback steps. Never place keys, cookies, proposals, provider payloads, card or billing data, or unredacted environment values in GitHub inputs, logs, documentation, or artifacts.
