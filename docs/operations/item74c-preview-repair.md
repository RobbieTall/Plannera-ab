# Item 74C isolated Preview evidence repair

This runbook covers the one-time evidence repair for draft PR #343. It is not a Production procedure.

## Safety boundary

The utility at `scripts/item74c-preview-repair.ts` is intentionally not wired into `package.json`, Vercel builds, GitHub Actions, or any public route.

It refuses to run unless all of these conditions are true:

- `ITEM74C_PREVIEW_WRITE_APPROVED=1` is supplied for the one approved invocation;
- Vercel reports `VERCEL_ENV=preview`;
- Vercel reports the exact Git branch `agent/item74c-whole-lga-matrix`;
- `PLANNING_PACK_CHECKOUT_ENABLED` is absent or disabled.

The current isolated Neon branch is `preview/agent/item74c-whole-lga-matrix` (`br-frosty-recipe-a78wm53r`). The Production/main branch must not be targeted.

The utility never prints `DATABASE_URL`, admin tokens, or secret values. It performs no schema operation.

## Evidence operations

After explicit owner approval, one Vercel Preview invocation will:

1. Fetch and parse all five official Kempsey DCP 2026 parts before starting the ingestion transaction.
2. Replace the active Kempsey DCP clause and council-source corpus with `kempsey-dcp-2026`.
3. Repair Kempsey LEP provenance to the current official NSW legislation source.
4. Repair Byron DCP document provenance to the official council source.
5. Rebuild deterministic Byron council-source chunks from the current `byron-dcp-2014` clauses.
6. Re-check exact Byron and Kempsey zone sets, non-empty objectives and land uses, permission profiles, current LEP clauses, current DCP slugs, all five Kempsey parts, authoritative document URLs, and source chunks.
7. Promote Byron and Kempsey coverage to `VERIFIED` only if every check passes.

Kempsey ingestion commits before the final certification transaction. If final certification fails, coverage remains below `VERIFIED` and the launch gate remains red. This is deliberately fail-closed.

## Approval and execution

Do not execute the utility merely because it exists in the branch. Record explicit owner approval in the PR conversation first.

For the approved one-time deployment, temporarily prepend the protected Vercel Preview build with:

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

Any unexpected branch, environment, enabled checkout flag, missing DCP part, partial corpus, stale slug, evidence mismatch, or QA failure must stop the run. Do not weaken a check or promote coverage manually to make it green.
