# Council-boundary correction: 4 October 2026

## Decision and authority

**Code correction implemented; commercial HOLD; not deployed.**

Robbie explicitly approved the bounded correction and its tests on PR #452 on 4 October, with **no deployment or merge**. This supersedes the pending-implementation-approval statements in the 2 October handoff and task card. It does not authorise Preview deployment, customer/database mutations, migrations, environment changes, payment actions, Production deployment or checkout activation.

Application commit: `186be9afbcff3956d28ece4e267fac198c2565e0`.
Parent: `5bf68b077de6c34f1d1d66a62d625eca01555103`.
Active draft: [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452), `feat/see-document-delivery-20260929`.
Unchanged main at publication: `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`.

## Cause and bounded correction

The reader filtered official NSW council-boundary records to null end dates, excluding legitimate finite future dates. The fixed coordinate-intersection query now retrieves the existing maximum of two candidates without that null-only filter. End dates must be null or finite integral ArcGIS epoch milliseconds within JavaScript's supported date range.

Exactly one record must be current at capture. Its provider end date is checked again at each later read. A record expiring before the ordinary 24-hour window is rejected immediately; a far-future date does not extend that window. A capture that was ambiguous cannot later become trusted merely because one competing record expires.

The original response text, complete bounded candidate set, SHA-256, retrieval time and exact point remain preserved. Existing conflict, council allowlist, JSON/content-type, response-size, redirect, provider-error and transfer-limit guards remain unchanged. Council identity is not proof of parcel identity, statutory currency or complete planning coverage.

Only three implementation/test files changed:
- `src/lib/see-document-council-identity.ts`
- `tests/see-document-council-identity.test.ts`
- `tests/see-document-site-provenance.test.ts`

Existing callers already use the validated reader for retention and reopening; no caller, public API, renderer, planning conclusion, schema, checkout or billing changes were needed.

## Validation

Local validation used a separate exact-source working directory and cleared synthetic configuration without live credentials. No existing worktree or shared dependency contents were edited.

- 51 focused council/site-provenance tests passed: 25 council and 26 provenance. These are included in the document total below, not additional tests.
- 331 tests passed across the existing isolated suite: 11 build-safety, 52 source-planner, 193 document Node, 69 Vitest and 6 offline-guard unit tests.
- Full TypeScript passed.
- Existing build contract passed unchanged: 7 commands, 6 entry scripts, 15 transitive fingerprints.
- Both missing-database guard executions passed. The initial local attempt was blocked by sandbox EPERM on a temporary tsx IPC socket; rerunning the same credential-free guards with that local restriction lifted succeeded. No check was weakened.
- Credential-free Next compilation passed. This is not a deployment build with real database readiness.
- All 14 exact-application-commit GitHub workflow runs passed (13 pull-request runs and one push run). The [push isolated run 37172100950](https://github.com/RobbieTall/Plannera-ab/actions/runs/37172100950) and [PR isolated run 37172102613](https://github.com/RobbieTall/Plannera-ab/actions/runs/37172102613) both passed validation and credential-free compilation. The push validation log confirms the same 331-test breakdown and both missing-database rejections. A following documentation-only commit records this result; its own CI is a distinct check, not implied by the application result.

Synthetic tests use fake provider responses; no live council lookup, cloud database or customer/private data was accessed. Static build fingerprints do not prove arbitrary transitive code non-mutating. The unchanged renderer retains the earlier synthetic visual acceptance; actual hosted customer documents still require their own acceptance.

## Publication safety

Before publishing, the PR head still matched the expected parent and main was unchanged. The exact feature-branch `git.deploymentEnabled` false rule in `vercel.json` was retained. Automatic workflow definitions were inspected for deployment and credential wiring; no deployment workflow was dispatched. The Vercel deployment inventory still showed the existing 30 September council rehearsals, not this correction.

Publishing this code and documentation does not deploy it. No merge, environment/secret change, source refresh, database/schema write, payment/refund or Production change occurred. Immutable acceptance snapshots and other work remain untouched.

## Next steps: separate Preview authority required

Do not ask Robbie again to approve this already-completed code correction. Ask for a separately bounded protected Preview deployment of the verified PR application code to the two existing isolated rehearsal targets. Do not redeploy an obsolete acceptance snapshot or silently widen authority.

After that separate approval:
1. Reconfirm exact source SHA, Preview protection and independent database targets before deployment; do not change Production or activate checkout.
2. Open the existing protected [Byron projects](https://plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app/projects) and [Kempsey projects](https://plannera-ab-git-see-doc-kempsey-20260930-robbietalls-projects.vercel.app/projects). Use normal customer sign-in; Kempsey still needs Robbie's session.
3. Use each project's normal site search, selection and save controls. Expect one current canonical council identity and matching saved spatial provenance, not a manually supplied council code.
4. Generate fresh project-bound DPP/memo versions. Continue Working SEE only when actual retained evidence passes; do not replay completed DCP/LEP refreshes or fabricate missing proof.
5. Generate both Word and PDF for each council, download and reopen the exact saved versions. Verify project/version identity, evidence warnings, wrong-user and wrong-project denial, and native output quality.
6. Record privacy-minimal hosted evidence and only then reconsider the commercial decision.

**Remaining blocker:** corrected code is not on the protected rehearsal deployments, and actual two-council customer DOCX/PDF generation/download/reopening and permissions/version/warning/native-output acceptance remain unproven. Production checkout must stay disabled. Research Viewer, Project Controls and pilots remain deferred.
