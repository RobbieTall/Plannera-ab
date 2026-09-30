# Working SEE Preview runtime handover - 2026-09-30

## Decision

**HOLD: hosted customer document acceptance is not complete.** No Production checkout activation or Production data/schema mutation is authorised by this checkpoint.

This runtime checkpoint supersedes older statements that the two isolated Preview connections and working-SEE switches still need to be created. Later timestamped results on PR #452 / Issue #395 must be read before repeating any setup. This is not a claim that all repository documentation or launch gates have been reconciled.

## Source and isolation

| Council | Rehearsal branch | Exact deployment commit | Isolated Neon branch |
| --- | --- | --- | --- |
| Byron | see-doc-byron-20260930 | cddebac930d31f1c1f2880348033d487158645cd | br-blue-dawn-a733pff4 |
| Kempsey | see-doc-kempsey-20260930 | f6636926b3f7b4fc0d1f637493d1fa0424bed3a5 | br-royal-breeze-a75t8c41 |

Kempsey's commit is a metadata-only child of Byron's commit. GitHub comparison confirms zero file changes and one additional commit; both use tree `6758bd2cd5d3cdf8146f99f42627417e4aead0bd`. It avoids Vercel resolving both identical commit refs to the Byron branch and therefore selecting the wrong environment configuration. Do not combine the council fixtures.

The application/source checkpoint remains `31fc550d6402fb88160aad5b5d570a1740268342`. PR #452 remains draft. Existing Item 78C acceptance branches, evidence, main and concurrent mobile documentation branches remain untouched.

Each rehearsal ref retains its exact `git.deploymentEnabled=false` entry. Manual Preview deployments were deliberately selected; no Production promotion or deployment was requested. The PR feature branch retains its own deployment-disable safeguard.

## Saved configuration register

Entries below are separately scoped to each exact rehearsal branch, not broad Preview or Production. Saved secret presence/type/scope is confirmed; values were not read and runtime correctness is not implied.

| Field | Status | Type / value |
| --- | --- | --- |
| DATABASE_URL | Saved for both councils | Secret; council-specific pooled connection |
| DATABASE_URL_UNPOOLED | Saved for both councils | Secret; council-specific direct connection |
| PLANNERA_WORKING_SEE_SITE_PROVENANCE_ENABLED | Saved for both | Config: 1 |
| PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED | Saved for both | Config: 1 |
| PLANNERA_WORKING_SEE_GENERATION_ENABLED | Saved for both | Config: 1 |
| BLOB_STORE_ID | Saved for both | Config: store_7JUdaUjA72chyYtG |
| NEXT_PUBLIC_AUTH_ENABLED | Saved for both | Config: true |
| PLANNING_PACK_CHECKOUT_ENABLED | Saved for both | Config: false |
| APP_URL | Saved for both | Config: respective Vercel branch origin below |
| NEXTAUTH_URL | Saved for both | Config: respective Vercel branch origin below |

Byron origin:
`https://plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app`

Kempsey origin:
`https://plannera-ab-git-see-doc-kempsey-20260930-robbietalls-projects.vercel.app`

These are actual aliases returned by Vercel, not inferred hostnames. Do not use empty NEXTAUTH_URL: the installed NextAuth code uses nullish fallback and an empty string is not a valid URL. Do not send sign-in links before the deployment containing the matching origin overrides is READY.

Existing RESEND_API_KEY and NEXTAUTH_SECRET cover all environments; only their names/scopes were inspected. Existing dedicated ITEM74H_PRIVATE_BLOB_* settings already cover Preview and were not recreated. Existing shared settings and token values were not modified.

The Blob store is named `plannera-item74h-preview-private`, its UI confirms Private, and its existing project connection includes Preview. The working-SEE routes call the Blob SDK directly rather than the older dedicated-Preview helper. SDK 2.8.0 supports BLOB_STORE_ID plus Vercel OIDC; this configuration avoids another copied token. Actual runtime authorization and byte round-trip still require testing.

## Hosted build evidence

- Byron initial deployment `dpl_J1gre4j4J1kuHBMfCyiopK3zArCT`: READY; predates saved login-origin overrides.
- Byron redeploy `dpl_8hdb46UEA4PehyMPsVkVMe7wuBZS`: ERROR. PostgreSQL connection succeeded, then LgaCoverageState lookup reported that the server closed the connection. The gate correctly returned SOFT LAUNCH: BLOCKED.
- A read-only query explicitly on `br-blue-dawn-a733pff4` returned connection_ok=1 and coverage_table_present=true. Its endpoint was active. This does not prove the cause of the dropped connection.
- One unchanged Byron retry `dpl_5jpCx2ha7kxq4r3VzqrW6n96WFjy`: READY, including saved login-origin overrides. No gates, credentials or schema were changed to obtain the pass.
- Kempsey initial deployment `dpl_9PGN8zncBNv5sBQ862TnAqefh3Xt`: BUILDING at this checkpoint. Its login-origin overrides were saved after that build began, so a further Preview-only redeploy is needed before sign-in.

Vercel's Byron build log explicitly showed `npm run vercel-build` and the preserved build-safety, Prisma generation, launch/whole-LGA smoke, controlled-address, working-SEE and credential-free Next compilation command chain. READY is a hosted build result, not whole-funnel customer acceptance.

Previously recorded offline evidence remains 201 tests plus TypeScript and credential-free compilation. Do not add hosted builds to that test count or claim they prove all transitive build behaviour non-mutating.

## Required next steps

1. Check the existing Kempsey build result before triggering anything else. If READY, redeploy the same Kempsey commit with the latest project settings and Preview selected; do not use Production.
2. Ask Robbie to sign into the new ready Byron origin, then the ready Kempsey origin. Do not request keys that already exist. Do not inspect clipboard, cookies, token-bearing sign-in links or secret values.
3. Confirm the live application targets the intended isolated database and private store using privacy-minimal evidence before stateful document tests.
4. Complete genuine official-source/spatial preparation on the two isolated children only. No source refresh was performed during this runtime-configuration session. Preserve actual retrieval timestamps, authority, hashes and evidence gaps; never fabricate freshness.
5. Use real saved project/site/QSC/DPP/purchase/entitlement records. Generate the qualified working SEE, download DOCX and PDF, and reopen the original immutable version through the customer interface.
6. Prove wrong-user/wrong-project denial, exact paid scope, versions/lineage, warnings and private original-byte storage. Inspect representative actual DOCX/PDF files natively.
7. Reconcile canonical launch status and documents after evidence exists; return commercial go/no-go without Production activation.

The generic legacy workspace uploader requests public Blob access. It must not be treated as proof of private working-SEE storage or used to upload private documents during this rehearsal. Uploaded plans/reports are not independently incorporated by this generation path. Do not use unrelated live-user pilot material as synthetic acceptance.

Research Viewer, Project Controls and the documented private pilots remain later work. Practitioner workflow material is not statutory authority.

## Continuity

Record each meaningful cloud change and result on PR #452 / Issue #395 without credentials, customer details or private documents. Retain failure evidence. Do not label unresolved items complete, resend authentication requests unnecessarily, or repeat secret-entry steps based on assumptions.
