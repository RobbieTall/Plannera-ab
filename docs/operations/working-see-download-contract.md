# Working SEE operations: current status at 2026-09-30

This section supersedes status claims in the historical checkpoints below. The
older text is retained as an audit trail, not as current setup instructions.
Commercial decision: **HOLD**. Production activation is not authorised.

## Implemented and proven offline

Application/source commit: `31fc550d6402fb88160aad5b5d570a1740268342`.
[Linux run 36636420187](https://github.com/RobbieTall/Plannera-ab/actions/runs/36636420187)
passed full TypeScript and **201 tests** (140 core, 44 Vitest, 11 safety, 6
offline-guard regressions). Separate credential-free Next compilation passed.
Both real database smoke CLIs correctly rejected missing configuration. This is
not a real-database readiness result or a complete hosted Vercel build.

Council-point lookup is now integrated into normal Preview site provenance and
generation checks; it is no longer local-only. Source capture, saved-record
generation, private immutable versions, authenticated downloads and original-byte
reopening are implemented draft code. Hosted customer acceptance remains unproven.
Static fingerprints do not guarantee all transitive build behaviour.

## Completed isolated database prerequisite

Robbie explicitly approved retirement of the PR #419 and PR #429 Preview
databases, two independent copies of the existing council acceptance parents, and
the document-type addition on those new copies only.

| Council | Rehearsal branch | Neon branch ID | Preserved parent |
|---|---|---|---|
| Byron | `preview/see-doc-byron-20260930` | `br-blue-dawn-a733pff4` | `br-square-king-a7hsosg2` |
| Kempsey | `preview/see-doc-kempsey-20260930` | `br-royal-breeze-a75t8c41` | `br-noisy-leaf-a7o8xtrk` |

Both children were confirmed ready, non-default and non-primary. Schema-only
prechecks identified public.ArtefactType without working_see. The following
statement succeeded on each child, and both postchecks returned true:

```sql
ALTER TYPE "ArtefactType" ADD VALUE IF NOT EXISTS 'working_see';
```

The migration ledger was NOT reconciled. Do not run migration-deploy blindly or
claim this manual approved step proves the complete migration history.

Retired database IDs: `br-wispy-brook-a7nk9hhn` (PR #419) and
`br-dawn-dust-a7kr74rr` (PR #429). Their GitHub code and PRs remain intact;
old Preview deployments using these databases may fail. Acceptance parents and
Production were not written to. No credentials were retrieved or published.

## Remaining protected Preview setup

The exact feature branch `feat/see-document-delivery-20260929` still has automatic
Vercel deployment disabled in vercel.json. Do not remove that safeguard, merge to
main, or assume a new branch inherits it. Publication of documentation is not
deployment approval.

Before a separately scoped rehearsal:
1. Establish two independently identified protected Preview deployment targets.
   Do not repoint the immutable acceptance deployments. Decide target Git refs and
   exact source SHA before configuring secrets or triggering any build.
2. Bind each target's pooled and direct database settings to its own child above.
   Broad inherited database variables are not verified targets. Robbie handles
   secret copy/paste; do not print values, cookies or signed private URLs.
3. Establish private Blob storage and authentication settings for the rehearsal.
   Preserve private access and project/version isolation. Do not expose historical
   acceptance documents, use Production credentials, or activate live checkout.
4. Configure only the identified Preview targets with
   `PLANNERA_WORKING_SEE_SITE_PROVENANCE_ENABLED=1`,
   `PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1`, and
   `PLANNERA_WORKING_SEE_GENERATION_ENABLED=1`.
   These require platform-provided `VERCEL_ENV=preview`; never spoof it in
   Production. Generation uses the same enablement for private persistence.
5. Obtain scoped approval before genuine source refresh/ingestion and deployment.
   Retain actual official retrieval dates, source bodies and hashes. Do not repair
   stale records by changing timestamps, backfill guessed council codes, or turn
   synthetic test inputs into planning evidence.
6. Run unchanged real build/readiness gates against the isolated target. Prove
   owner and paid-scope checks, current authoritative evidence and the complete
   saved site -> QSC/DPP/memo -> working SEE chain for each council.
7. Generate, download and reopen both DOCX and PDF from the actual protected
   customer UI. Confirm original byte hashes/version, wrong-user/wrong-project
   denial, evidence warnings and native Word/PDF presentation.

These deployment connections, flags, source preparation and hosted checks have
NOT been completed by the database-copy step. The current generated sample files
are synthetic and not established as exact-current-source customer evidence.
Uploaded plans/reports remain explicitly not independently incorporated by this
generation path. A working draft is not submission-ready.

## Safety and handover

Production checkout has not been activated. No Production data/schema mutation,
acceptance-parent mutation, cloud setting change, deployment or merge accompanied
the database prerequisite or this status documentation. Future work remains
Research Viewer / Project Controls compatible without implementing those features.
Preserve the concurrent mobile documentation branch and immutable Item 78C evidence.

Continue from Issue #395 and draft PR #452. The next gate is protected Preview
configuration and genuine customer document proof, not another synthetic-only
pass or repeated database setup.

---

# Historical checkpoints (superseded status; retained evidence)

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

# Working SEE download contract

Status: implementation draft; not a deployed customer capability.

See [current delivery handover](../project-memory/see-document-delivery-handover.md)
for the evidence register and exact remaining work.

## Evidence boundary

Item 78C run 36426605240 remains immutable protected non-production acceptance
evidence. Synthetic in-memory rendering and temporary metadata do not prove
customer generation, downloads or reopening. The existing hosted generation
route still produces a pre-SEE planning memo, not this new Word/PDF journey.

## Implemented draft contract

- Server-assembled evidence-bound candidates render into an immutable Word/PDF
  pair. The manifest binds project, site, council, paid scope, DPP, QSC, renderer
  version, timestamp, document reference, warnings and both file hashes.
- GET `/api/projects/[projectId]/working-see/[versionId]/download?format=DOCX|PDF`
  is Preview-only. Production is denied before session/database initialization.
- Real authentication is required; development bypass cannot authorize downloads.
- Each request checks project membership and the exact saved version's matching
  paid submission-SEE purchase, active entitlement and original DPP/QSC records.
  A Planning Controls Pack purchase is not a SEE purchase.
- The private reader runs only after authorization. It accepts a deterministic
  project/version path, not a caller-supplied URL. Private origin JSON reads are
  bounded to 48 MiB, with host, path, content type and stream-size checks.
- Reopening returns original bytes, not a new render. Attachment names include
  project and version; responses are private/no-store, nosniff and noindex.
- Buffered downloads are limited to 4 MiB per file in this implementation.
  Larger-file delivery needs a separate bounded streaming design.
- Snapshot JSON/document bytes belong in private storage. Artefact payloads must
  contain only version pointers because the current artefact list returns payloads.

## Not implemented or proven

Trusted saved-source candidate assembly and customer generation are still required.
Saved-version/download UI is now draft code in the actual Preview workspace. Append-only private writes and metadata pointers now have a draft
implementation; cloud behavior and actual customer delivery remain unproven.
The loader and HTTP tests use synthetic inputs and injected storage/authorization;
they are not evidence of real hosted permissions or successful customer downloads.
No database query, cloud snapshot write or Preview deployment has been performed
for this draft implementation.

Do not fabricate source metadata to satisfy renderer guards. Missing survey
information may remain visibly qualified. Missing authoritative-source or site
identity bindings must not be silently treated as survey gaps. Preserve working/
non-submission-ready warnings and never relabel a free memo as the paid SEE.

## Validation and release

Code commit `0a081d39fd026d2fd7608e8913cc6c666150509d` passed 69 focused
Linux tests, full TypeScript and the complete credential-free Next build in
[run 36533924975](https://github.com/RobbieTall/Plannera-ab/actions/runs/36533924975).
The full `vercel-build` remains failed at its unchanged database smoke with
synthetic configuration. No live credentials were supplied. Representative
synthetic PDF pages were inspected earlier; native Word review of this revision
and the real protected customer journey remain unproven.

The first commit on `feat/see-document-delivery-20260929` disables automatic
Vercel deployment for that branch. Publishing a draft is not permission to merge
or deploy. Keep Production checkout disabled and Production data/schema unchanged.
Commercial status remains HOLD until actual protected Preview delivery and
document review are proven. Research Viewer and Project Controls remain later.

## Private persistence and schema gate

`see-document-private-writer.ts` uses private access, deterministic version keys,
`allowOverwrite: false`, bounded upload time, and verified private readback. It
rejects files larger than the current 4 MiB download limit. Provider errors and
URLs are not exposed. See [Vercel Blob SDK write semantics](https://vercel.com/docs/vercel-blob/using-blob-sdk).

`see-document-persistence.ts` is a trusted server service, not an endpoint accepting
browser-generated snapshots. Only the current project owner may create versions.
Downloads separately recheck owner/collaborator access and exact active entitlement.
Authorization is repeated after upload before a serializable metadata transaction.
Retries cannot overwrite existing pointers or files, including conflicting data.

Migration `20260929070000_add_working_see_artefact_type` adds a distinct
`working_see` kind. It is prepared, not applied. Execute only as a separately
authorised migration against an identified isolated Preview target after inspecting
its current schema; never from a build. No Production migration is authorised.
Both services require Preview plus explicit write enablement. No write endpoint
is wired yet. The enum does not relabel pre-SEE memos as paid documents.

Blob and database commits are not atomic. A failed metadata transaction leaves
an unlisted private object; retry the identical snapshot rather than overwrite or
automatically delete it. Cleanup needs an approved inventory of unreferenced keys.
Unit tests exercise this recovery but do not replace real protected Preview proof.

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
