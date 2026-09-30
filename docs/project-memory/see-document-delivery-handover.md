# Current document-delivery handover - 30 September 2026

**Commercial HOLD. Production activation is not authorised.** This section supersedes all status and next-step statements below; historical checkpoints are retained, not instructions to repeat setup.

- Active work: draft PR #452, feature branch `feat/see-document-delivery-20260929`. The separate mobile documentation branch and immutable Item 78C acceptance remain untouched.
- Application correction `cc906ae285968bdd69ea4ded18490efc1af102b4` passed **315 tests**, full TypeScript and separate credential-free compilation in [run 36699459863](https://github.com/RobbieTall/Plannera-ab/actions/runs/36699459863). Breakdown: 11 safety + 52 source planner + 178 Node + 68 Vitest + 6 offline. This is not hosted customer acceptance or a guarantee of dependency safety.
- Two independent isolated Preview databases, the approved working_see enum addition, branch-scoped configuration, official DCP/scoped LEP refreshes and protected deployments are already complete. Do not repeat credentials, copies, migrations or source refresh merely because an old checkpoint says they are pending.
- The deployed Byron and Kempsey application revisions predate the latest DCP scope correction. No new deployment followed that correction. See the exact refs, deployments and source-refresh limits in the [hosted checkpoint](../operations/working-see-hosted-rehearsal-checkpoint-20260930.md).
- Normal Byron DPP/pre-SEE generation ran, but customer Word/PDF generation failed. Source capture and saved canonical council provenance remain incomplete. Current official Byron boundary data has a future end date; our null-only lookup excludes it. The targeted correction is diagnosed but not applied and its requested approval remains pending.
- Kempsey's independent Preview needs normal customer sign-in. Do not request another Stripe connection or recreate saved secrets.
- Remaining proof: correct official council-date handling with expired/conflicting/ambiguous rejection, refresh site through the normal flow, regenerate new bound DPP/memo versions, then prove both councils' actual project-specific Word/PDF generation, protected download, original-byte reopening, permissions and warnings. Native Word/PDF review is still required.
- Production checkout has not been activated; Production data/schema and main are unchanged. Feature and rehearsal automatic-deployment safeguards remain in place. Re-establish target safety before any future push, merge or manual Preview deployment.

Read [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5908899235), [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452), and the hosted checkpoint first. Research Viewer, Project Controls and private user pilots remain deferred.

## Read-only delivery contract review

At the application correction above, the reviewed download/list paths require a real session and Preview, check project membership and exact paid SEE entitlement before private file reads, and repeat those checks on each request. Version-bound private keys and byte hashes prevent silently substituting a newer project document. The workspace passes its canonical project ID and remounts document controls when the project or source version changes.

Existing synthetic regressions cover wrong scope, denied membership, revoked purchases, cross-council substitutions, malformed requests, corrupt bytes, private error responses and original-version reopening. This is a scoped code/test review, not an independent security audit or hosted permissions pass. Collaborator/ownership policy, real wrong-user denial, actual Blob access and customer file reopening still require the planned controlled Preview proof.

---

# Historical checkpoints below (superseded status, preserved evidence)

## Local prerequisite checkpoint: official council-point lookup

A new read-only adapter is prepared LOCALLY ONLY in
src/lib/see-document-council-identity.ts with
tests/see-document-council-identity.test.ts. All 10 isolated tests, full TypeScript
and focused lint PASS. It is not yet connected to normal site persistence or the
generation loader and is not included in the published application/CI test count.

The source is NSW Spatial Services' LocalGovernmentArea layer:
https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/MapServer/8
Official layer metadata was inspected on 2026-09-29. The adapter queries only a
fixed HTTPS endpoint, an explicit WGS84 point, current rows, two-result limit and
selected non-personal fields, with no credentials or redirects. It bounds response
size/time, preserves the original JSON and SHA-256/retrieval time, rejects missing,
multiple, truncated or malformed results, and limits canonical councils to Byron
and Kempsey. Stored evidence is checked against the exact current point and expiry.
It identifies a point's council, not full parcel extent, address accuracy,
statutory planning controls or LGA coverage maturity.

No new adapter call has fetched a real project location. Tests use in-memory
responses only. No database write, canonical-code backfill, migration, deployment
or Production change occurred. The actual normal site-saving integration and
generation requirement remain to implement and test; do not call this gap closed.
Resume from these two existing local files and the current draft branch.
The published Linux/Preview-readiness checkpoint below remains authoritative.

## Current checkpoint: Linux proof complete; protected Preview prerequisites absent

Both approved test-only corrections are complete: the mock type assertion stays
on its expression line, and the in-memory integration project supplies every
required Project field with a checked type. No application validation or evidence
requirement was weakened. This commit publishes the previously local source-capture
and ordinary-pack generation work to DRAFT PR #452, not to main or a deployment.

### Implemented

- Byron and Kempsey importers retain actual source retrieval time, original PDF
  SHA-256 and exact stored clause-text SHA-256. Original composite hashes are not
  relabelled as clause-text fingerprints. Legacy rows are not backfilled.
- Saved zoning retains the authoritative lookup code separately from its display
  label and rejects conflicting labels.
- Normal DPP creation has a default-off Preview-only source-capture hook:
  PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 AND VERCEL_ENV=preview.
  Capture is stored in the SAME NEW pack payload; unavailable evidence is explicit
  and does not prevent saving a qualified DPP.
- After owner, exact paid entitlement, memo/QSC/pack and saved spatial checks,
  generation consumes the ordinary pack's source envelope and rereads current
  LEP/DCP records. No pretend PathwayAssessment is manufactured.
- The genuine existing assessment path is retained for packs without an ordinary
  capture. A present invalid capture cannot fall back to different evidence.
- Shared checks enforce exact citations/excerpts, source identity, version,
  freshness, body fingerprints and trust markers. Source retrieval timestamps are
  never reset to document-generation time. Capture time bounds later row persistence.
- Isolated CI includes the new capture/importer and ordinary-pack generation tests.

### Validation evidence for this application revision

Local synthetic, credential-free validation is complete:
- FULL TypeScript PASS, without excluding either corrected test file.
- Focused ESLint PASS across all fourteen changed application/test/workflow files'
  TypeScript entries.
- 121 core document/source/provenance Node tests PASS.
- 4 importer integration + 13 generation integration + 11 pack capture tests PASS.
  Total: 149 UNIQUE document-related tests. The overlapping combined 60-test run
  also passed but is not added again to this total.
- Build-safety contract PASS: 7 permitted commands, 6 entries, 14 transitive sources.
  Its 11 regression tests PASS. Total local focused tests including safety: 160.

The integration tests use in-memory databases and mocked HTTP/PDF import I/O,
with real saved-record parsers, memo compiler, source rechecks and DOCX/PDF renderer.
Both ordinary-capture council cases and the eight existing assessment-path cases
pass. Both normal createDetailedPlanningPackArtefact capture cases pass.
Network/global database use is forbidden by the local harness.

These results do NOT establish authentic statutory evidence, cloud ingestion,
protected Preview customer downloads, native Word/PDF reopening, or one complete
normal DPP -> memo -> generation -> delivery run. No synthetic test records may
be promoted as planning evidence. GitHub run 36558368296 now confirms FULL TypeScript and 175 focused Linux tests
PASS: 121 core Node + 43 native Vitest (including 15 renderer) + 11 safety.
Source commit 2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 was tested through PR merge
snapshot 2e4bddfaeebd52c5d1e057b3b2a7c431cc3a3142 against unchanged main.
The separate credential-free Next compilation job 109372924835 PASSED, including
37 static pages and optimization. This was compilation, NOT a Production deployment.

The isolated-validation job 109372924997 still FAILED after all tests at full
vercel-build's unchanged synthetic Prisma database smoke: an engine-free client
requires prisma:// or prisma+postgres:// rather than the synthetic localhost
Postgres URL. No live credential was substituted and no check was disabled.
Twelve other applicable PR workflows passed their automatic non-stateful checks.
The full build gate and commercial readiness remain NOT green.

The earlier 142-test Linux/Next compilation result belongs only to source 3ef7a7d.
Its complete vercel-build failed at the unchanged synthetic Prisma database smoke;
that is still unresolved, not bypassed or presented as a full-build pass.
Existing dependency advisories remain subject to release-risk assessment.

### Current protected Preview evidence (read-only recheck)

Both previously identified council targets are still distinct, non-default Neon
branches with their expected independent endpoints. Production was not queried.
Explicit READ ONLY transactions with an eight-second statement timeout returned
aggregate counts only; no address, person, document body or credential was read.

For BOTH targets:
- working_see is still absent from the ArtefactType enum.
- No SiteContext has a BYRON/KEMPSEY canonical council code.
- No saved SiteSpatialProvenance record exists.
- No relevant DCPClause row has the new sourceCapture envelope.
- No current Byron/Kempsey LEP row has retrieval within the seven-day policy.

Therefore a deployment alone cannot prove customer generation. Fresh source
ingestion must preserve genuine retrieval/provenance, not relabel existing data.
The normal site resolver's persistence currently uses candidate.lgaCode or null;
canonical council identity needs an evidence-based normal-flow solution, not a
manual code backfill or an assumed council from an address string. That application
prerequisite must be completed/proven before calling a Preview rehearsal ready.

Preserve the existing acceptance snapshots and source revisions. Prepare separate
document-rehearsal targets where writes are needed, then obtain scoped approval
for their additive schema step, source refresh and protected deployment. No such
write, branch creation, migration, ingestion or deployment has occurred here.

### Resume and remaining commercial gates

The test-correction approval blocker is resolved. Continue from this draft PR,
not a new branch or recreated cloud setup. The exact-commit Linux results are above. Next prepare the separately
authorized isolated Preview prerequisites: canonical council identity from actual
resolution, saved authoritative spatial evidence, current retained LEP/DCP source
envelopes and the unapplied working_see enum migration. Do not guess council codes,
bulk backfill evidence or run importers under this documentation update.

Protected Preview must then prove BOTH councils' actual customer generation,
private download, original-version reopening, wrong-user/wrong-project rejection,
evidence warnings, document versions and native Word/PDF presentation. Uploaded
plans/reports remain explicitly not independently incorporated by this path.
Seven-day source freshness is an operational policy, not statutory currency proof.

### Deployment safety and status

Before this documentation-only update, draft application head
2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 and
main ff2179e06f68a8f265d7cc0b873cd28320a4da6b were unchanged. The retained exact
branch deployment-disable rule for feat/see-document-delivery-20260929 remains
in vercel.json; the latest twenty-deployment inventory contains no deployment for
this branch. Previously inspected automatic workflows remain unchanged except
the isolated, credential-free test-list extension. Stateful workflows are not
dispatched. Static checks do not guarantee arbitrary dependency behaviour.

Publication is to the existing draft feature branch only, without force, merge,
deployment command, schema/data mutation, real ingestion, cloud setting changes,
payment action or private-document publication. Production checkout remains off.
Other mobile documentation branches and immutable Item 78C evidence are untouched.
Research Viewer, Project Controls, practitioner governance and live-user pilots
remain compatible and deferred. Commercial decision remains HOLD pending the
actual protected customer document journey. No Production activation is authorized.
## Guarded customer generation checkpoint

The draft now connects an explicit Preview workspace action to a protected POST
generation endpoint. It accepts only the selected saved DPP/memo identifiers and
an acknowledgement that the output is a working document. It does not accept
browser-supplied planning evidence, purchase grants, private storage paths or file
bytes. Same-origin, bounded-input, real-session and owner checks precede source
assembly; exact paid SEE scope and active entitlement are checked again.

Actual database joins load the selected current-site DPP/QSC/memo chain, retained
site lookup and its bound assessment/source snapshots plus linked current clauses.
The full saved source body, digest, dates, clause identity, official source URL and
quoted excerpt must agree. Missing or unsupported snapshot provenance fails
closed. The current adapter supports NSW legislation document URLs and direct
official Byron/Kempsey council PDF sources only. It does not infer an official
document from a generic homepage or fabricate a retrieval date. Other legitimate
source shapes require a reviewed adapter, not a weakened check.

The canonical compiler creates the full working section structure, then the
existing renderer/persistence stores original DOCX/PDF bytes privately. Source
signatures are reloaded inside the serializable pointer transaction; a changed
source or revoked entitlement cannot publish a successful version. A failed final
transaction can leave a private unlisted object as already documented; no automatic
deletion or overwrite is added. Separate intentional generation actions may make
new versions; this path does not initiate payments or consume a new purchase.

IMPORTANT LIMIT: uploaded plans/reports are not independently incorporated by
this generation path. The document explicitly records this and remains
MORE_EVIDENCE_REQUIRED / NOT SUBMISSION READY. Missing survey evidence alone is
not a ban on a working draft; unsupported authoritative planning sources or
identity mismatches are. This implementation is not proof of assessment quality
or a finished customer journey.

Default-off gate: `PLANNERA_WORKING_SEE_GENERATION_ENABLED=1` AND
`VERCEL_ENV=preview`. Do not enable it until the exact Preview deployment,
isolated database and private Blob target are established, and the prepared
working_see enum migration is separately approved/applied to that target only.
The site-provenance retention gate remains separately default-off. No live flags,
migrations, cloud source records or documents have been changed by this code.

Previous checkpoint 0c29a6ca570effd479ed20b67fcbdd657e0812d7 passed 99 focused Linux
tests and the full credential-free Next build in run 36539743899. Its full
vercel-build still failed the unchanged database smoke under synthetic engine-free
Prisma configuration. The new generation changes require their own exact-commit
validation, recorded in PR #452 / Issue #395; prior results are not inherited.

Next: resolve genuine validation failures, inspect actual protected Preview source
availability without fabricating missing records, then separately approved Preview
migration/deployment and both-council generation/download/original-byte reopening,
permission denials, version checks and native Word/PDF review. Commercial HOLD.
No Production activation. Other documentation branches, immutable Item 78C evidence,
Research Viewer, Project Controls and deferred private pilots remain untouched.

## Saved-site provenance prerequisite

The document-delivery draft now retains a real resolver result for later reload,
behind `VERCEL_ENV=preview` and the default-off
`PLANNERA_WORKING_SEE_SITE_PROVENANCE_ENABLED=1` switch. Production behavior is
unchanged. Do not enable this switch until the exact protected Preview deployment
and its isolated database target have been independently established.

This uses the existing SiteSpatialProvenance model; it adds no schema migration.
The separate working_see enum migration remains PREPARED ONLY. No migration,
cloud lookup/write, environment change or deployment was performed for this code.

Retention accepts only complete official-service lookup provenance from the
server's resolver, never browser-supplied evidence. It binds the exact project,
site, address, council, parcel/coordinates, zone and saved-site revision. A
serializable append rejects concurrent site changes; retries never overwrite an
existing snapshot. Reload revalidates the envelope, digest, source metadata and
binding. Candidate/manual/launch-fixture results are not promoted. Changes to
the site invalidate old bindings without deleting historical evidence.

The 24-hour cache lifetime is an operational freshness ceiling, NOT a statutory
currency guarantee. The digest covers the captured normalized lookup envelope,
not the full upstream feature response. Existing snapshots are neither backfilled
nor presented as authoritative by default. LEP/DCP source currency, applicability,
full-source bindings and paid generation remain separate unfinished work.
Survey/report gaps must stay visible without falsely marking a draft as ready
for submission.

Site-context saving and provenance append are separate operations. A failed
append can leave the site saved without this evidence; the operation reports
failure rather than inventing proof. Reload falls back to the existing unverified
representation when no valid record exists. Database errors are not hidden.

Fourteen synthetic regression cases cover Preview gating, replay, tampering,
staleness, identity/revision changes, concurrent changes, coordinate/parcel matches
and missing evidence. Exact execution results are recorded in the linked PR/Issue
#395 checkpoint and isolated CI; this is not protected Preview customer proof.
The prior code commit's 85-test result does not automatically cover this change.

**Commercial HOLD:** trusted saved-source generation and actual both-council
generation/download/original-byte reopening still need completion. No Production
activation, no real paid journey, no acceptance snapshot changes. Research Viewer,
Project Controls and all three real-user pilots remain deferred; PR #451's mobile
documentation branch is untouched.

## Verified saved-version checkpoint

Code commit `210dfb255ae27a6c58c8f1e0dddf1225d61bca2b`, [Linux run 36536822465](https://github.com/RobbieTall/Plannera-ab/actions/runs/36536822465):
**85 focused tests passed** (11 build safety, 59 delivery/storage/HTTP/persistence/
version-list tests, 15 renderer), full TypeScript passed, and the complete
credential-free Next build passed, including lint/types, 37 static pages and
optimization. Eleven other applicable PR workflows passed their non-stateful checks.

The full `vercel-build` remains failed at the unchanged database smoke: its
engine-free Prisma client rejects the synthetic localhost datasource protocol.
No live credentials were supplied and no release gate was disabled. Passing
compilation is not database-readiness or real customer-download evidence.

PR #452 now includes the actual Preview workspace saved-version controls. Trusted
saved-source generation, separately authorised isolated Preview migration/deployment,
both-council real delivery/reopening and native Word/PDF review remain unfinished.
**Commercial HOLD.** No merge, deployment, stateful acceptance or Production change.
The mobile documentation branch and all three deferred pilots remain untouched.

## Saved-version customer controls checkpoint

Draft implementation now adds a Preview-only saved-version list to the actual
project workspace, plus Word/PDF download buttons, original generation timestamps,
source DPP/QSC references and expandable evidence warnings. It is separate from
the existing planning memo/text export. Production does not render these controls.

The paginated metadata endpoint reuses the download service's project membership,
exact paid SEE scope, active entitlement and original-source checks. It does not
open private file storage while listing. Browser downloads use exact-version
same-origin endpoints and check byte length and SHA-256 before saving; errors
cannot be mistaken for successful document downloads. The original-byte endpoint
still independently verifies authorization and stored file integrity.

Robbie approved the narrow typing corrections. Local full TypeScript checking,
focused lint, all 59 document Node tests and all 11 build-safety tests now pass.
The MIME projection uses the validated format's known MIME constant; test query
mocks have explicit types. No validation or security rule was disabled.
Linux run 36536822465 now confirms 85 focused tests, full TypeScript and the
complete credential-free Next build. The unchanged full-build database smoke
still fails with synthetic configuration. This is not hosted delivery evidence. Trusted saved-source generation, an explicitly approved
isolated Preview migration/deployment, real customer file reopening, native Word
review and the commercial decision remain outstanding. No production change,
migration, stateful acceptance, merge or deployment has been performed.

# Customer Word/PDF delivery handover

## Latest verified persistence checkpoint

Code commit `0a081d39fd026d2fd7608e8913cc6c666150509d`:
[Linux run 36533924975](https://github.com/RobbieTall/Plannera-ab/actions/runs/36533924975)
passed all 69 focused tests (11 safety, 43 delivery/storage/HTTP/persistence,
15 renderer), full TypeScript and the complete credential-free Next build.
Ten other applicable PR workflows passed. The unchanged full `vercel-build`
still fails its database smoke under synthetic configuration; this is not a
completed release gate. No live database credentials or cloud writes were used.

Private persistence is implemented in draft code, not yet a hosted customer
capability. Next: trusted source assembly and generation endpoint; customer
version/download UI; independently authorised isolated Preview enum migration;
controlled Preview deployment and both-council permissions/download/reopening
proof; native Word/PDF review. No Production activation. The schema migration
is prepared only, and the current documentation is on draft PR #452, not main.

## Current checkpoint - 29 September 2026

Commercial decision: **HOLD**. Production activation is not authorised.

Item 78C's automated decision remains **READY_FOR_NON_PRODUCTION_ACCEPTANCE**:
[run 36426605240](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240),
runner `0a871d38a5806e6a28404700d660f5d363f3a1d4`. Its retained artifact is
decision JSON, not customer Word/PDF files. Preserve that immutable evidence,
the independent council fixtures and draft PR #450's detailed closeout.

The active task is a separate customer document journey. The existing hosted
Generate SEE flow is a pre-SEE memo/text export; it must not be marketed as
a proven paid Word/PDF journey.

## Prepared implementation

- Reconciles useful presentation work from PRs #433, #434 and #435: current-issue
  revision history, shared presentation model, native Word contents field,
  styles relationship, PDF page references and qualified working-document labels.
- Adds immutable project/evidence/version-bound DOCX/PDF snapshots.
- Adds Preview-only authenticated downloads, exact-scope paid entitlement checks,
  private storage reads and original-byte reopening.
- Implements private snapshot persistence and metadata-only pointers in draft code.
  Trusted customer generation and UI remain unfinished. No cloud snapshot has been created.
- New implementation branch: `feat/see-document-delivery-20260929`.
  Its first commit includes `git.deploymentEnabled: false` for that exact branch.
  No merge or manual deployment is part of draft publication.

## Evidence and limits

The approved corrections are complete. Local evidence: 37 focused Node checks,
full TypeScript checking, the pure working-SEE acceptance and static build
contract passed. The revised synthetic PDFs have 11 pages each; representative
cover, document-control and continuous-section pages were visually inspected.

The full local build did not complete: the sandbox blocked tsx's local socket,
and a permitted retry ended when esbuild stopped during launch smoke. No macOS
security bypass was used. The new Linux workflow must supply full-build evidence;
its existence is not a passing result. Native Word review of this new revision
and actual protected Preview generation/download/reopening remain unproven.

Static import/fingerprint checks constrain reviewed entrypoints; they do not
prove every dependency or Next.js build behavior non-mutating. The isolated CI
job has no cloud credentials, environment binding or deployment command, disables
install lifecycle scripts, and executes checks under a cleared environment with
synthetic localhost configuration. Dependencies still require network downloads.

## Exact next work

1. Obtain the draft commit's isolated Linux CI results and resolve genuine failures.
2. Assemble actual saved project candidates without inventing source URLs, retrieval
   dates or spatial evidence. Keep survey gaps explicit, not falsely verified.
3. Persist private immutable snapshots and metadata-only pointers; never put file
   bytes in Artefact payloads exposed by project listing.
4. Add project generation, version selection and Word/PDF download controls.
5. Establish deployment safety for a separately controlled protected Preview.
6. Prove both councils' authorized downloads, denied cross-project/unauthorized/
   revoked access, original-byte reopening, warnings and version identity.
7. Review the downloaded documents in Word and a PDF viewer, then report a
   commercial go/no-go. Passing unit tests alone does not close this task.

## Continuity and boundaries

Read Issue #395, this file, the build-next queue and
[download contract](../operations/working-see-download-contract.md).
Record the exact commit and CI/Preview evidence after each meaningful milestone.
Do not repeat paid sessions or request credentials without confirming saved state.
Keep Production checkout disabled; do not mutate Production data/schema.
Do not merge main or deploy Production without explicit approval.

PR #448 Research Viewer and PR #449 Project Controls remain deferred. Preserve
original-source provenance, project identity and immutable version bindings.
Screenshots alone are not authoritative evidence. Do not build those features
to avoid completing the current commercial gate.

## Approved continuation and practitioner governance

Robbie confirmed that the concurrent documentation branch is mobile work and
authorised continuing PR #452 without touching it. The build-safety regression
test's expected transitive-source count is corrected from 13 to 14 to include the
reviewed presentation module; all dependency and mutation checks are retained.

PR #451 records Practitioner Workflow Intelligence and a later real-user pilot.
Practitioner material may inform what Plannera checks; authoritative current
sources determine what Plannera says. It is not statutory authority, a complete
council methodology, a universal checklist or a substitute for wider professional
review. Assessment breadth and depth must scale with development complexity.

The real-user pilot follows the commercialisation-critical work. It is not a
golden case or planning precedent, and no project-specific conclusions belong in
Byron rules. Do not ingest or publish that project's private files as part of this
draft. Reconcile canonical governance after PR #451 is merged, without modifying
the mobile branch or interrupting the current document journey.

## Linux validation checkpoint

At commit `7c2877ffcde1b796e7b17a0a59d2568ef608ed89`,
[isolated run 36530989953](https://github.com/RobbieTall/Plannera-ab/actions/runs/36530989953)
passed full TypeScript checking, 11 build-safety tests, 29 delivery/HTTP/storage
tests and 15 renderer tests. Seven other PR workflows also passed.

The complete `vercel-build` did not pass: `smoke:launch` invokes a database read,
and synthetic localhost configuration with the engine-free Prisma client cannot
satisfy it. No live database credentials were supplied. The new separate
credential-free compilation job calls the existing sanitized Next build wrapper;
it does not replace, disable or satisfy the database smoke gate. Its result is
pending. Do not call the full build or the customer journey accepted.

The dependency installer also reported vulnerability advisories in the unchanged
lockfile. Exploitability/release impact has not been assessed; do not claim the
application is vulnerability-free or run an automatic force-upgrade.


## Approved metadata lint correction

The separate compilation job at `cc7132c11361c438e7a9c07dc969da1cdf6ef672`
compiled the application bundle, then failed lint on the unused `_bytes` binding.
Robbie approved its correction. The manifest now explicitly selects only format,
MIME type, content hash and byte length, preserving their order and excluding
file bytes. No lint/security rule was disabled. The focused local lint check
passed; Linux validation of this correction is pending. Bundle compilation alone
is not a completed Next build. The database smoke and real customer journey
remain outstanding, and the commercial decision remains HOLD.


## Verified correction results

Code commit `a199e2f262f1824ddcc8448a56c0e1ff4af5ff50` completed
[run 36532529622](https://github.com/RobbieTall/Plannera-ab/actions/runs/36532529622).
The credential-free compilation job passed the complete Next build, including
lint, types, static generation and page optimization. Full TypeScript checking
and all 55 focused tests passed (11 safety, 29 delivery/storage/HTTP, 15 renderer).
Seven other PR workflows also passed their applicable non-stateful checks.

The isolated-validation job still ends in failure when the unchanged complete
`vercel-build` reaches its database smoke. The engine-free Prisma client rejects
the synthetic localhost datasource protocol. This is not a passing release gate;
no cloud database was contacted or live credentials supplied to satisfy it.
The Next build emitted a non-fatal dynamic-route diagnostic for `/api/dcp/search`.

Next: trusted saved-source generation, private snapshot persistence and metadata
pointers, then customer version/download UI and protected Preview proof for both
councils. Keep source gaps explicit. No merge or deployment occurred. This result
is recorded on the draft PR branch, not merged main; commercial status is HOLD.


## Private persistence implementation checkpoint

The draft now includes an append-only private Blob writer and an owner-authorised
persistence service. Both deny non-Preview or disabled-write configurations before
I/O. The writer refuses overwrite, verifies original bytes through a private read,
and accepts retries only when that read proves an identical snapshot. The service
checks exact paid SEE scope and original project source records before upload,
then rechecks authorization in a serializable transaction before publishing a
metadata-only pointer. No provider URL or file bytes belong in the Artefact row.

A distinct `working_see` Artefact type and additive migration are PREPARED ONLY.
No database migration, cloud write, Preview deployment or Production change has
been executed. Do not run migrations from builds. A separately authorised isolated
Preview migration and target-safety check are required before enabling persistence.
On a database failure an uploaded object remains private and unlisted; an identical
retry can finish its pointer. Do not automatically delete it: concurrent work may
already reference it. Retention/repair must use an explicit inventory and approval.

Persistence tests use injected in-memory databases and private storage. Their tiny
byte fixtures do not prove Word/PDF validity or cloud transaction behavior. Existing
renderer tests cover synthetic document rendering separately. This checkpoint's
validation is pending. Trusted saved-source assembly, actual generation endpoint,
customer UI/version controls and hosted both-council proof remain unfinished.


Local persistence validation: full TypeScript and focused lint passed; all 43
combined delivery/storage/HTTP/persistence Node tests passed using a pure TypeScript
transpilation harness. The native tsx/esbuild runner failed before running tests;
no macOS security bypass was used. Linux CI must independently exercise the usual
runner and the new code before this checkpoint is considered validated remotely.

PR #451 now documents two complementary deferred pilots: established-LGA depth
and genuine just-in-time new-LGA activation. The latter must prove the activation
process, including maturity/coverage honesty, provenance, freshness, deduplication,
notification and regeneration; a manually completed planning answer is not proof.
Neither pilot's private survey, DWG, imagery or design files are needed for this
persistence work. The mobile documentation branch remains untouched.

## Trusted-generation source audit

Read-only inspection of the current PR base identified an existing provenance
projection gap, not evidence that cloud records are present or current:

- `Instrument.sourceUrl` and `Clause.retrievedAt`, content hash, version and
  effective dates exist in the Prisma model. `lookupLepInstruments` selects only
  clause ID/reference/title/text, and `getLepContextForProject` trims excerpts to
  400 characters. That output cannot establish retrieval time or full provenance.
- The saved Quick Site Check's "Cited" label means DB-backed zone/controls were
  available; it is not a verified spatial match or a currency guarantee.
- `DCPClause` and saved DPP citations do not hold official URL/retrieval-time
  fields. `PathwayEvidenceSnapshot` can hold those fields and bind a source to an
  assessment, but its actual project binding, content, currency and non-synthetic
  status must be checked. No cloud data was queried during this audit.
- The existing memo generator already calls the canonical section compiler.
  Reuse the compiler deliberately with real source bindings and its issue list;
  copying the memo or changing its product label does not prove a paid SEE.

Next generation work should query exact saved evidence/version bindings rather
than using shortened search output, latest unrelated clauses, generic council
homepages or generation timestamps as source provenance. Missing surveys may stay
qualified; identity and source failures must not become invented confirmations.

Robbie reports PR #451 now includes a third deferred pilot for deliberate Ballina
council/source/Research Viewer replication, following Byron/Kempsey Research Viewer
accuracy acceptance. This is distinct from the established-LGA depth pilot and
automatic unsupported-LGA activation pilot. Do not build any of these during the
current document gate or access/publish their private files. The mobile branch is
untouched.

## Approved correction and publication checkpoint

Robbie approved the typing corrections and continuation. The current saved-version
implementation passes local full TypeScript, focused lint and 70 focused Node tests
(59 document contracts and 11 build-safety tests). Synthetic data only; no live
credentials or database calls. Linux run 36536822465 now confirms 85 focused tests and the full credential-free
Next build for this revision; the unchanged database smoke remains failed.

The exact PR branch remains deployment-disabled in vercel.json. Read-only Vercel
inventory showed no deployment for this branch; unrelated mobile documentation
Preview failures were left untouched. The publication changes no Production ref,
settings, checkout flag or database. No merge, manual deployment, migration or
stateful acceptance is authorised by this checkpoint. The earlier correction
approval blocker is resolved; trusted generation and hosted acceptance remain open.
