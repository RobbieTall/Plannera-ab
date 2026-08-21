# Item 74G persistent submission SEE credit ledger

Status: **SCHEMA AND ADAPTER IMPLEMENTED / MIGRATION NOT APPLIED / CHECKOUT NOT EXECUTED**

## Purpose

Persist the exact-scope A$49 Planning Controls Pack credit against the A$749 submission SEE without making browser input, Stripe metadata or mutable application state authoritative.

This slice is repository code only. It does not apply a migration, write a credit row, create checkout, enable a flag, merge a PR or alter Production.

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

The unapplied migration enforces:

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

## Deterministic acceptance

The focused workflow generates Prisma without database access and proves:

- server-derived A$749 / A$49 / A$700 terms;
- one persistent exact-target reservation;
- replay idempotency;
- second-target denial;
- consume-after-paid behavior;
- permanent consumed-credit denial;
- release only after an unpaid terminal state;
- reuse after release;
- changed-scope denial; and
- refunded or revoked source denial.

## Activation boundary

Before any database execution:

1. Review the migration and service on draft PR #346.
2. Obtain explicit approval for one protected Preview schema application.
3. Confirm the target is `preview/agent/item74f-see-credit` and never Production.
4. Apply the migration only to that Preview.
5. Run a dedicated non-customer lifecycle proving reserve, replay, consume, release and concurrency behavior.
6. Record privacy-safe row IDs, statuses and run evidence only.
7. Keep Production checkout disabled.

Production migration, checkout activation, Stripe execution and merge remain separate explicit decisions.
