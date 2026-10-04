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
