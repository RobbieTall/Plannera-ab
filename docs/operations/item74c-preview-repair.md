# Item 74C isolated Preview evidence repair

This runbook covers the one-time evidence repair for draft PR #343. It is not a Production procedure.

## Safety boundary

The utility at `scripts/item74c-preview-repair.ts` is intentionally not wired into `package.json`, normal Vercel builds, GitHub Actions, or any public route.

It refuses to run unless all of these conditions are true:

- `ITEM74C_PREVIEW_WRITE_APPROVED=1` is supplied for the one approved invocation;
- Vercel reports `VERCEL_ENV=preview`;
- Vercel reports the exact Git branch `agent/item74c-whole-lga-matrix`;
- `PLANNING_PACK_CHECKOUT_ENABLED` is absent or disabled.

The current isolated Neon branch is `preview/agent/item74c-whole-lga-matrix` (`br-frosty-recipe-a78wm53r`). The Production/main branch must not be targeted.

The utility never prints `DATABASE_URL`, admin tokens, exception messages, or secret values. Failure output is limited to a fixed stage label and error type. It performs no schema operation.

## Authoritative source boundary

Byron acceptance requires the complete current source set linked by the Byron Shire Council DCP 2014 page:

- Part A;
- Chapters B1 and B3 through B15;
- Chapters C1 through C4;
- Chapters D1 through D7 and D9;
- Chapters E1 through E11; and
- Chapter F1.

That is 39 pinned official council PDFs. The old two-file local D1/B4 corpus is not whole-LGA evidence and must never be certified.

Kempsey acceptance requires all five official DCP 2026 parts, A through E, from the Kempsey Shire Council page.

Each ingestion must fetch every required file, verify the PDF signature, extract substantial text, and represent every pinned source key before opening its database transaction. Missing or invalid source material therefore causes no partial corpus write.

## Evidence operations

After explicit owner approval, one Vercel Preview invocation will:

1. Fetch, validate, parse, and atomically replace all 39 official Byron DCP 2014 sources.
2. Fetch, validate, parse, and atomically replace all five official Kempsey DCP 2026 parts.
3. Set each newly searchable corpus to `SEARCHABLE_READY`, never directly to `VERIFIED`.
4. Repair Kempsey LEP provenance to the current official NSW legislation source.
5. Confirm Byron DCP document and chunk provenance against the official council source set.
6. Re-check exact Byron and Kempsey zone sets, non-empty objectives and land uses, permission profiles, current LEP clauses, current DCP slugs, the exact 39-source Byron manifest, all five Kempsey parts, authoritative document URLs, and source chunks.
7. Promote Byron and Kempsey coverage to `VERIFIED` only if every check passes.

Each DCP ingestion commits before the final certification transaction. If a later ingestion or certification step fails, the affected coverage remains below `VERIFIED` and the launch gate remains red. This is deliberately fail-closed.

## CI enforcement

The `Whole-LGA source matrix enforcement` workflow must retain both protections:

- normal `vercel-build` runs `smoke:launch`, then `smoke:whole-lga`, then `next build`, with no schema push; and
- focused Byron, Kempsey, and admin ingestion tests run on the protected PR path.

Do not remove these checks to accelerate a deployment.

## Approval and execution

Do not execute the utility merely because it exists in the branch. Record explicit owner approval in the PR conversation first.

For an approved one-time deployment, temporarily prepend the protected Vercel Preview build with:

```bash
ITEM74C_PREVIEW_WRITE_APPROVED=1 npx tsx scripts/item74c-preview-repair.ts
```

The same commit must retain the Vercel Preview and branch guards. After the one approved invocation:

- remove the temporary build hook immediately;
- redeploy the clean head;
- run `npm run smoke:launch` first;
- run `npm run smoke:whole-lga` second;
- allow Next.js build only after both gates pass;
- record exact-head results in PR #343; and
- keep the PR draft and Production checkout disabled until whole Item 74 acceptance is complete.

Any unexpected branch, environment, enabled checkout flag, missing DCP source, partial corpus, stale slug, evidence mismatch, or QA failure must stop the run. Do not weaken a check, invent source text, or promote coverage manually to make it green.
