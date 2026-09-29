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
| Representative Word inspection | Byron missing-evidence and Kempsey strengthened-evidence samples: all ten Word-rendered pages each inspected in Microsoft Word 16.113.2 | Synthetic local output only; presentation defects and hashes recorded in handover |
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

Correction to the initial trigger summary: these paths trigger three pull-request workflows: Commercial Funnel Golden Gate, Soft launch smoke enforcement, and Whole-LGA source matrix enforcement. The earlier summary extraction ended at workflow_dispatch and missed the following pull_request triggers in the latter two definitions. The complete definitions have now been inspected. All three use read-only repository permissions, disable checkout credential persistence, and inject no service secrets or protected environment. The smoke check reads the build contract; the matrix check additionally installs dependencies with lifecycle scripts disabled, generates the local Prisma client and runs ingestion boundary tests. The golden check likewise disables install lifecycle scripts before local generation and tests. No stateful acceptance workflow is dispatched by this change. Static inspection does not prove all transitive dependency or test behavior is non-mutating. GitHub reported successful smoke and matrix checks at befd907cccaa0716608bd95c6393caa955b318fc; golden was still in progress when observed. These results do not apply automatically to later commits. The named-branch Vercel safeguard is based on [Vercel's documented Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentEnabled).

## Stop condition and escalation

Do not activate Production checkout during Item 78C closeout. Report the automated decision and completed representative Word review separately from unproven hosted delivery and commercial approval. Keep Production data/schema unchanged and request a separate explicit go/no-go before any Production activation.

See [current handover](../project-memory/item78c-current-handover.md) for outstanding PR reconciliation and continuity.


## Final acceptance closeout audit - 29 September 2026

Decision: **READY_FOR_NON_PRODUCTION_ACCEPTANCE** for Issue #395's protected scope. Commercial launch remains **HOLD**, not authorised. The issue requires both council commercial bridges, compiler evidence, one consultant lifecycle and representative visual inspection; it does not equate that runner with a shipped customer download interface. No gate has been weakened or rerun to obtain this closeout.

- Re-read Issue #395 and current run metadata: run #24, attempt 1, SHA `0a871d38a5806e6a28404700d660f5d363f3a1d4`, all six jobs successful.
- Inspected the decision job's actual sanitized upstream evidence: both bridges report all twelve checks true, including paid source, exact scope, single pack, evidence regeneration, replay and zero residue; all eight compiler checks true; all seven consultant checks true and all five required statuses present. The subsequent decision-validation step succeeded with the required READY value and privacy checks.
- Confirmed the decision artifact is retained and unexpired until 29 October 2026. It is not a customer document bundle.
- Completed all sixteen separate generated PDF pages and twenty native Word-rendered pages across representative independent council samples. Preserve the presentation defects and fixture limitations rather than claiming a polished or legally reviewed output.
- Current saved Vercel checkout-switch entries are confined to named Preview branches; the shared-variable search returned no matching switch. The current Production deployment shown by Vercel is `HijtEqMttm18FfhVnb4pAkfwh1DP` at main SHA `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.
- After inspecting that deployed commit's status route, performed one successful unauthenticated, empty-body status-only request to `/api/planning-pack/status`. It returned `enabled: false, state: free`. The disabled branch returns before session/project/database handling. No cookies, credentials or customer data were sent; no checkout session, payment or database write was created. No Production setting/schema/data change was performed. This is specific checkout evidence, not a comprehensive Production security audit.
- Current PR reconciliation: #433 remains open at `2da817a93671c8a64ac56437c51d7daf82d9f324`; #434 at `ba1b0cdb602f595371d8647a54b38d2632fc6080`; #435 at `17822eb2c80db266bde300a27300fea75d805876`. Their overlapping presentation changes are not combined or approved by the acceptance result. No merges were made. PR #450 remains a draft, and PRs #448/#449 remain separate future-direction documents.

### Configuration register: evidence without values

| Required configuration | Status | Evidence boundary |
| --- | --- | --- |
| Exact runner SHA, non-main authorization and council environment approval | Confirmed at accepted run | Credential-free and protected authorization steps passed; do not reuse historical pins for a new run |
| Independent council database/Blob targets and credential-target matching | Confirmed at accepted run | Both target checks and both council-specific bridges passed; no credential values disclosed |
| Stripe test sessions, paid exact-scope source packs and replay | Confirmed at accepted run | Both paid_source, exact_scope, single_pack and replay_safety checks true; no new payments needed |
| Private evidence, Sandbox scan, regeneration and cleanup | Confirmed at accepted run | Both private-storage/scan steps and bridge evidence/zero-residue checks passed |
| Consultant fixture, protected access and lifecycle | Confirmed at accepted run | One required council lifecycle, seven checks and five statuses passed |
| Production Planning Pack checkout | Confirmed disabled on 29 September | Live status-only response; no activation or configuration change |
| Original 11 September acceptance pin/instructions | Superseded | Use the approved successful 14 September branch and exact accepted SHA as historical evidence, not an instruction to reset environments |
| Hosted customer DOCX/PDF download delivery | Unproven commercial follow-on | Offline render/bridge success is not proof of browser delivery |

All goal-required acceptance evidence is now recorded. Stop the acceptance goal here; do not activate Production or silently expand it into implementation of hosted delivery. Main documentation remains unchanged pending review of the explicitly authorised draft documentation PR. Mobile/desktop continuation must read that PR and Issue #395 rather than assume the draft is already merged.
