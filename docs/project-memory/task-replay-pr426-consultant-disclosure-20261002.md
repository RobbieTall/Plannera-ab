# Codex replay task — consultant credential disclosure at referral submission

Status: **PREPARED FOR THE POST-#452 LINEAGE / SMALL PRE-LAUNCH TRUTH SLICE**

Historical source: PR #426 / Issue #425.

## Purpose

Reapply the consultant credential disclosure to the current live referral surface after the #452 commercial document lane is resolved.

The canonical commercialisation contract already states:

> Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.

The current `ConsultantReferralPanel` still exposes the human-operated referral submission form without this disclosure.

## Why replay instead of merge

PR #426 is a parallel September branch. Its new disclosure component does not exist on #452, while the existing referral panel may continue to evolve.

Reimplement the small disclosure cleanly against the then-current panel. Do not merge old historical handover/documentation changes wholesale.

## Required behaviour

1. When referral submission is enabled and no referral has yet been submitted, show the disclosure **before the contact fields/consent/submission action**.
2. The wording must remain materially equivalent to the approved canonical wording above.
3. The disclosure must not imply Plannera verifies:
   - professional qualifications;
   - memberships;
   - licences;
   - availability;
   - suitability;
   - quotes or response times.
4. Existing human-operated-queue wording remains.
5. Existing explicit consent remains required.
6. Existing submitted/referral-status state is not relabelled as credential verification.
7. Accessibility: expose the disclosure as a labelled note or equivalent semantic element.

## Tests

Update the current referral-panel test to prove:
- disclosure is visible before submission;
- self-report wording is present;
- non-verification wording is present;
- user-check-licences wording is present;
- contact details + explicit consent are still required;
- no existing referral lifecycle/status expectations regress.

## Expected files

Likely:
- new reusable disclosure component;
- current consultant referral panel;
- current referral panel test.

Avoid unrelated refactors.

## Guardrails

- No consultant verification workflow.
- No directory/RFQ marketplace expansion.
- No schema/billing/checkout/environment/Production changes.
- No referral logic change beyond rendering the disclosure.
- No merge/deployment in this task.

## Output

Report:
1. exact disclosure placement;
2. files changed;
3. tests/checks and results;
4. any later verification feature deliberately left out.
