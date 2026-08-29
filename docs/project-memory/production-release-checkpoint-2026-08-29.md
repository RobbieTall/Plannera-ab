# Production release checkpoint: 29 August 2026

Status: **PRODUCTION HEALTHY / CHECKOUT DISABLED / SCHEMA-BEARING WORK HELD**

This checkpoint records the authoritative release state after reconciling the open pull-request stack against current `main`. It is an operating record, not a claim that Item 74 or Item 74H is commercially complete.

## Current Production baseline

- Repository: `RobbieTall/Plannera-ab`
- Current accepted application baseline: `f6f7aeb629bd367ca0428fcdcbfde1d7e6d16664`
- Vercel Production deployment: `dpl_EKF7JBJwUi2voLUK4hURyVW3nq8s`
- Production deployment state: `READY`
- Production alias: `https://plannera-ab.vercel.app/`
- Live response: HTTP 200 from the exact deployment above
- `npm run smoke:launch`: 18 green, 0 amber, 0 red
- `npm run smoke:whole-lga`: 60 green, 0 red
- Next.js compile, lint/type validation, static generation and deployment: passed
- `PLANNING_PACK_CHECKOUT_ENABLED`: off/false
- Production database/schema mutation during the release: none

## Accepted release slices

- PR #343: fail-closed Byron/Kempsey whole-LGA source matrix.
- PR #344: fail-closed spatial-provenance contract and live NSW evidence gates.
- PR #345: inert A$749 submission SEE acceptance, evidence assembly, section compilation and deterministic DOCX/PDF rendering foundation.
- PR #349: approved evidence-preserving Byron/Kempsey Production planning-data repair.
- PR #350: repair-tool cleanup and removal of the temporary Production write approval.

The Production planning corpus currently passes the launch gates with:

- Byron: verified coverage, current LEP projections, 826 referenced DCP clauses and 826 source chunks.
- Kempsey: verified coverage, current LEP projections, 1,496 referenced DCP clauses and 1,496 source chunks.

These results do not certify every address, every proposal, paid checkout, real operator approval or a customer-ready submission SEE.

## Idempotent Production planning-data revalidation

The one-time evidence-preserving Production corpus repair completed under PR #349, and PR #350 removed its temporary write hook. A later approval to repair the same evidence does not by itself justify repeating ingestion or replacing already accepted rows.

Before any repeat Byron/Kempsey Production write:

1. Confirm the accepted PR #349 evidence and PR #350 cleanup remain represented on `main`.
2. Run `npm run smoke:launch` first and `npm run smoke:whole-lga` second in Vercel's protected Production build environment.
3. Treat exact green results of 18/0/0 and 60/0, with the accepted 826/826 Byron and 1,496/1,496 Kempsey corpus evidence, as a no-op repair.
4. Perform a data write only for a genuine evidence mismatch identified by a red gate, and limit the transaction to the affected evidence.
5. Never reintroduce a persistent Production write hook, change schema, enable checkout, weaken a gate or replace authoritative evidence merely to force a rerun.

A no-op revalidation is the successful safe outcome when the accepted corpus has not drifted.

## Intentionally unmerged work

The following PRs remain open because merging them would introduce code expecting Production schema migrations that have not been approved or applied:

- PR #346: A$49 submission SEE credit ledger and migration `20260821000000_submission_see_credit_ledger`.
- PR #347: Item 74H Pathway Check and six additional persistence/private-evidence migrations; also depends on PR #346.
- PR #337: reviewed spatial-evidence schema and migration `20260803110000_add_spatial_evidence_review`.
- PR #338: upload/spatial evidence applicability and topic migrations; also depends on PR #337.

Preview migration evidence is not Production migration authority. Do not merge these PRs merely to reduce the open-PR count.

## Item 74H truth boundary

The controlled Byron shed/outbuilding pathway is implemented and protected in Preview, but the actual site remains `MORE_EVIDENCE_REQUIRED`.

User-attested shed dimensions are useful preliminary inputs, not survey-grade facts. Paid A$49 and A$749 outputs remain blocked until the evidence graph contains the required current authoritative road classification, accepted site/survey evidence, reviewed proposal measurements, remaining mapped constraints, exact upload set and operator approval.

The free Pathway Check, A$49 Planning Controls Pack and A$749 SEE must continue to share one versioned evidence graph and one deterministic STOP / PROCEED / MERIT / MORE_EVIDENCE_REQUIRED decision. Do not create a parallel or weaker paid path.

## Required sequence before the next schema merge

1. Reconcile PR #337/#338 against PR #347 and explicitly decide what is still required versus superseded.
2. Preserve the PR #345 -> PR #346 -> PR #347 commercialisation dependency order.
3. Produce an exact additive Production migration set and rollback/recovery procedure.
4. Create and verify a fresh Production recovery branch.
5. Obtain explicit owner approval for the exact Production schema change.
6. Apply only the approved migration set without enabling checkout.
7. Reconcile database migration history and require zero unexpected rows or residue.
8. Retarget and synchronize the selected PR against then-current `main`.
9. Require fresh exact-head GitHub checks, Vercel Preview, `smoke:launch` and `smoke:whole-lga`.
10. Merge only while checkout remains disabled, then require a green Production deployment.

## Non-negotiable operating rules

- Never reveal or copy `DATABASE_URL` or other credential values.
- Never weaken a red evidence gate to make it green.
- Never promote synthetic or user-attested values into verified evidence.
- Never treat a structurally valid DOCX/PDF as operator-approved customer output.
- Never enable Production checkout as part of schema readiness.
- Keep Item 72C implemented/not executed until its protected Stripe lifecycle is deliberately resumed.
