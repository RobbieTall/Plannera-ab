# Item 74G persistent submission SEE credit ledger

Status: **PREVIEW MIGRATION APPLIED / PROTECTED LIFECYCLE PREPARED BUT NOT EXECUTED / CHECKOUT DISABLED**

## Purpose

Persist the exact-scope A$49 Planning Controls Pack credit against the A$749 submission SEE without making browser input, Stripe metadata or mutable application state authoritative.

Production checkout, Production migration, Stripe execution and merge remain outside this slice.

## Persistent facts

Each ledger row stores:

- source Planning Controls Pack entitlement ID;
- unique target submission SEE purchase ID;
- deterministic idempotency key;
- exact submission SEE scope key;
- server-derived A$749 list amount;
- server-derived A$49 credit;
- server-derived A$700 payable amount;
- AUD currency;
- RESERVED, CONSUMED or RELEASED state; and
- immutable reservation plus terminal timestamps.

Raw proposal text, address, parcel, credentials and provider payloads are not stored. The scope key contains the existing normalized proposal fingerprint, not the proposal itself.

## Database enforcement

Migration `20260821000000_submission_see_credit_ledger` enforces:

- one ledger row per target purchase;
- one idempotency key;
- at most one RESERVED or CONSUMED row per source entitlement;
- permanent non-reuse after CONSUMED;
- reuse only after RELEASED;
- exact 74,900 / 4,900 / 70,000 AUD amounts; and
- state-consistent terminal timestamps.

Foreign keys bind the credit to the settled Planning Controls Pack entitlement and submission SEE purchase. Both deletes are restricted.

## Service boundary

`SubmissionSeeCreditPersistenceService`:

- derives the quote from the exact entitlement and persisted ledger;
- requires the target purchase to match requester, project, current-site QSC, proposal fingerprint, product and version;
- reserves only a PENDING A$700 submission SEE purchase;
- makes same-target reservation replay idempotent;
- resolves database uniqueness races fail-closed;
- consumes only an exact PAID purchase while the source entitlement is still ACTIVE;
- makes consumption replay idempotent;
- releases only FAILED or CANCELLED unpaid purchases; and
- never releases or reuses a consumed credit.

Serializable transactions and database constraints provide the concurrency boundary. Provider-specific checkout and webhook handling remain outside this service.

## Applied Preview checkpoint

With explicit approval, the exact committed migration was applied atomically on 21 August 2026 to:

- Neon project: `plannera-ab-db`;
- branch: `preview/agent/item74f-see-credit`;
- branch ID: `br-winter-lake-a7kfbv6z`;
- parent: verified Item 74E branch `br-quiet-king-a71v3lv9`; and
- database: `neondb`.

The migration is recorded in `_prisma_migrations`. Read-only reconciliation on 24 August 2026 confirmed the table and migration record exist and the ledger contains zero rows.

No Production data, schema or configuration changed.

## Protected lifecycle harness

`npm run accept:submission-see-credit-preview` is disabled unless `SUBMISSION_SEE_CREDIT_ACCEPTANCE_ENABLED=true`.

When enabled, it fails closed unless all of these are true:

- execution is inside Vercel Preview;
- Git ref is exactly `agent/item74f-see-credit`;
- the database host starts with the isolated Preview endpoint `ep-winter-fog-a76nvixu`;
- Planning Controls Pack checkout is not enabled; and
- submission SEE checkout is not enabled.

The harness uses only synthetic `.invalid` identity data and demo-marked fixtures. It proves exact pricing, one concurrent reservation winner, reservation replay, one persistent row, changed-scope denial, paid consumption replay, consumed-credit denial, cancelled release replay, released-source reuse and exact terminal rows.

All fixture IDs are scoped to a random `item74g-` run prefix. Cleanup runs in `finally` and deletes only those exact synthetic fixture IDs. It never calls Stripe, creates checkout or touches customer rows.

The Vercel build invokes the harness on every deployment, but it exits successfully without database access while the flag is absent. Enabling the flag and redeploying is the separate Preview-write approval boundary. Remove the flag immediately after the one accepted run.

## Existing hosted evidence

Exact repository head `040c9cfed58ad438850dfca067a638a88ae8f92e` passed before the harness preparation:

- Submission SEE Credit Contract `32437533746`;
- Commercial Funnel Golden Gate `32437533667`;
- Vercel Preview `dpl_J1B9CBoT7LbvgsBg3xk2kSQVNBYE`;
- `smoke:launch`: 18 green, 0 amber, 0 red; and
- `smoke:whole-lga`: 60 green, 0 red.

The harness preparation head must independently pass the same gates with acceptance disabled before any Preview write is authorised.

## Remaining activation boundary

1. Require exact-head GitHub and Vercel green with acceptance disabled.
2. Obtain explicit approval for synthetic Preview writes.
3. Set the one-shot flag only for the Item 74F Preview branch.
4. Redeploy the exact reviewed head.
5. Require every lifecycle check and cleanup to pass.
6. Confirm the credit ledger returns to zero rows.
7. Remove the one-shot flag immediately.
8. Record privacy-safe hosted evidence.

Production migration, checkout activation, Stripe execution and merge remain separate explicit decisions.
