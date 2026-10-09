> **Current Plannera document checkpoint (9 October 2026): HOLD.** Draft PR #452 now includes checkout scope, a protected quote/checkout route, a test-only Stripe adapter and regression suites at commit `112faa6956759210443b5d73f48aa2f8cd85eccf`. All 14 GitHub workflow runs for that commit succeeded, including isolated Linux validation and credential-free compilation. These are synthetic checks; the SEE webhook dispatcher and customer checkout UI are not connected, checkout is not enabled, and no test payment, real database acceptance or hosted document delivery is claimed. Byron and Kempsey still need project-specific Word/PDF generation, private download, exact-version reopening, permission and evidence-warning checks, and native visual review. The current source and DCP applicability gaps remain open. Production checkout remains disabled; Production data/schema are unchanged. See [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452) and [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395). Earlier checkpoints below are historical where superseded.

> **Latest SEE purchase-integration checkpoint (4 October 2026): HOLD.** The signed Preview/test payment policy and atomic persistence handler are now prepared with 66 passing focused tests, clean type checking, a passing build-safety contract and a successful credential-free build (37/37 pages). Payment, credit and entitlement changes share one serializable transaction; failure tests exercise rollback using a transactional test double, not a live database. The customer checkout/quote route, selected-document scope binding, provider dispatch and UI remain to be connected. These modules do not enable checkout and no new test payment or hosted document acceptance is claimed. Both isolated deployments remain on the prior origin-fix SHAs. Production is unchanged and must stay disabled; no deployment or merge. Earlier checkpoints below are historical.

> **Current hosted checkpoint (4 October 2026): HOLD.** The Preview origin correction is deployed and both councils now pass that guard. 106 local checks, type checking, a credential-free build and all 14 GitHub runs passed. Neither isolated fixture has a PAID `submission_see` purchase or ACTIVE SEE entitlement; existing paid Planning Controls Packs do not confer SEE access. The SEE credit persistence service has no production-source callers in the inspected application tree, and no customer SEE checkout route was found. Connect and test the legitimate SEE purchase/credit/webhook journey using existing approved terms, without fabricating entitlements or repeating planning-pack payments. Word/PDF generation, private download, reopening and visual acceptance remain unproven; current-source/applicability review also remains open. Production is unchanged and checkout must remain disabled. No merge or Production deployment.
>
> Authoritative hosted evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5977156678) and [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452#issuecomment-5977157198). Earlier checkpoints below are historical and superseded.

> **Current origin-fix checkpoint (4 October 2026): HOLD.** The hosted Kempsey document request is confirmed to fail the origin guard. This patch adds a Preview-only exact platform-origin fallback with browser same-origin metadata; it does not trust forwarded headers or remove authentication/permissions. Local validation: 106 tests, type check and credential-free build passed. Hosted generation/download/reopening and current-source content acceptance are still unproven. See [origin correction runbook](https://github.com/RobbieTall/Plannera-ab/blob/feat/see-document-delivery-20260929/docs/operations/working-see-preview-origin-20261004.md). No Production activation or merge is authorised. Older checkpoints below are preserved as history.

> **Latest hosted checkpoint (4 October 2026): HOLD.** Both isolated Preview deployments of application patch `631790a0484bc01ef5862a279fbec4386a32fa73` are READY. Kempsey now generates its evidence-gap working assessment with explicit not-submission-ready warnings. Actual Word/PDF generation still fails on both councils; saved-file download, exact-version reopening and visual acceptance remain unproven. The request rejection reason has not yet been observed; an origin mismatch is a hypothesis only. Preserve the security checks. Byron D3 proposal applicability also remains unresolved. Production is unchanged; no merge or activation is authorised by this checkpoint.
>
> Runtime evidence and next action: [Issue #395 checkpoint](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5976872222) and [PR #452 checkpoint](https://github.com/RobbieTall/Plannera-ab/pull/452#issuecomment-5976872665). These supersede earlier pending-deployment statements below; older entries are preserved as history. The 101 focused checks, type check, credential-free build and 14 passing GitHub runs are development evidence, not hosted document acceptance.

## Latest status: approved test corrections validated (4 October 2026)

The requested two regression-test fixtures are corrected: assertions use the existing `documentReadiness` structure, and all three required external-service dependencies are stubbed to throw if unexpectedly called.

Validation for the patch recorded in this PR:
- 54 Node checks passed.
- 36 Vitest service/integration/applicability checks passed.
- 11 build-safety checks passed.
- Total: **101 checks passed, zero failures** in these explicitly selected suites.
- Full TypeScript check passed (`tsc --noEmit --incremental false`).
- Build-safety contract passed (7 commands, 6 entries, 15 transitive sources).
- Credential-free Next compilation, type/lint checks and static page generation completed with exit code 0. This is a local production-mode compilation, NOT a Production deployment.
- Build warnings: old browser-support datasets; the dynamic DCP search route declined static rendering. The build completed successfully. No dependency refresh was performed.

The validated application changes and corrected tests are included in PR #452 by this checkpoint commit, based on `01e2532c7c4db57e06830af775170224da9ba1cd`. No merge or deployment is included. Production checkout/data/schema are untouched. The PR workflow now explicitly includes the new policy regression suite. Hosted Previews still run the preceding application update; do not count this patch as deployed.

**Commercial decision remains HOLD.** Next: require the new commit's automatic checks to pass; obtain or confirm bounded Preview rollout authority before deploying; diagnose Byron using enum-only rejection codes; resolve proposal-specific DCP applicability; then prove both protected customer DOCX/PDF generation, download, exact-version reopening and visual review. Passing local tests is not hosted acceptance, current planning-source verification, or permission to activate Production.

Publication safeguard: Vercel automatic deployment for `feat/see-document-delivery-20260929` remains disabled. Its document workflow uses credential-free synthetic configuration and contains no deployment step; no stateful workflow is dispatched. The canonical handover and operational entry points link to this receipt.

The previous notes below are historical: their approval-pending status and two test-fixture failures are superseded by this result.

---

## 4 October 2026: hosted document journey checkpoint (supersedes the rollout-pending status)

**Commercial status: HOLD. PR #452 remains draft; no merge or Production activation.**

### Completed
- The previously approved application update (app commit `51abcc79a00bdd12e56d6d079a7e586d7432379e`) is deployed to both isolated protected Preview rehearsals.
- Byron: `c78f941a8bcb1345ccd0ae17039dfae16945e640`, deployment `dpl_EvJ6rHDYdqkW6Gc1YRDDgcf5rEdQ`, READY.
- Kempsey: `23bf0c8afee620754bd76286ca6459448cff21d9`, deployment `dpl_8bR7LgdkEJ63L39nkh2Fx8EG7rGb`, READY.
- Shared rehearsal tree: `858b40b9ed5042c1b84ff475c33f15540bc815af`.
- Existing authenticated fixtures were used. No duplicate fixture, credential setup, payment or source refresh was requested.

### Observed failures, not acceptance passes
1. Byron successfully generated a working memo. Acknowledgement correctly gates Word/PDF generation. The normal file-generation request returns HTTP 400 / `invalid_generation_request` before persistence. The submitted three-field payload was structurally correct. An origin/proxy mismatch is still a hypothesis, not a demonstrated cause.
2. Kempsey has zero cited DCP topics and five unresolved topics. Its memo endpoint rejects generation with the explicit minimum-citation error. The existing UI allowance therefore does not yet deliver the agreed qualified-working-draft journey.
3. Byron's residential proposal contains citations from the Tourist Accommodation chapter. Applicability has not been established; keep this as a content-quality blocker.
4. Neither council has a newly accepted customer DOCX/PDF download/reopening/visual-review result.

### Local, unpublished work
Working copy: `/private/tmp/plannera-boundary-fix-20261004`.
- A narrowly gated Preview-only exception allows an uncited working memo only with the existing generation flag, explicit non-commercial readiness and non-empty named evidence gaps.
- Request validation retains its existing origin, method, identifier and content-type restrictions, adding only enumerated rejection reasons. No request headers, cookies, URLs or bodies belong in diagnostics.
- Files: `src/lib/working-see-preview-policy.ts`, `src/lib/artefact-service.ts`, `src/lib/see-document-generation.ts`, `tests/working-see-preview-policy.test.ts`, `src/lib/see-document-generation.integration.test.ts`.
- These changes are NOT pushed, merged or deployed.

### Validation, precisely scoped
- Node suites: **42 passed**.
- Service/integration suites: **30 passed, 2 failed**.
- The two new integration tests incorrectly assert top-level readiness properties instead of `documentReadiness`; their test dependency object also needs the three existing dependency stubs.
- TypeScript: **4 errors**, all in that newly appended test fixture (missing dependency members and three incorrect property accesses).
- No build run for this unvalidated change. The earlier 405-test result belongs to the preceding application commit and must not be claimed for this patch.
- Approval requested for these test-only corrections and rerun. No runtime guard is to be weakened to satisfy a test.

### Next
Correct the new test fixture with approval; rerun targeted integration, type and build-safety validation; reconcile canonical handover files before publishing only validated changes. Establish push/deployment safety again before any branch update. Then use safe reason codes to isolate Byron's failure, resolve source applicability, and prove both actual private document journeys. Preserve all immutable acceptance evidence and unrelated branches.

No Production configuration, checkout, data/schema or refund action was performed. Research Viewer, Project Controls and live-user pilots remain deferred.


### Follow-up: Byron source applicability diagnosis (4 October 2026)

Read-only source inspection and credential-free synthetic tests established a specific coverage gap:
- `src/lib/dcp/document-applicability.ts` checks Byron area chapters (E), D4 and D2 in certain residential zones, but has no D3 rule.
- Its input includes council, chapter hierarchy and zone, **not the proposed use**.
- `src/lib/dcp/search.ts:151` applies this guard before ranking, without a proposal binding.
- Existing applicability tests do not cover the observed D3/residential-proposal mismatch.

This is evidence about code behaviour, not a legal finding that D3 never applies in residential zones. A safe correction must use the confirmed proposed use and authoritative chapter scope; do not globally blacklist D3 by R2 zoning, borrow another council's semantics, rewrite source rows, or fabricate applicable citations.

Council's indexed official DCP listing identifies Chapter D3 as Tourist Accommodation. Attempts to open the current official listing and PDF directly returned HTTP 403, so current source currency/applicability has NOT been freshly confirmed in this investigation. Official discovery page: https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014

The two local regression-test corrections requested in the preceding checkpoint remain pending approval. No additional application changes, push, merge, deployment or Production action were performed during this follow-up. Canonical repository-file reconciliation remains pending; this issue and PR #452 contain the latest runtime checkpoint.

### Additional validation

The existing source-applicability suites passed 12 Node and 4 Vitest tests. A separate synthetic probe returned no exclusion for Byron Chapter D3 with R2 zoning, confirming the guard coverage gap. These 16 additional passes do not resolve the two new test-fixture failures or prove planning applicability.
