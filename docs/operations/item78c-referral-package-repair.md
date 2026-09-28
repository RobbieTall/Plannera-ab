# Item 78C Preview referral-package repair

## Current Item 78C checkpoint - 2026-09-28: substantive checks passed; final reporting correction

This checkpoint supersedes older setup and next-action instructions below. Historical evidence is preserved, not an instruction to repeat work.

- Overall decision: **HOLD**. Do not claim READY_FOR_NON_PRODUCTION_ACCEPTANCE or commercial launch approval yet.
- [Whole-funnel run 36402055740, attempt 2](https://github.com/RobbieTall/Plannera-ab/actions/runs/36402055740/attempts/2) at immutable runner commit `fcd0c27c68daea81bd51e28b567e469a5fe6b97a` records successful credential-free authorization, independent BYRON and KEMPSEY paid/evidence/working-SEE jobs, canonical SEE compiler/rendering tests, and protected consultant handoff. Council and compiler successes were retained from the earlier attempt; consultant handoff passed in attempt 2.
- The final release-decision job failed during setup because its pinned upload action did not exist. It did NOT compute or publish a decision. The corrected official actions/upload-artifact v7.0.1 commit is `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`; the previous reference incorrectly ended in `0b`. This correction changes that single character only in executable workflow content; safeguards and acceptance coverage are unchanged.
- [Preview referral repair run 36409088185](https://github.com/RobbieTall/Plannera-ab/actions/runs/36409088185) succeeded at `87e0175d485c418a06b5b062b44aef553ee0ed87`, including 37 synthetic tests, source binding, original preservation and replacement validation. The protected Kempsey review reference was updated; the subsequent consultant acceptance passed. Do not regenerate the review or recreate payments merely because historical instructions say preparation is pending.
- Existing independent paid test fixtures and saved credentials remain in place. No new secret entry or payment is required for this reporting correction. Check actual saved state before requesting anything again.
- The corrected runner is the successor commit containing this checkpoint on `accept/item-78c-byron-kempsey-20260914`. The old commit and run remain immutable evidence. The diagnostic branch keeps its own preparation/repair history; neither branch is a Production release.
- Next: record the successor's full SHA in Issue #395, authorize that exact SHA in both protected Preview environments, retain required human approval and exact branch restrictions, then dispatch the whole-funnel workflow with matching expected_commit. Re-running the old failed run would use the old broken reference. Existing successful evidence remains historical evidence, not proof that a new run passed.
- Still required: successful computed/uploaded final decision and representative DOCX/PDF visual inspection. Passing automated rendering tests is not visual inspection. After those gates, separately reconcile launch integration, expired temporary diagnostic/build guards and any unresolved workspace or webhook-routing issues. Research Viewer remains after commercial gates and prerequisite fixes; this change does not expand scope.
- Production checkout must remain disabled. This correction does not alter Production settings, data, schema, hosted deployments, keys, payments or refunds, and does not merge to main. The Preview runner's checkout flags remain false. No fresh read of Production configuration is claimed.
- Publication safety: automatic Vercel Git deployment is disabled for the acceptance branch; install lifecycle scripts are disabled and the existing temporary build wrapper has expired and fails closed. Reviewed workflow triggers do not run stateful acceptance on this branch push. Do not extend the wrapper or deploy to bypass its expiry.
- Mobile/desktop continuation: start with this checkpoint and Issue #395; distinguish the runner SHA from hosted application SHAs. Preserve council separation, original artefacts, concurrent work and all older evidence. Publish only safe run references and results, never credentials, cookies, private fixture identifiers, document contents or authenticated URLs.

## Historical preparation and execution procedure

The procedure below is retained for audit, not a request to repeat a completed repair. The repair implementation lives on the diagnostic branch at the exact successful repair commit linked above. Its old preparation status is superseded.

## Scope
Regenerate the existing Kempsey Preview expert-review package using the normal request-review endpoint, its saved exact DPP/proposal binding and existing protected application session. Preserve the original. Do not fabricate consultant needs, weaken validation, submit a referral, change payments or touch Production.

The frozen acceptance commit remains unchanged. Both council bridge jobs and the compiler passed in run 36402055740. Consultant acceptance failed before submission. Read-only diagnosis found the configured review missing consultantNeedsVersion, consultantNeeds and disciplinePackages. Its source pack/QSC exist; no modern replacement was found.

## Execution only after review and approval
- Check push-triggered deployment safety before publication on the existing diagnostic branch. No main merge or acceptance branch movement.
- Preserve existing pins and preparation commit. Add only ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT in item78c-kempsey-preview, bound to the reviewed repair commit.
- Keep the existing two exact branch rules, required RobbieTall review, and administrator bypass disabled. Actual environment policies and Git ancestry are checked. Expiry remains 2026-09-30T00:00:00Z; never extend silently.
- Select Consultant Referral Non-production Acceptance on diag/item78c-paid-scope-20260928, repair_preview_only=true, confirmation REGENERATE PREVIEW REVIEW PACKAGE, PROTECTED NON-PRODUCTION, exact reviewed repair SHA. Legacy-required ID inputs may contain NOT_USED; repair mode ignores them and uses protected environment values.
- No active whole-funnel run or outside writer may overlap. Protected approval precedes the step receiving only the existing application session cookie and protection bypass. No DB, Stripe, admin or Vercel API credentials are passed.
- A retry reads first and reuses one matching server-validated package. Ambiguity stops. After uncertain POST completion, inspect before retrying. This is not an absolute distributed lock against external writers.
- After success, locate the uniquely matched new review through an approved read-only protected lookup. Update only PLANNERA_REFERRAL_TEST_REVIEW_REQUEST_ARTEFACT_ID; retain the original artefact. Do not publish IDs, payloads, sessions or protected links.
- Re-run only the failed consultant job of the frozen acceptance run and its dependent release-decision job as required. Preserve existing successful council evidence.
- Inspect representative DOCX/PDF separately. Passing compiler tests does not replace visual inspection.

## Limits
The repair does not fix stale source packs, site mismatch, expired login or disabled referral submission. It fails closed instead. The normal endpoint creates an artefact and may record its ordinary funnel event, without altering the original. Redirects are forbidden and the Preview origin is allowlisted. Earlier deployed-source/runtime audit and operator isolation remain necessary; this is not proof that every transitive server dependency is non-mutating.

Output contains only allowlisted booleans and reasons. No raw artifact upload. Temporary runner output is removed.

Robbie explicitly approved publication of the five repair files before execution. Later approval covers this reporting-reference correction and continuity update. No approval authorizes disclosure of secret values or private fixture data.

