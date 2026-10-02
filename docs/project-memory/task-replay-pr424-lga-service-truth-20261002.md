# Codex replay task — truthful paid LGA preparation timing and failure resolution

Status: **PREPARED FOR THE POST-#452 LINEAGE / REIMPLEMENT AGAINST CURRENT CODE**

Historical source: PR #424 / Issue #423.

## Purpose

Reapply the still-valid paid Local Controls / Planning Controls Pack service-truth contract after the current #452 commercial document lane is resolved.

The current canonical commercialisation document already promises:
- user-facing preparation status;
- target turnaround **within 2 business days of payment**;
- operator resolution when delivery fails;
- full refund to original method only when the promised pack cannot be generated/persisted;
- no claim that a refund is complete until signed/provider confirmation;
- a truthful persisted pack with unresolved controls is delivered value, not an automatic refund.

The current UI still says queued preparation `usually takes a few minutes`. That wording is inconsistent with the current commercial contract and must not survive launch.

## Why replay instead of merge

PR #424 introduced:
- a new `lga-preparation-service.ts`;
- API response fields;
- hook/UI changes;
- focused tests.

Those files were built on the old parallel main. The current route/hook/panel have evolved and #452 carries newer commercial/source behaviour. Reimplement the contract against the current files instead of cherry-picking #424.

## Truthful service-time design

Do **not** blindly copy the historical fixed-`24h` weekday loop.

The user-facing promise says **business days**, while the old implementation:
- excluded weekends only;
- did not account for NSW public holidays;
- advanced timestamps in fixed 24-hour increments, which can shift local clock time across Australia/Sydney daylight-saving transitions.

Before implementation, choose and document one truthful contract:

### Preferred
Implement a deterministic Australia/Sydney business-calendar calculation that:
- operates on Sydney local calendar dates/times;
- handles weekend transitions correctly;
- handles daylight-saving transitions without shifting the intended local service time;
- accounts for NSW public holidays through an explicit maintained deterministic source.

### If public-holiday support is deliberately deferred
Do not label the exact date as a fully business-day-aware deadline. The API/UI must clearly distinguish:
- the product SLA (`within 2 business days`), and
- any displayed **weekday-only indicative target**.

Never imply public-holiday-aware precision that the code does not provide.

## Failure-resolution contract

Preserve these distinctions:

- `IN_PROGRESS`
- `OVERDUE_REVIEW_REQUIRED`
- `DELIVERED`
- `DELIVERED_WITH_UNRESOLVED_CONTROLS`
- `REFUND_REVIEW_REQUIRED`
- `REFUND_PENDING_PROVIDER_CONFIRMATION`
- `REFUNDED`

Rules:
1. Worker `COMPLETED` without the promised persisted pack is not delivery.
2. A persisted pack with unresolved controls can be delivered value if it truthfully identifies those unresolved controls.
3. A failed/non-delivered paid pack requires operator refund review.
4. Refund requested is not refund complete.
5. Only payment-provider confirmation may set `REFUNDED`.
6. Raw worker exceptions must never be exposed to the browser.
7. Do not implement an automatic provider refund call as part of this replay unless separately authorised.

## API behaviour

Rebuild the coverage API from the current route.

It should return only the minimum truthful fields needed by the UI, such as:
- LGA code;
- coverage maturity;
- active preparation/job status;
- service target/indicative target where truthful;
- sanitised resolution state;
- last updated time.

For `FAILED_REVIEW_NEEDED`, use the correct latest failed job record if the active pointer has already been cleared.

Do not expose raw exception/error payloads.

## UI behaviour

Replace `This usually takes a few minutes`.

Queued/processing copy must align with the service contract.

Failure copy must:
- say operator review is required;
- explain that a refund is only complete after provider confirmation;
- avoid promising an automatic refund before the delivery/refund facts support it.

Keep normal guidance available while background local controls are unresolved, consistent with JIT LGA Activation.

## Tests

At minimum cover:
- two-day calculation over a weekend;
- Australia/Sydney DST transition;
- NSW public holiday handling if the implementation claims business-day-aware target dates;
- invalid dates;
- worker completed but promised pack absent;
- unresolved-but-persisted pack;
- failed job before refund request;
- refund requested but not provider-confirmed;
- provider-confirmed refund;
- impossible provider confirmation without refund request;
- API failed-job lookup after active pointer is cleared;
- sanitised browser response;
- UI copy for queued/processing/failure;
- current polling behaviour unchanged.

## Guardrails

- Rebuild from then-current main.
- No Stripe/payment-provider write.
- No actual refund.
- No checkout activation.
- No Production configuration/deployment.
- No schema change unless current code inspection proves it is strictly required and separately reviewed.
- No weakening of current commercial/source gates.

## Output

Report:
1. chosen business-calendar truth contract;
2. files changed;
3. exact tests/checks and results;
4. any remaining operator/payment-provider step that still requires human action.
