## Current local checkpoint: ordinary-pack generation connected

The approved label-matcher and QSC interpretation corrections are applied.
The new application changes remain LOCAL and UNPUBLISHED. Draft PR #452's
published application code remains source 3ef7a7d2ee5517ac0de285c878b1172e6828c586;
this checkpoint replaces the status recorded by documentation commit
8ca3aa94a41cffe73028e6fb615e37c53dd970dd. Do not confuse documentation publication
with application publication, Preview deployment, or acceptance.

### Implemented locally

- Normal Byron/Kempsey DCP importers retain actual retrieval time, original PDF
  fingerprint and exact stored clause-text fingerprint. All external I/O in their
  tests is mocked; no real source ingestion has run.
- Retained zoning stores the authoritative lookup code separately from its readable
  label. Formatted labels now pass without allowing conflicting codes.
- Normal DPP creation has a default-off, Preview-only
  PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 hook. It stores a source envelope
  in the same NEW pack payload. Legacy packs are untouched; missing proof remains
  UNAVAILABLE and does not prevent saving a qualified DPP.
- The generation loader now consumes that ordinary-pack envelope after owner,
  exact paid entitlement, memo/QSC/pack and retained spatial checks. It rereads
  current LEP/DCP records and validates original version, URL, text and timestamps.
  It does not create a pretend PathwayAssessment. The existing genuine assessment
  path remains available for packs without an ordinary capture; a present invalid
  capture cannot fall back to another proof path.
- Shared citation checks preserve exact excerpts, official-source requirements,
  trust-marker rejection and retrieval times. Row persistence may follow source
  retrieval; the original capture time bounds row changes, not a fabricated new
  retrieval time. Operational seven-day freshness is not statutory currency.
- The isolated workflow now includes the ordinary-pack capture test suite.

### Evidence and remaining validation failures

The latest network-blocked combined local run PASSED 60/60:
17 spatial retention, 16 planning-source validation, 10 DCP capture,
4 mocked importer integration, and 13 document-generation integration tests.
The five added integration tests include Byron and Kempsey ordinary-capture
DOCX/PDF generation without any PathwayAssessment, paid-scope ordering, changed
source rejection and invalid-capture/no-fallback behaviour. Existing eight
assessment-path integration tests still pass.

Separately, the ordinary-pack capture suite last ran 10/11 PASS, including both
normal createDetailedPlanningPackArtefact capture tests. Its remaining failure is
a newly introduced TEST-ONLY newline before an 'as unknown as' assertion in
src/lib/see-document-pack-source-capture.test.ts:140. Full TypeScript stops on
TS1434 there. A scoped diagnostic check excluding that file found one additional
TEST-ONLY TS2322 in src/lib/see-document-generation.integration.test.ts:195:
the new in-memory project object lacks fields of ProjectWithOptionalSiteContext.
Both narrow test corrections require the requested approval; neither is corrected
yet. They are new-work mistakes, not inherited main failures. No full TypeScript,
new Linux CI, new build or commercial pass is claimed.

These are in-memory records, real application parsers/compiler/rendering, and
mocked database/HTTP adapters. They are NOT proof of real statutory sources,
cloud ingestion, protected Preview customer downloads, native Word/PDF reopening,
or the complete normal DPP -> memo -> generation journey in one external run.
No synthetic records may be promoted as planning evidence.

### Exact next work and handover

Preserve the existing isolated working copy and fourteen changed/new application,
test and workflow files. Correct the two test-only issues after approval, rerun
the complete checks without exclusions, then establish push safety and publish
the validated application patch to PR #452. Do not recreate configuration, ask for
keys, repin acceptance or overwrite concurrent mobile documentation work.

The latest read-only Preview inventory still leaves prerequisites unresolved:
canonical council codes, saved authoritative spatial provenance, retained current
DCP source envelopes, and the working_see enum migration. No evidence backfill
or code inference from council display names is authorized by this checkpoint.
Obtain scoped approval before isolated Preview schema/ingestion/deployment work.
Then prove customer generation, private download, original-version reopening,
wrong-user/wrong-project rejection, warnings, document versions and native
Word/PDF layout for BOTH councils.

The earlier published 142-test Linux checkpoint applies only to source 3ef7a7d.
Its credential-free Next compilation passed, but full vercel-build still failed
at the unchanged synthetic Prisma database smoke. That remains unresolved.
Uploaded plans/reports are explicitly not independently incorporated by this
generation path.

### Safety and commercial decision

Documentation-only publication retains the exact PR branch deployment-disable
rule. Before this update PR #452 remained draft/unmerged at 8ca3aa9; main remained
ff2179e06f68a8f265d7cc0b873cd28320a4da6b. The latest 20-deployment inventory had no
deployment for this branch. Previously audited automatic workflows remain
unchanged; no stateful workflow is dispatched.

No application push, merge, deployment, cloud settings, real ingestion,
database/schema write, payment action or private-document publication occurred.
Production checkout remains disabled; Production data/schema are untouched.
Immutable Item 78C acceptance is unchanged. Research Viewer, Project Controls and
the practitioner/pilot documentation remain compatible and deferred.
Commercial decision: HOLD pending the actual protected customer document journey.
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
