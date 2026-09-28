# Item 78C Preview referral-package repair

Status: privately prepared candidate, not published or executed. No cloud settings, fixture data, main or acceptance snapshot changed.

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

Publication of this candidate and diagnostic status to the public repository requires explicit approval. Earlier publication rejections are not overridden.

