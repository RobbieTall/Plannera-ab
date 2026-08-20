# Item 74E Preview evidence lineage

## Purpose

Item 74E depends on the Byron and Kempsey whole-LGA evidence accepted by Item 74D. A Git branch based on `agent/item74d-spatial-provenance` does not automatically make its Vercel-created Neon Preview branch a child of the Item 74D Neon branch.

This runbook keeps the hosted acceptance path fail-closed and prevents a stale Preview database from being mistaken for a code failure or repaired by weakening launch evidence.

## Current authoritative state

As at 2026-08-21:

- Item 74E Git branch: `agent/item74e-submission-see`
- Item 74E Neon Preview: `preview/agent/item74e-submission-see`
- Item 74E Neon branch ID: `br-quiet-king-a71v3lv9`
- Item 74E branch parent: verified Item 74D Preview `br-sweet-pine-a7m4u4fk`
- Item 74E branch writes at creation: zero bytes
- Verified Item 74D Neon Preview: `preview/agent/item74d-spatial-provenance`
- Verified Item 74D branch ID: `br-sweet-pine-a7m4u4fk`
- Production branch ID: `br-odd-pine-a7nph47f`
- Production data and schema changes: none
- Production checkout: disabled

The previous Item 74E Neon branch `br-winter-wind-a7otcmlx` inherited older Production evidence. Its Vercel build correctly blocked `npm run smoke:launch` with 14 green and 4 red. After explicit approval, the branch was reconfirmed as non-Production, unprotected and zero-write, then deleted.

The replacement `br-quiet-king-a71v3lv9` was created with the exact Vercel integration name and directly forked from verified Item 74D evidence. Its parent lineage and zero-write creation state were confirmed before redeployment.

The verified Item 74D Preview has:

- Byron and Kempsey coverage `VERIFIED`
- Byron DCP clauses/source chunks: 826/826
- Kempsey DCP clauses/source chunks: 1496/1496
- official HTTPS LEP, DCP and spatial provenance
- whole-LGA acceptance: 60 green, 0 red
- launch acceptance: 18 green, 0 amber, 0 red

## Recovery and acceptance sequence

1. Obtain explicit approval before deleting or replacing the stale Item 74E Preview branch. Completed.
2. Confirm the target is non-Production, unprotected, stale and zero-write. Completed.
3. Delete only stale branch `br-winter-wind-a7otcmlx`. Completed.
4. Create `preview/agent/item74e-submission-see` from `br-sweet-pine-a7m4u4fk`. Completed as `br-quiet-king-a71v3lv9`.
5. Trigger a fresh deployment from the current draft PR head. In progress through this runbook commit.
6. Stop if Vercel does not bind the replacement branch automatically. Do not copy or print a connection string.
7. Require `npm run smoke:launch` to report 18 green, 0 amber and 0 red.
8. Require `npm run smoke:whole-lga` to report 60 green and 0 red.
9. Keep the PR draft and unmerged until the protected Preview and document review gates are complete.

## Forbidden shortcuts

Do not:

- mutate Production data or schema
- enable `PLANNING_PACK_CHECKOUT_ENABLED` in Production
- mark coverage `VERIFIED` without the accepted whole-LGA evidence
- patch source URLs merely to satisfy string validation
- delete or reduce DCP clauses or source chunks to match stale data
- copy DCP rows manually between branches
- expose, print, download or commit `DATABASE_URL`
- weaken `smoke:launch`, `smoke:whole-lga` or Submission SEE acceptance
- merge the stacked Item 74D or Item 74E PRs while required checks are red

## Submission SEE output evidence

Current Item 74E renderer evidence is synthetic and contains no customer, address, parcel or credential data.

- GitHub generates deterministic DOCX and PDF files.
- The DOCX ZIP package and PDF signature/xref are validated in CI.
- The PDF has a visually reviewed three-page layout with complete section blocks, title-cased headings, source register, limitations and page footers.
- macOS Quick Look confirms the DOCX static contents list and no visible page-break marker.
- Full Word/LibreOffice page-faithful DOCX review remains an operator gate when that renderer is available.

## Safety invariant

Production checkout stays disabled, Production data stays unchanged, and every hosted acceptance result must be evidence-based. A red launch gate is a release block, not an instruction to weaken the gate.
