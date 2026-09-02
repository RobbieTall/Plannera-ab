# Stripe test session preparation

This companion runbook removes the dashboard-only gap before the existing
[Stripe test-mode acceptance](stripe-test-mode-acceptance.md). It creates one
unpaid Stripe test Checkout session through the real protected Preview route.
It does not submit a card, grant an entitlement, generate a paid pack, refund a
payment, or change Production.

## Safety boundary

- Dispatch only from the exact reviewed `main` commit.
- Before dispatch, pin `ops/stripe-test-acceptance` to that exact reviewed
  `main` commit and wait for its Vercel Preview deployment to report READY.
- The protected GitHub environment is `stripe-test-acceptance`.
- The workflow accepts only an exact allowlisted random Preview hostname or the
  stable `ops/stripe-test-acceptance` Vercel alias. Every Production, `main`,
  and other branch alias is rejected.
- The workflow never receives a Stripe secret key. The protected Preview owns
  its branch-scoped test-only Stripe configuration.
- Production must keep `PLANNING_PACK_CHECKOUT_ENABLED` false or absent.
- Use only disposable synthetic projects and proposals. Do not use customer
  documents, addresses, contacts, payment details, or Production data.
- The test session ID and Checkout URL are not printed. The private handoff
  artifact expires after one day and should be deleted earlier after use.

## Prepare and execute the lifecycle

1. Pin `ops/stripe-test-acceptance` to the reviewed `main` commit and confirm
   its protected Vercel Preview is READY.
2. Dispatch **Stripe test session preparation** from that same `main` commit.
3. Enter `PREPARE STRIPE TEST-MODE SESSION` and select
   `PROTECTED NON-PRODUCTION`.
4. Privately retrieve the one-day `stripe-test-session-<run-id>` artifact. Do
   not paste its contents into issues, logs, documentation, or chat.
5. Run the existing **Stripe test acceptance** workflow with phase
   `before_payment` and the artifact's strict `cs_test_` session ID.
6. Open the artifact's Stripe test Checkout URL. Complete the test payment only
   after action-time approval; never use a real card.
7. Run phase `paid`, then rerun the same `paid` phase against the same session
   to prove persistent DPP replay idempotency.
8. Create the full refund in Stripe test mode and run phase `refunded`.
9. Delete the handoff artifact and clean up the disposable Preview records under
   the existing zero-residue procedure.

Until all phases pass on the same new session, Item 72C remains **IMPLEMENTED /
NOT RE-EXECUTED**. A green preparation run alone is not payment acceptance and
does not justify activating Production checkout.
