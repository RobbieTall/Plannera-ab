# Working SEE Preview runtime handover - 2026-09-30

## Test lint correction: 30 September 2026

Robbie approved removing the two unused digest bindings introduced in the lookup
regression tests. The tests now explicitly omit the digest with Object.entries /
Object.fromEntries before recomputing it. Test intent and assertions are unchanged;
lint rules, source checks and application code are not weakened or modified.

Local revalidation passed: targeted Next ESLint on all five changed TypeScript
files; full TypeScript; 166 document Node tests; 64 document Vitest tests; 17
build-safety/offline-guard tests. Total remains 247, not an additional 247 tests.
The build-safety contract passed. The exact feature-branch deployment-disable
safeguard and GitHub workflow definitions remain unchanged.

Historical failure evidence: application commit f524c385a4cd8fd381752e9647ee133033133a3e
passed isolated validation in runs 36690183311 and 36690190692, but the separate
credential-free builds failed lint on the two unused variables. They are not
successful build evidence. Check the new exact-commit runs before declaring this
correction build-verified. No local Next build is claimed.

The installation log also reported dependency audit advisories; applicability
and fixes remain untriaged, and this narrow correction does not change dependencies.

No database operations, source refresh, schema changes, deployment, merge or
Production changes. Commercial HOLD remains: original-source provenance integration
on the two isolated children and protected customer DOCX/PDF acceptance are still
outstanding. Latest exact-commit CI results are recorded on PR #452 and Issue #395.

## Earlier checkpoints (historical where superseded above)

## Approved lookup corrections validated locally: 30 September 2026

This supersedes the earlier approval-pending and local typing/fixture failure
checkpoints. Both lookup corrections are implemented on this draft branch;
hosted customer acceptance and commercial status remain HOLD.

- LEP capture resolves numeric main-clause references through explicit aliases
  scoped to Byron LEP 2014 or Kempsey LEP 2013. Ambiguous aliases, other-council,
  wrong-year and schedule-suffix matches fail closed. The official URL must name
  the matching instrument, not merely use the official hostname.
- New DPP citations retain the exact server-selected DCP row identity and record
  fingerprint. Distinct rows sharing a human reference remain distinct; repeated
  selection of one unchanged row across topics does not create duplicate evidence.
- New captures use v2. Historic v1 envelopes retain their read-only validation
  path and are not rewritten or silently upgraded. Unbound old packs cannot
  manufacture new v2 evidence; regenerate through the normal authorised flow.
- The final synthetic-fixture correction supplies HTML text rather than null.
  No test assertions, source-freshness requirements or access checks were weakened.

Local validation with synthetic configuration and isolated generated Prisma types:
- Full TypeScript check passed.
- 166 document Node tests passed.
- 64 document Vitest tests passed, including 31 focused lookup tests and all 14
  generation integration tests. Do not count the focused suite twice.
- 17 build-safety/offline-guard regression tests passed.
- Total: 247 runtime regression tests passed.
- Build-safety contract passed; both real missing-database rejection checks passed.
  These are rejection tests, not evidence of database or commercial readiness.
- A sandboxed guard invocation failed because the tsx process could not run its
  local IPC setup; the unchanged credential-free guard passed when that process
  restriction was removed. Earlier dependency-copy/type failures are historical.
- No local application build was run. Remote isolated validation and separate
  credential-free compilation must be checked for the exact published commit.

Publication is confined to draft PR #452's existing feature branch. Its unchanged
vercel.json explicitly disables automatic deployment for
feat/see-document-delivery-20260929. Current PR head was reconciled before
publication; no main merge, manual deployment or environment change is included.
The Vercel deployment inventory still shows the existing isolated Byron/Kempsey
rehearsals; those deployments do not yet contain these lookup changes.

No database reads/writes, migrations, source ingestion, secrets, customer data or
private documents were involved in these corrections. Original source files,
issued documents and immutable acceptance snapshots remain untouched.

Next: inspect exact-commit CI, then prepare the separate non-destructive,
original-receipt-bound source refresh on the two approved isolated children.
Preserve existing row IDs/history, council separation and actual source timing;
do not run delete/replace importers or refresh timestamps without source proof.
After source integration and protected Preview deployment, prove real customer
DOCX/PDF generation, private downloads/reopening, permissions, warnings and
versions, and inspect representative files. No Production activation.

## Earlier checkpoints (historical where superseded above)

## DCP original-source comparison: 30 September 2026

This supersedes the earlier DCP-field diagnostic. The implementation reads
`numericMeta.sourceCapture`, NOT `numericMeta.provenance`. The earlier
query of `provenance` alone did not establish the required envelope was missing.
A corrected read-only query now confirms zero `sourceCapture` envelopes in
both isolated children for both council corpora. Existing source URLs are present.
No missing-envelope assertion should rely on the earlier wrong-field query.

The stored corpus labels are already `byron-dcp-2014` (826 rows) and
`kempsey-dcp-2026` (1,496 rows). Do not recreate or migrate Kempsey merely
because an obsolete 2013 PDF still appears in search results.

Official authority/version check:
- [Kempsey's current DCP page](https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan)
  links the 2026 plan, effective 1 July 2026, and describes transitional treatment.
- [Part A](https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-a-explanation-kempsey-shire-council-development-control-plan-2026.pdf)
  identifies adoption on 16 June 2026, commencement on 1 July, repeal of the 2013
  DCP and transitional provisions for undetermined pre-commencement applications.
  Preserve those distinctions; do not select a version from the LGA name alone.
- Byron's official DCP 2014 index was retrieved directly and its current chapter
  links matched the 39-source manifest. Chapter applicability/version must still
  be considered individually. No public-page summary certifies a particular site.

Original source acquisition and offline comparison:
- All five official Kempsey part PDFs and all 39 official Byron chapter PDFs were
  downloaded successfully over HTTPS and retained locally with original-byte
  SHA-256 values and response metadata. No cookies/credentials were supplied.
- The read-only comparison reused each importer’s parsing functions but blocked
  database access. Neither ingestion function was invoked.
- Byron: all 826 parsed records matched stored references, parent references,
  source URLs and SHA-256 body digests on the Byron child; zero unmatched records.
- Kempsey: all 1,496 parsed records matched stored references, source URLs and
  SHA-256 body digests on the Kempsey child; zero unmatched records. An initial
  MD5 diagnostic was superseded by this SHA-256 comparison.
- PDF extraction emitted font warnings. Text agreement is not visual proof:
  diagrams, tables, extraction completeness, source applicability and actual
  customer DOCX/PDF rendering remain unverified. No PDF visual pass is claimed.
- Kempsey HTTP Date and later validation-recorded times are kept separate; neither
  is fabricated as an exact application-ingestion timestamp. Byron acquisition
  start/completion times were captured around each request.

Kempsey original PDF receipts (HTTP 200):
| Part | Bytes | Pages | SHA-256 |
| --- | ---: | ---: | --- |
| Part A - Explanation | 954674 | 11 | `5757d0e8751dc5c1db5733796280b3b6ca15d4795f309a577c647b8dee3d751a` |
| Part B - Shire-wide requirements | 1190270 | 39 | `3a025693ed9c6b8a4e00c776538564eb125d4a6b450f0bbfcd319e70d66eac16` |
| Part C - Place-based requirements | 6453779 | 101 | `9652b7d02639f29c9b0a3d02ab9849807183b6a962b66232f2cd324c11c591a9` |
| Part D - Development requirements | 2179640 | 191 | `535b9ce0bc8ae9d7cce891ed1cde4392661528482225a3171fe28e6f813d318a` |
| Part E - Appendices | 1901931 | 75 | `312b1f6daf3a5f41c293ef45025dbecc07d38122076b00a4a7b4ac032945a5f2` |

This evidence supports preparing a source-bound, non-destructive provenance
addition for unchanged child records; it is NOT execution authorisation or proof
that provenance has been persisted. Retain original files/receipts durably before
a hosted readiness claim. Do not merely update timestamps or run the current
importers: both contain corpus delete/replace operations that can change row IDs.

A second lookup issue is now confirmed: 79 human-reference groups in the Byron
corpus contain multiple rows. The new pack-capture implementation reduces DCP
citations to a reference string and requires one matching row, so such references
remain unavailable even after freshness is resolved. Fix citation-to-record
binding using exact server-selected identity/source evidence; retain fail-closed
behavior for genuine ambiguity. Never choose the first matching row, silently
deduplicate different bodies, or combine different chapters. This agent-authored
lookup correction, together with the LEP mapping fix, requires Robbie's approval
before edits and regression tests. No correction has yet been applied.

All source/database operations in this checkpoint were read-only. No stored data,
schema, evidence snapshots, deployment settings or Production state changed.
Commercial HOLD remains until source integration, unambiguous capture and the
complete protected project-specific Word/PDF journey are proven.

## Earlier checkpoints (historical where superseded above)

## Source-integration inventory: 30 September 2026

Application commit `feb75947ba0bd26f6deef368bafa854d1b2a85f9` passed both
`isolated-validation` and `credential-free-compilation` in
[run 36681846126](https://github.com/RobbieTall/Plannera-ab/actions/runs/36681846126).
This proves the isolated checks/compilation only, not hosted document acceptance.
The six focused parser tests and two original-file comparisons are recorded below.

Read-only Neon branch metadata confirmed the two intended children remain ready,
non-default and distinct, with their expected parents. No credentials were read.
Queries were explicitly scoped to those children and `neondb`; Production was
not queried or changed.

The cloned LEP inventory in both children still has:
- Byron: 128 current records, last retrieval 13 June 2026, with the incorrect
  `epi-2014-355` citation on its Instrument row.
- Kempsey: 103 current records, last retrieval 13 June 2026, with the correct
  `epi-2013-0712` Instrument citation.
- No numeric-only current clause keys and no records retrieved within seven days.

Core rows inspected on the Byron child use `BYRON_2014_2_3` and
`KEMP_2013_2_3` (similarly 4.3/4.4/4.6), while the new pack capture queries
literal numeric references such as `2.3`. The capture lookup therefore requires
an explicit, council/instrument-bound mapping. A read-only query must reject
ambiguous matches and cross-council/schedule collisions; do not insert numeric
duplicate rows or disguise stale sources as current. Robbie has been asked to
approve correcting the agent-authored lookup and adding regressions. It is not
yet changed, deployed or proven.

An offline original-file comparison using the existing council prefixes found:

| Council | Existing current rows | Newly parsed rows | Same key/body | Same key, changed body | New keys | Existing keys absent from parsed output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Byron | 128 | 162 | 111 | 2 | 49 | 15 |
| Kempsey | 103 | 137 | 82 | 5 | 50 | 16 |

The absent keys are legacy bare schedule numbers. These counts are planning
diagnostics, not authorised deletes or proof of repeal. Explicitly map reviewed
schedule identities and preserve old records and issued-document snapshots.
A new clause version must respect the maximum historical version, not merely the
current row. Unchanged text still needs genuine source revalidation; do not refresh
timestamps alone. The original XMLs remain local and unchanged.

On the Byron child only, the DCP inventory contains 826 Byron and 1,496 Kempsey
rows; none has a `numericMeta.provenance` field. Latest row updates are
29 August 2026. This is not a full DCP semantic/provenance audit and does not prove
the Kempsey child's DCP state. It identifies another prerequisite: reviewed
official DCP acquisition and source-bound provenance before the capture can pass.

Next sequence:
1. Correct and test explicit LEP reference resolution after approval.
2. Prepare a non-destructive, receipt-bound refresh plan for each isolated child,
   with correct instrument links, original bytes/version identity, explicit source
   acquisition method, and reviewed clause/zone mapping. No force-replace/backfill.
3. Acquire and validate applicable official DCP and spatial sources separately.
4. Generate new project-bound packs/documents through normal protected Preview
   flows; test private download, permissions, immutable reopening and versions.
5. Inspect actual DOCX/PDF presentation and record the final commercial decision.

No database rows, schema, deployment settings or Production behavior were changed
by this investigation. Commercial HOLD remains.

## Earlier evidence checkpoints

## Approved schedule-identity correction: 30 September 2026

Latest checkpoint: the parser correction is implemented and locally validated;
hosted document acceptance and commercial status remain HOLD.

The original XML parser reused visible clause numbers across schedules. Both
downloaded source files produced 11 duplicate-key groups (schedule 1 versus
schedule 6, clauses 1-11). XML schedule provisions now use their official scoped
IDs, for example `SCH_1_SEC_1` versus `SCH_6_SEC_1`. Main-clause and HTML
identifiers retain their existing behavior. No clause wording is rewritten.

Validation of this correction:
- Focused strict TypeScript compilation passed.
- Six synthetic runtime regressions passed: main provisions, distinct schedules,
  nested schedule divisions, grouped zoning text, HTML compatibility, and distinct
  unnumbered schedule provisions.
- Two separate original-source checks passed against the SHA-256 values recorded
  below: Byron 162 parsed records; Kempsey 137; zero duplicate output keys in each.
- Against the unchanged parser, every non-key field and record order was identical:
  title, body HTML/text, hierarchy and content hash. Core 2.3/4.3/4.4/4.6 records
  were entirely unchanged. These comparisons establish no regression from this
  identity fix, not independent proof of complete statutory extraction.
- The six regression tests are added to the isolated GitHub workflow. Remote
  validation for the new commit is pending; previous successful runs are historical.

The earlier broad mismatch diagnostic counted nested zone-group provisions as
missing despite their text remaining in parent records, and assumed visible
numbers for unnumbered provisions. Those counts are not evidence of lost clauses.
Full parser completeness, unit/superscript fidelity, semantic applicability,
fresh DCP/spatial coverage and hosted output quality still require review.

This changes keys for future parsing only. No stored records, receipts, source
timestamps or historical document/acceptance snapshots have been rewritten.
Before any isolated-child ingestion, explicitly reconcile these scoped keys and
the existing prefixed main-clause keys with the pack reader's numeric references.
Do not insert duplicate aliases, silently remap history, force-replace clauses,
or call the existing admin ingestion endpoints. Durable original-source binding
and a child-only non-destructive refresh path remain prerequisites.

Publication is limited to draft PR #452's deployment-disabled feature branch.
No main merge, deployment, database access or Production change is part of this
correction. Production checkout remains outside this task.

## Earlier checkpoints (historical where superseded above)

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

## Manual original-source checkpoint: 30 September 2026

Both official XML files have now been manually downloaded by Robbie and inspected
locally. This supersedes earlier download-blocked status for these two manual
rehearsal inputs only. Automated HTTP retrieval remains unproven.

| Council | Original export filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Byron | `epi-2014-0297_2026-09-30.xml` | 1315362 | `42196389383aa5a424fd8d9b619b473d4df28a1061b672f1e5c2aceff869f821` |
| Kempsey | `epi-2013-0712_2026-09-30.xml` | 1128828 | `ee5269d8709cad6615a59ccd02d99bdbff485d9d699130c8c4c5d4417e438720` |

UTF-8 decoding and XML well-formedness checks passed with entity processing
disabled. Identity and version metadata match the official pages inspected:
Byron LEP 2014, first.valid.date 2026-07-03; Kempsey LEP 2013,
first.valid.date 2026-07-01. Kempsey's official XML council code is `KEMP`,
not `KEMPSEY`; any future identity validator must use an explicit reviewed
mapping together with instrument ID and title, never a fuzzy council match.
Version IDs: Byron `3b18cafa-cf70-402d-83d9-8ef1f17d0c4e`;
Kempsey `77285005-6e77-4d8a-ae77-da49d3ccbb54`.

These checks do not prove DTD conformance, complete clause extraction, spatial
applicability, current DCP coverage, automated freshness or successful ingestion.
The originals were not modified or uploaded. No database writes occurred.
No successful HTTP receipt or exact download timestamp has been invented.

## Source freshness operating rule and remaining implementation

Older local-folder and repository copies are historical inputs, not inherently
current authoritative evidence. Do not delete them or overwrite immutable
acceptance snapshots. A current-looking filename, a new upload, successful parsing,
a fresh build or a database timestamp is not evidence of current legislation.

Before a source is represented as current:
1. Resolve its correct official instrument identity and authoritative source.
2. Check official version/publication/effective information and record when checked.
3. Preserve exact retrieved bytes, their hash, the source/version URL and the actual
   acquisition method (manual download versus successful automated retrieval).
4. Validate semantic identity, applicable scope and parser coverage. Keep LEP,
   DCP and spatial-layer freshness separate; one cannot establish the others.
5. Compare against the prior source version. If text is unchanged, revalidation
   still requires a genuine official check; never refresh dates on bundled fixtures.
6. Preserve documents already issued against their original source version. New
   evidence produces a new document version and identifies affected earlier work.
7. If retrieval or currency cannot be confirmed, label that limitation clearly.
   Do not silently substitute stale evidence or claim submission readiness.
   Useful qualified drafts may continue only where the existing product supports
   them safely; this rule is not permission to weaken evidence gates.

Recurring refresh, change detection, controlled re-ingestion, affected-project
notification and regeneration are requirements, not proven capabilities of this
helper. It is a date-pinned rehearsal transport primitive with no callers.
NSW's published XML guidance asks automated processing to run outside normal
NSW business hours: https://legislation.nsw.gov.au/help/export .
The current task must prove a safe refresh on the two isolated children before
claiming the customer document journey complete; it does not activate Production.

Next: validate extraction/provenance and an explicit child-only ingestion path,
then fresh project/site/pack preparation and actual DOCX/PDF generation,
private download/reopening, permissions, warnings and native document review.
Commercial HOLD remains.
