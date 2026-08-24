# Item 74H private evidence upload boundary

## Purpose

Surveys, site plans and proposed layouts contain private property information.
They must not use the existing general workspace upload path, which currently
supports guest behaviour and writes public Vercel Blob objects.

This contract defines the minimum boundary for a future protected Item 74H
upload. It does not create a Blob store, change an environment variable, upload
a file or enable checkout.

## Current repository state

The repository lockfile currently resolves @vercel/blob 2.0.0. The current
storage adapter calls put with access public and returns the direct Blob URL.

Vercel Private Blob requires @vercel/blob 2.3 or newer and a private store:

https://vercel.com/docs/vercel-blob/private-storage

Until those facts change and pass acceptance, the Item 74H private-upload
feature must remain disabled.

## Upload authorization

A private evidence upload may be authorized only when:

- execution is in protected Preview;
- the feature is explicitly enabled for that protected environment;
- authentication is enabled;
- the signed-in user owns the project;
- the storage mode is private;
- the Blob SDK is version 2.3 or newer;
- the configured host is a private Blob host;
- the object reference is opaque and contains no filename or site detail;
- any delegated upload access expires within ten minutes;
- the role, MIME type, file size and SHA-256 content hash are valid.

The policy never accepts or returns an address, filename, direct object URL,
coordinate, parcel identifier or geometry.

## Quarantine and review

A successfully authorized upload is not planning evidence yet.

It remains quarantined until:

- the security scan reports CLEAN;
- evidence review reports EVIDENCE_VERIFIED.

Pending, unavailable or failed scanning cannot support a planning claim.
Parser success does not replace security scanning or evidence review.

Even an accepted private upload does not independently unlock the A$49 Planning
Controls Pack or A$749 submission SEE. It must still enter the reviewed
real-site evidence package, site-evidence manifest and persisted exact
commercial scope.

## Required implementation sequence

1. Obtain explicit approval to create or connect a private Vercel Blob store.
2. Upgrade @vercel/blob and regenerate the lockfile.
3. Add a dedicated authenticated Item 74H upload endpoint.
4. Verify project ownership before issuing any upload authorization.
5. Store only opaque object references in user-visible responses.
6. Add authenticated retrieval through a server function or short-lived signed access.
7. Integrate security scanning and quarantine.
8. Bind the clean reviewed content hash into the Item 74H evidence digest.
9. Run one synthetic upload/read/delete acceptance in protected Preview.
10. Remove temporary activation inputs and confirm no residual object or database row.

Creating the private store or changing protected environment variables is an
external configuration action and requires explicit approval. Production
checkout remains disabled throughout.
