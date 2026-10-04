> **Current PR #452 status, 4 October 2026:** [Runtime blockers and validated repair checkpoint](working-see-runtime-blockers-20261004.md). **Commercial HOLD.** Both protected Previews are running the preceding update; the new working-draft policy and safe request diagnostics are not deployed. The repair has 101 passing local checks, a passing TypeScript check and a credential-free build. Actual customer DOCX/PDF acceptance and DCP applicability remain unproven. Production checkout stays disabled; no Production data/schema change is authorised. Earlier checkpoints below are retained as history and are superseded where inconsistent.

## Current checkpoint: verified working-memo fix, 4 October 2026

**Commercial HOLD. Application fix published and all code checks passed; new fix not deployed.**

- PR #452 application: `51abcc79a00bdd12e56d6d079a7e586d7432379e`; tree `04d4f07818eb367fc5ef87cf343f70e814d6c696`.
- The approved test-only TypeScript correction is complete. **405 disjoint tests pass** (74 focused, 69 safety/source/offline, 193 document Node, 69 document Vitest). Full TypeScript, build-safety verification and credential-free compilation pass.
- All **14 exact-application GitHub workflow runs succeeded**, including isolated delivery [push 37174593644](https://github.com/RobbieTall/Plannera-ab/actions/runs/37174593644) and [PR 37174596644](https://github.com/RobbieTall/Plannera-ab/actions/runs/37174596644). Workflow success is code evidence, not proof that stateful customer acceptance ran.
- Kempsey normal sign-in is complete. The existing council-specific cloud fixture was found and reused; no duplicate or secret re-entry is needed.
- Same-site save completed in Kempsey. The Quick Site Check opened and Save as artefact was invoked, but the visible last-run label remained historical; a new check version/timestamp is **not independently proved**.
- Kempsey Regenerate pack completed for the unchanged proposal: **0 cited / 5 unresolved topics**. Its regenerated pack summary no longer displayed the prior R1 prefix, while the workspace header retained R1; this display discrepancy is recorded, not silently repaired or interpreted as verified zoning.
- Byron remains **2 cited / 3 unresolved topics**. Neither council has a newly accepted customer DOCX/PDF. Both hosted versions still disable SEE and working-document generation because the matching memo is unavailable.
- No new deployment, merge, Production change, source refresh, schema mutation, credential change or payment action occurred in this checkpoint.

### Exact next step

Obtain bounded approval to roll application `51abcc79a00bdd12e56d6d079a7e586d7432379e` into the two existing protected isolated document Previews, preserving their deployment-disabled branch safeguards. Then prove normal customer memo/Word/PDF generation, private downloads, exact-version reopening, ownership-negative cases, warnings, versions and visual document review. Do not bypass disabled controls or reuse stale output.

Current hosted snapshots remain Byron `fdf8650cd64161759ce2a120c4c6bf8a08c219ed` and Kempsey `a0434baf318ba810fb43ce9e630ca5debc6d8a0d`. No deployment of the new UI fix is claimed. No Production activation is authorised.

This checkpoint supersedes older typing-approval, sign-in-pending and local-only statements below. Older receipts are retained as historical evidence.

---

# Working SEE memo gate: 4 October 2026

Status: **LOCAL IMPLEMENTATION / 405 TESTS PASS / TYPE-CHECK FAILS / NOT PUBLISHED OR DEPLOYED**.

## Current authority and blocker

Robbie approved the bounded working-document UI correction and its tests. The agent introduced one TypeScript narrowing error in a new negative test and has requested approval for the test-only correction. That approval has not yet arrived. Do not claim a passing type-check or build.

Kempsey normal customer sign-in remains incomplete: the existing protected Preview has its empty email sign-in form open. Do not request secrets, recreate fixtures or interpret an unsigned-in browser list as missing cloud projects.

## Authoritative published baseline

PR #452 remains draft and unmerged.
Application correction: `186be9afbcff3956d28ece4e267fac198c2565e0`.
Published runtime-documentation snapshot: `b4585e33a56ea5b35ba0a2c45f6b8cd75144aa88`; all 14 workflow runs succeeded.
Main: `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`, unchanged by this work.

Hosted application snapshots remain Byron `fdf8650cd64161759ce2a120c4c6bf8a08c219ed` and Kempsey `a0434baf318ba810fb43ce9e630ca5debc6d8a0d`. Neither contains the new local memo-gate draft.

## Cause and bounded draft

The server's existing memo service and golden tests already support unresolved packs as WORKING_SEE / MORE_EVIDENCE_REQUIRED with submissionReady false. The workspace's SEE button and click handler instead require commercialReady, preventing the matching memo needed by Word/PDF generation.

Four local files are changed or new:
- `src/components/projects/project-workspace.tsx`: shared working-memo predicate in button and authenticated handler; qualified working-document copy.
- `src/lib/working-see-memo-gate.ts`: UI-only eligibility; explicit confirmed site, exact saved pack/proposal binding, mismatch rejection, existing feature flag for unresolved packs.
- `tests/working-see-memo-gate.test.ts`: nine new regressions, including both council selectors and explicit source-wiring checks.
- `.github/workflows/see-document-delivery.yml`: includes focused gate/selector/server-golden regression execution under synthetic-only configuration.

Local work is preserved at `/private/tmp/plannera-boundary-fix-20261004`. Its documentation tree predates the published runtime handover. Do not publish the entire local snapshot over current GitHub: preserve concurrent/current documentation and transfer only reviewed intended files.

Commercial readiness, server ownership/paid access, exact source validation, source freshness, rendering, private downloads and submission-ready rules are not changed. Unresolved packs require the existing working-generation feature flag. Missing confirmed site, source pack, proposal binding and proposal mismatch still reject. Source-wiring tests are not claimed as hosted browser acceptance.

## Validation actually completed

- Focused new gate + selector + map-snapshot + commercial-funnel golden tests: **74 passed**, including **9 new tests**.
- Existing build-safety/source-planner/offline tests: **69 passed**.
- Existing document Node tests: **193 passed**.
- Existing document Vitest tests: **69 passed**.
- Total disjoint executed tests: **405 passed**.
- Build-safety verifier passed.
- Full TypeScript: **failed**, TS2339 in `tests/working-see-memo-gate.test.ts:82`.
- New-draft build: not run after the known typing failure; no build pass claimed.
- New-draft hosted acceptance: not run.

All execution used an empty environment with synthetic configuration and a deliberately unreachable loopback database address. No live credentials, migrations or stateful acceptance were used.

The new negative test asserts `selected` is undefined before passing `selected?.id` to the gate. TypeScript correctly narrows the value and rejects that property access. Proposed correction: evaluate the gate before the assertion, then keep both the selected-is-undefined assertion and gate-is-disallowed assertion. Do not weaken assertions or change application behaviour. Approval is pending for this agent-introduced correction.

## Resume sequence

1. Obtain the requested test-only correction approval; apply it and rerun focused tests plus full TypeScript.
2. Run approved credential-free compilation and relevant guards. Preserve honest counts and failures.
3. Re-establish the feature branch head and deployment safeguard before publishing only intended files to #452; no merge.
4. Obtain any needed bounded Preview rollout authority before changing hosted versions, then test the actual customer flow.
5. Complete Kempsey sign-in and both project-specific DOCX/PDF generation, private download, exact-version reopening, permission/warning/version checks and visual review.

See [the runtime checkpoint](../operations/working-see-protected-preview-checkpoint-20261004.md) for prior hosted observations. The Byron rebuilt pack has two cited and three unresolved topics, and acknowledgement alone does not enable document generation because its matching memo is missing.

**Commercial HOLD.** No Production deployment, checkout activation or Production data/schema change. Research Viewer, Project Controls and private pilots remain deferred.
