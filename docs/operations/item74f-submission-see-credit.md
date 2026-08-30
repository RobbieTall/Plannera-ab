# Item 74F submission SEE credit contract

Status: **DOMAIN CONTRACT IMPLEMENTED / PERSISTENT LEDGER AND CHECKOUT NOT EXECUTED**

## Purpose

Item 74 prices the submission-oriented Statement of Environmental Effects at A$749 before credits. One settled, active, unrefunded and unconsumed A$49 Planning Controls Pack for the exact same commercial scope may be consumed once, leaving A$700 payable.

This contract begins the Item 74F implementation without enabling checkout, creating a payment, changing a database, applying a migration or touching Production.

## Authoritative prior evidence

The original Item 72C protected Stripe test lifecycle was already completed on one dedicated test Checkout. Its accepted evidence includes `before_payment`, `paid`, paid replay and `refunded`, A$49.00 AUD including A$4.45 GST, exactly one persistent DPP, changed-scope denial and one full test refund.

Draft PR #341 hardens replay and input-validation evidence but has not been re-executed. That does not erase the completed Item 72C lifecycle and does not prove the new SEE credit path.

## Server-derived terms

The application, not the browser, must derive:

- SEE product: `submission_see`
- product version: `v1`
- list amount: 74,900 minor AUD units
- eligible credit: 4,900 minor AUD units
- credited payable amount: 70,000 minor AUD units
- currency: AUD

A client-supplied amount, discount, product, credit or eligibility decision is never authoritative.

## Exact eligible scope

The Planning Controls Pack source entitlement must be:

- owned by the same authenticated requester;
- attached to the same canonical project;
- attached to the same current-site Quick Site Check artefact;
- attached to the same normalized proposal fingerprint;
- product `planning_controls_pack`, version `v1`;
- status `ACTIVE`; and
- not currently reserved or already consumed by another SEE purchase.

Changed requester, project, site/QSC, proposal, product or version receives no credit. A refunded or revoked pack receives no credit. The source entitlement ID and normalized fingerprint are opaque persistence fields; raw proposal text is not part of the credit ledger.

## Lifecycle contract

### Quote

A valid exact active pack returns A$749 list, A$49 credit and A$700 payable. Missing, mismatched, refunded, revoked, reserved or consumed sources return the full A$749 price with a fixed reason code.

### Reserve

Credit is reserved atomically for one target SEE purchase before provider checkout. The reservation has a deterministic idempotency key. Replaying the same target purchase returns the same reservation. Another target cannot reserve the source concurrently.

### Consume

A reservation is consumed only when the exact target SEE purchase settles successfully and the source pack entitlement is still active. Settlement replay returns the existing consumption. A released, refunded-source or revoked-source reservation cannot be consumed.

### Release

A pending reservation may be released when checkout fails or is cancelled before settlement. A released source can be reserved by a later target. A consumed credit can never be released or reused automatically.

## Current evidence

The credential-free contract workflow proves:

- canonical A$749/A$49/A$700 arithmetic;
- exact-scope eligibility;
- proposal normalization and hash-only state;
- rejection of changed requester, project, QSC, proposal, product and version;
- rejection of refunded and revoked sources;
- deterministic reservation replay;
- concurrent second-target denial;
- active-source enforcement at consumption;
- one-way consumed state; and
- safe release and later reuse only before consumption.

## Remaining implementation boundary

Before any protected Preview execution, add a reviewed provider-neutral persistence adapter and migration for:

- target SEE purchase and entitlement;
- source Planning Controls Pack entitlement;
- immutable source/target scope snapshot;
- reservation, consumption and release timestamps;
- one active reservation/consumption per source entitlement;
- one credit record per target purchase; and
- idempotent terminal transitions and reconciliation.

Then connect server-derived checkout and signed webhook settlement, add protected non-Production acceptance, apply any migration only to an explicitly approved isolated Preview, and verify checkout failure, cancellation, paid replay, source refund/revocation conflict and target refund handling.

## Safety boundary

- Production `PLANNING_PACK_CHECKOUT_ENABLED` remains false or absent.
- No SEE checkout flag exists or is enabled by this slice.
- No Stripe object, payment, refund, entitlement, credit row or database mutation is created.
- No schema or migration is applied.
- No credential, cookie, proposal, provider payload, address or parcel data is logged.
- No PR is merged and no Production activation is authorised.

## Hosted Preview acceptance evidence

Application head `aa764bd9f573b5b0f104b46dc6f045e2d04a3046` is the first Item 74F head proven through the protected hosted build.

- Submission SEE Credit Contract run `32436559596`: passed.
- Commercial Funnel Golden Gate run `32436559588`: passed.
- Vercel Preview deployment `dpl_3PM9WPpjrjRQhLGutmwDdJ7x665g`: Ready.
- `npm run smoke:launch`: 18 green, 0 amber, 0 red.
- `npm run smoke:whole-lga`: 60 green, 0 red.
- Next.js compilation, linting, type checking and deployment completed.

### Preview evidence lineage

The first Vercel-created Item 74F branch, `br-polished-pine-a7jpd3yp`, inherited from `main`. The launch gate correctly failed closed at 14 green and 4 red because that parent did not contain the verified Byron and Kempsey launch evidence. No gate was weakened and no evidence was invented.

With explicit branch-specific approval, that unprotected, zero-write Preview branch was deleted and replaced by:

- branch: `preview/agent/item74f-see-credit`
- branch ID: `br-winter-lake-a7kfbv6z`
- parent: verified Item 74E branch `br-quiet-king-a71v3lv9`
- auto-delete: disabled
- written data at creation: zero bytes

The earlier capacity cleanup deleted only archived, zero-write Item 73 branch `br-solitary-surf-a70hcj3a`, whose PR #333 was already merged and closed.

Production branch `br-odd-pine-a7nph47f`, Production data/schema/configuration, Stripe objects and checkout flags were not changed. Production checkout remains disabled.

This evidence verifies the domain contract and hosted acceptance boundary only. The persistent credit ledger, SEE checkout, Preview schema application and protected lifecycle execution remain unexecuted and require their own reviewed approval.

