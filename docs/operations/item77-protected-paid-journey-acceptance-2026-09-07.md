# Item 77 protected paid-journey acceptance

Status: **STRIPE PAID LIFECYCLE ACCEPTED / PROTECTED JOURNEY CONTRACT ACCEPTED / DURABLE CROSS-JOURNEY BINDING NOT YET EXECUTED / PRODUCTION DISABLED**

Date: 2026-09-07 (Australia/Sydney)

## Purpose

This record reconciles the protected Stripe test-mode payment proof with the Item 77 commercial-journey proof at repository commit `1b53bee0ad68653904cf01a4a51248bbfc2ea10e`.

It deliberately distinguishes independently accepted contracts from the still-unfinished durable same-project customer journey. It contains no Checkout Session ID, credential, signed access URL, customer address, private document, parcel identifier or secret value.

## Accepted Stripe test lifecycle

A fresh authenticated Stripe Sandbox checkout was completed manually in test mode. Production checkout remained disabled.

The first paid acceptance run passed:

- workflow: Stripe Test-mode Acceptance;
- run: [#62](https://github.com/RobbieTall/Plannera-ab/actions/runs/34093625892);
- phase: `paid`;
- result: every acceptance check passed;
- persistence: exactly one Planning Controls Pack was created.

The exact paid session was then replayed:

- workflow: Stripe Test-mode Acceptance;
- run: [#63](https://github.com/RobbieTall/Plannera-ab/actions/runs/34093830006);
- phase: `paid`;
- result: every acceptance check passed;
- persistence: the existing Planning Controls Pack was reused and no second pack was created.

This proves persistent paid replay idempotency for the A$49 Planning Controls Pack on the protected Stripe Preview path.

## Accepted commercial-journey contract

The current main revision passed the dedicated Item 77 gate:

- workflow: Item 77 protected commercial journey;
- run: [#2](https://github.com/RobbieTall/Plannera-ab/actions/runs/34094158230);
- result: success;
- protected scope: exact-scope credit, progressive evidence regeneration, renderer safety, long-clause progressive disclosure, and qualified working DOCX/PDF generation.

The protected hosted customer-story deployment `dpl_6dA75H3MEovsPLTQCPXDrLuWSPgx` also returned HTTP 200 at its branch-gated internal route. It presents Property Check, the A$49 pack, later evidence, A$49 credit and the A$749 working SEE while keeping checkout disabled and unresolved evidence visible.

## Boundary that is not yet accepted

The two proofs above are not yet one durable runtime transaction.

The paid Planning Controls Pack created by the Stripe acceptance path has not yet been loaded by the private-evidence and SEE acceptance path as the same persisted project and exact commercial scope. The current Item 77 gate composes reviewed contracts and synthetic working outputs; it does not prove that a newly paid database record receives later private evidence, a persistent single-use credit and downloadable regenerated files.

Do not describe Item 77 as fully executed until that binding is proven.

## Next acceptance slice

Build one protected Preview-only orchestration that:

1. resolves the paid test session server-side without exposing it in logs or artefacts;
2. loads the single persisted A$49 pack and its exact project, site and evidence scope;
3. accepts only synthetic private evidence through the private quarantine, malware-scan and operator-review boundaries;
4. strengthens that same purchased project without creating a second pack or purchase;
5. persists and consumes the A$49 credit exactly once toward the same-scope A$749 working SEE;
6. generates authenticated, provenance-backed working DOCX and PDF outputs labelled not submission ready;
7. replays the complete journey without duplicate pack, credit, SEE or evidence records;
8. reconciles synthetic records and objects to zero residue;
9. completes the documented full Stripe test refund only after paid-state checks finish; and
10. continues to prove Production checkout and Production mutation are disabled.

The orchestration must fail closed on cross-project ownership, evidence-digest mismatch, stale or unreviewed evidence, altered proposal scope, duplicate credit use, non-test Stripe sessions and any Production environment.

## Commercial interpretation

Plannera has now proven the payment lifecycle and the evidence-aware product contracts separately. The highest-impact unfinished Item 77 work is no longer another isolated contract test. It is the durable protected Preview bridge that turns those accepted pieces into one repeatable customer journey.

Production checkout remains disabled. No Production data, schema, credential or live payment change is authorized by this record.
