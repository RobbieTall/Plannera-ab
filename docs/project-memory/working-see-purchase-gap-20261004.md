> **Latest SEE purchase-integration checkpoint (4 October 2026): HOLD.** The signed Preview/test payment policy and atomic persistence handler are now prepared with 66 passing focused tests, clean type checking, a passing build-safety contract and a successful credential-free build (37/37 pages). Payment, credit and entitlement changes share one serializable transaction; failure tests exercise rollback using a transactional test double, not a live database. The customer checkout/quote route, selected-document scope binding, provider dispatch and UI remain to be connected. These modules do not enable checkout and no new test payment or hosted document acceptance is claimed. Both isolated deployments remain on the prior origin-fix SHAs. Production is unchanged and must stay disabled; no deployment or merge. Earlier checkpoints below are historical.

## Implementation checkpoint: atomic payment foundation

New modules: `src/lib/submission-see-payment-policy.ts` and `src/lib/submission-see-payment-persistence.ts`, with dedicated tests. The synthetic document-delivery CI workflow now includes these tests and the existing SEE credit-persistence tests.

`SubmissionSeePaymentPersistence.receive()` verifies the signature and explicit Preview/test gating before accessing the database. Within one serializable transaction it reloads the purchase, credit and source entitlement, applies exact scope/amount/reference policy, conditionally transitions the purchase and credit, and grants/revokes the exact entitlement. It retries only rolled-back Prisma P2034 contention, at most three attempts. Replayed payments cannot reactivate revoked or refunded access. Provider-confirmed refunds are only recorded; the code never calls a refund API. Refund-before-settlement requires reconciliation.

Validation: 43 policy + 18 atomic-persistence + 5 existing credit tests = **66 passed**. Full type check passed. Build-safety contract passed. Credential-free Next build exited 0, 37/37 pages; existing browser-data age and dynamic DCP-route warnings remain. Fake-transaction rollback tests are development evidence only; real isolated-database behavior remains to be accepted.

### Next implementation, before deployment/payment

Connect a server-owned quote and Checkout preparation path to the exact selected planning pack/memo/site-check/proposal. Preserve approved A$749 full price and A$49 eligible planning-pack credit (A$700 payable where eligible), without silently repricing a pending session or repeating a pack purchase. Bind pending intent, credit reservation and stable provider idempotency. Dispatch signed webhooks by the stored product, retaining existing planning-pack handling; the new policy must not cause planning-pack events to be rejected as SEE. Add customer quote/checkout/status UI and route/transaction integration tests. Keep the new checkout path hard-disabled in Production. Confirm branch-only Stripe test configuration and exact independent isolated targets before any session or rollout. Source applicability/freshness remains a separate gate.

# Working SEE purchase gap: current handover

## Origin repair deployed; next paid-product gap evidenced — 4 October 2026

PR #452 application patch `4178f32db4424d41b2d8cb316cc8d5ba8ab64b7f`: 106 local checks, type check, credential-free build and all 14 GitHub runs passed.

Both exact isolated rehearsal deployments are READY:
- Byron `33f91b35e4894df62902c93d811b566dff5fb062`: `dpl_HkP7k6rM99ifADrbRDm52V8RZUiQ`.
- Kempsey `5efcc625437072ef2e6aff05fae7d7bcf149eab0`: `dpl_4akvpYTD4DU3KumA5pg4R39VsJt1`.

Actual customer Word/PDF generation on both updated Previews now passes the origin rejection and displays the source/project/paid-access mismatch message. No successful file generation is claimed.

Read-only, project-bounded queries on the two confirmed non-default isolated Neon branches show:
- Both projects have **zero PAID submission_see purchases and zero ACTIVE submission_see entitlements**.
- Each has two PAID planning_controls_pack records. Those records are not proof of SEE payment.
- Byron selected pack/memo exist, are not stale, and match project/pack/QSC bindings; council labels are canonical. Kempsey current memo matches its project and its council is canonical.
- No customer names, emails, payment/session secrets, raw document payloads or financial amounts were published. No purchase or entitlement was altered.

Code tracing finds the current customer checkout/webhook wiring is for Planning Controls Pack. SEE pricing and planning-pack-credit helpers exist, but a customer SEE checkout path has not yet been established. Do not rerun the planning-pack payment flow or fabricate SEE entitlements to make document testing pass.

Next bounded task: establish and implement the legitimate Preview SEE purchase/credit path using approved commercial terms, then obtain genuine Stripe test payment evidence and rerun document generation/download/reopening. Preserve working-document warnings, exact project/proposal scope, idempotency and protected independent council fixtures. No Production activation, migration or merge.

The separate current-source/applicability gate remains open (Byron's current D1-D4 listing is effective 1 October 2026). Commercial decision remains **HOLD**.

## Source wiring inspection

At application commit `4178f32db4424d41b2d8cb316cc8d5ba8ab64b7f`, `SubmissionSeeCreditPersistenceService` provides quote/reserve/consume/release logic, but source-wide symbol/import searches found no application callers. Existing customer checkout and Stripe integration use Planning Controls Pack terms. These helpers are not proof of a working SEE purchase journey.

## Next bounded implementation

Trace and reuse the existing purchase, entitlement and Stripe webhook infrastructure; connect SEE checkout to approved SEE commercial terms and exact project/proposal scope. Apply planning-pack credit only where its existing eligibility and ledger rules permit. Preserve idempotency, failure/cancellation handling and signed webhook validation. Add synthetic regression coverage before any isolated Preview rollout. Confirm test-mode Stripe and exact isolated targets before creating new sessions. Do not change prices, manufacture PAID purchases/entitlements, weaken source gates or repeat Planning Controls Pack purchases.

Only after genuine test payment grants correct scoped SEE access should both council document journeys be rerun. Inspect current authoritative source content and resolve applicability/freshness before claiming commercial readiness. Do not reuse historical acceptance as evidence for new deployments.

## Deployment and continuity boundaries

This handover-only update stays on draft PR #452's feature branch with automatic deployment disabled. Both ready rehearsal SHAs above remain unchanged. Preserve all unrelated branches and immutable evidence. No merge, deployment, schema mutation, Production activation or new payment was performed for this documentation update.
