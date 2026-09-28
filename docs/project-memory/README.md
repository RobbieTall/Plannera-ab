# Plannera Project Memory

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


This folder is the canonical, in-repo product memory for Plannera.

Its purpose is to keep strategic direction durable and discoverable so planning, product, and engineering decisions stay aligned over time.

## What belongs here

- product philosophy and positioning references
- architecture decisions and constraints
- roadmap priorities and sequencing
- current focus and next actions
- confidence and quality standards

## Source-of-truth map

1. Product philosophy: `docs/plannera-product-philosophy.md`
2. JIT LGA architecture: `docs/architecture/just-in-time-lga-activation.md`
3. Council Edition strategy: `docs/project-memory/council-assessment-strategy.md`
4. Project memory index (this folder): `docs/project-memory/README.md`
5. Build-next queue: `docs/project-memory/build-next.md`
6. Active decisions register: `docs/project-memory/decision-register.md`

## Maintenance rule

Any PR that changes product direction, delivery model, confidence policy, or roadmap sequencing must update at least one file in `docs/project-memory/`.

Every merged Codex task must also update `docs/project-memory/build-next.md` to mark the completed item as ✅ DONE and add any follow-up items discovered. If the task changes LGA coverage state, active focus, or next actions, update this file too so anyone picking up the project can read the current state without digging through git history.
