## Current document-generation status: approved corrections applied

This checkpoint supersedes the earlier unpublished TypeScript-failure/approval
blocker. Robbie approved the narrow corrections. The throwing guard now uses a
function declaration so TypeScript narrows rejected records correctly; bound
evidence snapshots are explicitly ordered by immutable ID before source signatures
are calculated. No evidence, ownership or payment checks were weakened.

Validation on this corrected local revision:
- Full TypeScript check: PASS.
- 108 document tests in one combined run: PASS, including 5 direct loader
  authorization-denial tests. The local runner uses pure TypeScript transpilation
  plus Node tests; TypeScript was checked separately.
- 11 build-safety tests and static contract: PASS (7 commands, 6 entries,
  14 transitive sources).
- Focused ESLint: PASS, no warnings.
- These are 119 local tests across the two test commands, not 119 document tests.
  The 15 renderer tests and full Next compilation require the new exact-commit
  Linux run; do not inherit earlier-commit results or claim 134 tests passed yet.

The five loader tests are now included in the isolated CI workflow. They establish
early authorization failures only, not a successful complete database/source join.
The new generation endpoint/UI/source validation is draft code, not hosted
acceptance evidence. Uploaded plans/reports remain explicitly unincorporated and
the generated document remains qualified, not submission-ready.

Publication is limited to draft PR #452's deployment-disabled branch. Main and
mobile documentation branches are unchanged; immutable Item 78C evidence is
preserved. No migration, stateful acceptance, cloud flag, private file or Production
data/schema change was performed. Keep Production checkout disabled.

Next: record the new exact-commit Linux results in PR #452 / Issue #395, then prove
actual saved-source availability and the protected Preview customer journey.
An isolated Preview enum migration and deployment still need their scoped approval.
The earlier full vercel-build synthetic database-smoke failure remains unresolved;
a passing Next compilation alone is not database-readiness evidence.
Commercial decision remains HOLD pending those checks and native Word/PDF review.

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
