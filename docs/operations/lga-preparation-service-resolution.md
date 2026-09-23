# Paid LGA preparation service target and failed-preparation resolution

Status: **CONTRACT + CUSTOMER STATUS SURFACE IMPLEMENTED ON FEATURE BRANCH / NO REFUND EXECUTION**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #423.

## Purpose

The Just-in-Time LGA preparation engine already has queued, processing, ready and failed states. This slice aligns that technical workflow with the approved A$49 Planning Controls Pack commercial promise.

The product promise is **within 2 business days of payment**, not “a few minutes”.

## Service target

`getLgaPreparationServiceTarget()` calculates a deterministic two-weekday target from the preparation request timestamp.

- Saturdays and Sundays do not count.
- This first deterministic contract does not contain a NSW public-holiday calendar. The UI therefore describes an exact date, when available, as the **current weekday target**, not an unconditional statutory/business-day guarantee.
- The contractual user-facing promise remains “within 2 business days”.

The read-only `/api/lga/coverage` response exposes the active/latest failed preparation status and target date without exposing raw worker errors.

## Failure resolution contract

`resolveLgaPreparationCommercialOutcome()` distinguishes:

- `IN_PROGRESS`: preparation remains inside the target window;
- `OVERDUE_REVIEW_REQUIRED`: no failed job yet, but the target has elapsed;
- `DELIVERED`: the promised pack was persisted;
- `DELIVERED_WITH_UNRESOLVED_CONTROLS`: a truthful persisted pack exists and identifies unresolved topics; expert review is the next path, not an automatic refund;
- `REFUND_REVIEW_REQUIRED`: preparation failed and the promised pack was not delivered;
- `REFUND_PENDING_PROVIDER_CONFIRMATION`: an operator requested a refund but payment-provider confirmation is not yet authoritative;
- `REFUNDED`: only after authoritative provider confirmation.

The contract cannot mark a refund complete from an application-side request alone.

## Customer status surface

The workspace LGA panel now:

- replaces “usually takes a few minutes” with “Service target: within 2 business days”;
- shows the current weekday target when the API can resolve it;
- keeps baseline planning guidance available while preparation runs;
- for `FAILED_REVIEW_NEEDED`, states that operator review is required;
- does not display raw worker exception text; and
- does not say a refund is complete without provider confirmation.

## Security and commercial boundary

This slice does **not**:

- call Stripe or any payment provider;
- issue, initiate or persist a real refund;
- change checkout;
- activate Production;
- modify protected environment settings;
- guarantee that a public holiday cannot affect the current weekday target;
- treat unresolved controls as false/absent.

Production and checkout remain unchanged.

## Next integration slices

1. Bind the resolution contract to the exact paid Planning Controls Pack entitlement/purchase when Production launch work is separately approved.
2. Add operator resolution tooling for failed/overdue preparations.
3. Store provider refund request/confirmation evidence before any customer state can become `REFUNDED`.
4. If exact Australian public-holiday due dates are required, add a versioned holiday calendar rather than silently guessing.
5. Run protected non-production commercial acceptance for queued → ready and queued → failed/resolution paths.
