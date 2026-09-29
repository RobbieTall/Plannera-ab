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

Trusted saved-source candidate assembly and customer generation/version UI are
still required. Append-only private writes and metadata pointers now have a draft
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

The approved corrections pass 37 local focused Node checks, full TypeScript
checking, pure working-SEE acceptance and static build-contract verification.
Representative pages from both revised synthetic PDFs were inspected. Native
Word review of the new revision and all real customer journey evidence remain
outstanding. The full local build was blocked by tsx/esbuild runtime issues;
the credential-free Linux workflow must provide independent build evidence.

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
