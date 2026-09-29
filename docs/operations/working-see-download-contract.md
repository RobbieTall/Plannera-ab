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
