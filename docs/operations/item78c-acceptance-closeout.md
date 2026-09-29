# Item 78C acceptance closeout

## Scope

Close out Issue #395 from the successful [run #24](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240) at `0a871d38a5806e6a28404700d660f5d363f3a1d4`. This run establishes `READY_FOR_NON_PRODUCTION_ACCEPTANCE`, not commercial activation.

## Do not repeat completed setup

Both independent council jobs and consultant handoff passed. Do not repeat payment, credential copying, fixture creation or stateful workflows without a newly evidenced failure. Preserve the frozen runner.

## Evidence register

| Requirement | Evidence | Limit |
| --- | --- | --- |
| Independent councils | Successful Byron and Kempsey jobs in run #24 | Preview fixtures only |
| Paid source, exact scope and replay | Both durable bridge jobs passed | Not a new live charge or refund |
| Private evidence and cleanup | Private Blob/Sandbox steps and bridge checks passed | Synthetic acceptance scope |
| SEE compiler/output generation | Compiler job and both bridge render checks passed | Not a visual review or hosted download proof |
| Consultant handoff | Protected lifecycle job passed | One configured council lifecycle |
| Final automated decision | Decision job and retained JSON artifact | Non-production acceptance only |
| Representative PDF inspection | Four accepted-renderer synthetic pairs, 16 pages inspected locally | New offline bytes, not retained run outputs |
| Representative Word inspection | Not completed | Trusted DOCX renderer required |
| Commercial/Production readiness | Not established | Separate approval and evidence required |

## Document review

1. Bind every review to its renderer SHA, fixture class, format, document hash and inspected page count.
2. Keep synthetic review inputs explicitly synthetic. Never present fabricated fixture source dates or verified flags as actual planning research.
3. For working documents, confirm that missing evidence remains visible, submission readiness stays false and operator review remains required even after evidence is strengthened.
4. Inspect every rendered page for clipping, misleading labels, broken pagination and legible source references. Record defects rather than silently correcting the accepted snapshot.
5. Inspect Word with a trusted renderer. PDF success does not prove Word layout.
6. Test actual hosted delivery separately before commercial sign-off. Do not confuse a text planning memo with a generated Word/PDF customer download.

## Documentation publication

This proposal preserves existing histories and supersedes old operational instructions with the current checkpoint. Robbie approved public status documentation and a branch-only deployment safeguard on 29 September 2026. The only non-document change sets `git.deploymentEnabled` to false for `docs/item78c-status-20260929`; it does not disable other branches or modify the accepted snapshot. No merge or manual deployment is authorised.

This branch is a published proposal, not merged main. Its reconciled base is `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`. The shared issue checkpoint is https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5882042049. Reconcile concurrent work rather than overwriting it.

All 51 workflow definitions at that base were inspected. The proposed paths match only the Commercial Funnel Golden Gate pull-request workflow. It uses read-only repository permissions, disables checkout credential persistence and install lifecycle scripts, and injects no service secrets or protected environment. No stateful workflows are dispatched by this change. This is not a guarantee about every transitive dependency's behavior. The named-branch Vercel safeguard is based on [Vercel's documented Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentEnabled).

## Stop condition and escalation

Do not activate Production checkout during Item 78C closeout. Report the automated decision separately from incomplete Word review, hosted delivery and commercial approval. Keep Production data/schema unchanged and request a separate explicit go/no-go before any Production activation.

See [current handover](../project-memory/item78c-current-handover.md) for outstanding PR reconciliation and continuity.

