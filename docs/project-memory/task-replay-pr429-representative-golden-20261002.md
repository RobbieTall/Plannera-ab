# Codex replay task — representative Byron R2 and Kempsey SP2 golden journeys

Status: **PREPARED FOR THE POST-#452 LINEAGE / DO NOT CHERRY-PICK PR #429 WHOLESALE**

Historical source: PR #429 / Issue #427.

## Purpose

Recreate the still-valid representative golden journeys from PR #429 on the then-current main **after PR #452's commercial document lane is resolved**.

This is a tests/docs-only hardening task. Do not modify Production behaviour to make the tests pass.

## Why replay instead of merge

PR #429 was built as a parallel branch from the 17 September main. Its only product-code surface is the commercial golden test file plus historical documentation. The current #452 lineage has since changed the commercial/document evidence model.

Therefore:
- do not cherry-pick the old test file wholesale;
- start from the current `tests/commercial-funnel-golden.test.ts`;
- carry forward only the two representative journeys and the minimum fixture generalisation they require;
- preserve all current source-capture, provenance, paid-scope and fail-closed behaviour.

## Required journeys

### Byron R2 — 33 Lorikeet Lane, Mullumbimby

Retain the reviewed fixture intent:
- LGA: BYRON;
- zone: R2 Low Density Residential;
- representative proposal: existing dwelling with a 24 sqm storage shed ancillary to the reviewed residential use;
- permissibility fixture may state `Dwelling houses` as permitted with consent only where the current reviewed test source supports it;
- no proposal-specific DCP evidence is invented.

Expected terminal behaviour:
1. saved site/address/zone remain server-authoritative; forged caller site scope is rejected/ignored;
2. Quick Site Check remains truthful to the R2 fixture;
3. Detailed Planning Pack can persist only as unresolved where the DCP topics have no applicable cited evidence;
4. it must not claim commercial readiness;
5. pre-SEE/SEE generation must fail closed if the current compiler requires cited DCP evidence;
6. expert review/referral remains available for the unresolved pack;
7. the audit terminal state remains an unresolved-pack referral path rather than a false SEE-ready path.

### Kempsey SP2 — 32 Smith St, Kempsey

Retain the reviewed fixture intent:
- LGA: KEMPSEY;
- zone: SP2 Infrastructure;
- this is an identity/fail-closed case, not a synthetic land-use-rights case.

Expected terminal behaviour:
1. site identity stays SP2 and must not leak into the existing E2 commercial fixture;
2. no synthetic zone objectives or permitted/prohibited uses are invented;
3. Quick Site Check must not present unsupported LEP evidence as `Cited`;
4. if current QSC quality gates require cited planning controls, Detailed Planning Pack generation must stop before persistence;
5. zero paid DPP/SEE artefacts are created from unsupported SP2 evidence;
6. audit remains unresolved/missing with a truthful next action;
7. output contains no E2/Commercial premises leakage.

## Current-lineage requirements

Before editing:
- inspect the current `tests/commercial-funnel-golden.test.ts`;
- inspect current QSC quality checks, DPP creation, pre-SEE generation and commercial audit code;
- inspect any #452 source-capture/provenance requirements that now apply;
- do not downgrade current acceptance rules to recreate historical test expectations.

The replay may need fixture-shape changes because the current golden fixture still assumes only SP3/E2 and a mandatory height value. Generalise only as far as the two new fixtures require.

## Acceptance criteria

All must pass:

1. Existing Byron SP3 journey unchanged.
2. Existing Kempsey E2 journey unchanged.
3. New Byron R2 journey passes with no invented DCP evidence.
4. New Kempsey SP2 journey passes without E2 leakage or fabricated LEP confidence.
5. Forged caller scope remains rejected/server-overridden.
6. Existing commercial/source/provenance tests remain green.
7. No Production code behaviour is weakened or changed to satisfy the tests.
8. Full TypeScript passes.
9. Commercial Funnel Golden Gate passes.
10. Whole-LGA/source-matrix and soft-launch checks applicable to the then-current main pass.
11. No merge/deployment/Production/configuration action is performed by the task.

## Files

Expected primary file:
- `tests/commercial-funnel-golden.test.ts`

Add/update the current runbook only if required. Do not import old September continuity documents wholesale.

## Output

Report:
1. what was replayed and what changed from historical #429;
2. files changed;
3. exact tests/checks and results;
4. any current product rule that made an old #429 expectation obsolete.
