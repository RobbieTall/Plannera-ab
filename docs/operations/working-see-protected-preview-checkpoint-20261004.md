> **Latest SEE purchase-integration checkpoint (4 October 2026): HOLD.** The signed Preview/test payment policy and atomic persistence handler are now prepared with 66 passing focused tests, clean type checking, a passing build-safety contract and a successful credential-free build (37/37 pages). Payment, credit and entitlement changes share one serializable transaction; failure tests exercise rollback using a transactional test double, not a live database. The customer checkout/quote route, selected-document scope binding, provider dispatch and UI remain to be connected. These modules do not enable checkout and no new test payment or hosted document acceptance is claimed. Both isolated deployments remain on the prior origin-fix SHAs. Production is unchanged and must stay disabled; no deployment or merge. Earlier checkpoints below are historical.

> **Current hosted checkpoint (4 October 2026): HOLD.** The Preview origin correction is deployed and both councils now pass that guard. 106 local checks, type checking, a credential-free build and all 14 GitHub runs passed. Neither isolated fixture has a PAID `submission_see` purchase or ACTIVE SEE entitlement; existing paid Planning Controls Packs do not confer SEE access. The SEE credit persistence service has no production-source callers in the inspected application tree, and no customer SEE checkout route was found. Connect and test the legitimate SEE purchase/credit/webhook journey using existing approved terms, without fabricating entitlements or repeating planning-pack payments. Word/PDF generation, private download, reopening and visual acceptance remain unproven; current-source/applicability review also remains open. Production is unchanged and checkout must remain disabled. No merge or Production deployment.
>
> Authoritative hosted evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5977156678) and [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452#issuecomment-5977157198). Earlier checkpoints below are historical and superseded.

> **Current origin-fix checkpoint (4 October 2026): HOLD.** The hosted Kempsey document request is confirmed to fail the origin guard. This patch adds a Preview-only exact platform-origin fallback with browser same-origin metadata; it does not trust forwarded headers or remove authentication/permissions. Local validation: 106 tests, type check and credential-free build passed. Hosted generation/download/reopening and current-source content acceptance are still unproven. See [origin correction runbook](https://github.com/RobbieTall/Plannera-ab/blob/feat/see-document-delivery-20260929/docs/operations/working-see-preview-origin-20261004.md). No Production activation or merge is authorised. Older checkpoints below are preserved as history.

> **Latest hosted checkpoint (4 October 2026): HOLD.** Both isolated Preview deployments of application patch `631790a0484bc01ef5862a279fbec4386a32fa73` are READY. Kempsey now generates its evidence-gap working assessment with explicit not-submission-ready warnings. Actual Word/PDF generation still fails on both councils; saved-file download, exact-version reopening and visual acceptance remain unproven. The request rejection reason has not yet been observed; an origin mismatch is a hypothesis only. Preserve the security checks. Byron D3 proposal applicability also remains unresolved. Production is unchanged; no merge or activation is authorised by this checkpoint.
>
> Runtime evidence and next action: [Issue #395 checkpoint](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5976872222) and [PR #452 checkpoint](https://github.com/RobbieTall/Plannera-ab/pull/452#issuecomment-5976872665). These supersede earlier pending-deployment statements below; older entries are preserved as history. The 101 focused checks, type check, credential-free build and 14 passing GitHub runs are development evidence, not hosted document acceptance.

> **Current PR #452 status, 4 October 2026:** [Runtime blockers and validated repair checkpoint](../project-memory/working-see-runtime-blockers-20261004.md). **Commercial HOLD.** Both protected Previews are running the preceding update; the new working-draft policy and safe request diagnostics are not deployed. The repair has 101 passing local checks, a passing TypeScript check and a credential-free build. Actual customer DOCX/PDF acceptance and DCP applicability remain unproven. Production checkout stays disabled; no Production data/schema change is authorised. Earlier checkpoints below are retained as history and are superseded where inconsistent.

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

# Protected document Preview checkpoint: 4 October 2026

## Decision

**Commercial HOLD. Both protected rehearsal deployments are READY; actual two-council customer DOCX/PDF acceptance is not yet proven.**

This checkpoint supersedes the earlier same-day "not deployed / deployment approval needed" status in the council-boundary correction receipt. The earlier code-test evidence remains valid and immutable.

## Authority and deployment scope

Robbie subsequently approved deploying the verified correction to the two existing protected, isolated document Previews and continuing normal customer-document checks. No merge, Production deployment, checkout activation, migration, source refresh, environment/credential change or payment action was performed in this phase.

Verified application: `186be9afbcff3956d28ece4e267fac198c2565e0`.
Verified feature/documentation snapshot: `0a5a61db65416fb0cf59f2dc34dc13f8517add15`.
PR #452 remains draft and unmerged. Main was not updated.

The two rehearsal commits share tree `049f638628890b70c30ef162e3b7c6efc1a2c5cb`, matching the verified feature snapshot except for preserving the rehearsal branches' automatic-deployment disables in `vercel.json`. Each is a non-force, single-parent continuation of its own prior branch; no other branch-side file changes were discarded.

| Council | Branch | Exact deployed commit | Deployment | Observed result |
| --- | --- | --- | --- | --- |
| Byron | `see-doc-byron-20260930` | `fdf8650cd64161759ce2a120c4c6bf8a08c219ed` | `dpl_GiUn6tVwFPc7Qs4NbfuVcQm5LVu4` | READY |
| Kempsey | `see-doc-kempsey-20260930` | `a0434baf318ba810fb43ce9e630ca5debc6d8a0d` | `dpl_5UtThJZYH62xgGPbhLZvSgYsp1ME` | READY |

Both were explicitly created as Preview deployments, with no Production target or alias. Saved database-variable branch scopes and project Preview protection were inspected without revealing values. Existing separate database configurations were retained; no request to re-enter them is needed. This is configuration-scope/deployment evidence, not independent proof of the runtime database endpoint or the entire customer journey.

Automatic deployment remains disabled for the feature branch and both rehearsal branches. Do not merge #452 or promote either deployment.

## Observed Byron customer journey

The existing authenticated isolated Byron project was reopened on the new deployment. The same existing site was selected through Change site, the normal address-search result and Use this site. No council identity or evidence was manually backfilled.

The Quick Site Check panel was opened, Re-run check completed, and Save as artefact returned "Saved Quick Site Check as artefact". The workspace nevertheless continued to display its historical 17 September last-run label; do not claim that a new Quick Site Check version or timestamp has independently been proved.

Regenerate pack completed for the unchanged proposal. The visible result changed from five cited / zero unresolved DCP topics to **two cited / three unresolved**. Unavailable topics are setbacks, built form/active frontage and other proposal-relevant controls. Retrieved topics carry an explicit applicability-review qualification; this UI observation does not establish their legal or site-specific correctness.

The current UI then:
- changed its dominant action to Request expert review;
- disabled Generate SEE, with copy requiring a commercial-ready Detailed Planning Pack;
- disabled Generate working Word and PDF and requested a matching assessment first;
- showed no saved accessible Word/PDF versions.

No disabled action was bypassed. No stale memo, direct API mutation, fabricated source evidence or manually rewritten download was used to create a false pass. No new customer DOCX/PDF has been downloaded or visually accepted in this phase. Saving the site alone does not prove the council-identity loader has passed during document generation.

## Exact remaining blocker and next work

The hosted customer flow currently stops before a qualified working document when the pack has unresolved evidence. This conflicts with the agreed product direction that users can continue to clearly warned working SEE/consultant material and improve it as new evidence arrives. It does not authorise claiming submission readiness.

Next bounded investigation: determine why the working-document path remains gated, using the actual deployed code and non-secret feature configuration. Preserve separate submission-readiness gates, authoritative-source/provenance checks, project ownership, evidence warnings and version integrity. Do not merely remove safeguards or mark unresolved topics as cited. The UI gate has been observed; its root cause and correction are not yet established or tested.

## Kempsey and remaining acceptance

Kempsey's new Preview is READY. Opening Projects showed the unsigned-in "Projects in this browser" page with zero projects, not evidence that the saved cloud projects are missing. Its normal sign-in form is open for Robbie. Do not create a duplicate fixture or request existing secrets again.

After sign-in and the bounded working-document blocker are resolved:
1. Continue the existing Kempsey project, preserving council isolation.
2. Generate actual project-specific DOCX and PDF through the normal protected customer flow.
3. Download and reopen the exact saved versions; verify ownership and warnings, plus negative permission cases without disclosing private evidence.
4. Inspect representative actual Word/PDF pages, not only synthetic renderer artefacts.
5. Record observed version identifiers/results privately as appropriate and publish privacy-minimal pass/fail evidence.

The prior 331 synthetic tests, TypeScript/build checks and 14 successful application workflow runs remain code evidence, not hosted acceptance. No new test count is claimed for this runtime phase.

Production checkout is not authorised for activation and was not changed. Production data/schema and billing were untouched. Research Viewer, Project Controls and real-user pilots remain deferred. Final commercial recommendation remains HOLD until the actual required journeys pass.
