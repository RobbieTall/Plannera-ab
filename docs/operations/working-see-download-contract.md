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

Trusted saved-source candidate assembly, append-only private snapshot writes,
metadata pointer creation and customer generation/version UI are still required.
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
