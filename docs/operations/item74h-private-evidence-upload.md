# Item 74H private evidence upload boundary

## Purpose

Surveys, site plans and proposed layouts contain private property information.
They must not use the existing general workspace upload path, which currently
supports guest behaviour and writes public Vercel Blob objects.

This boundary now has two repository contracts:

- a strict storage, authentication, scanning and review policy; and
- a server-side quarantine coordinator that applies that policy before storage,
  computes the content hash from the received bytes, and queues security
  scanning after a private write.

It does not create a Blob store, change an environment variable, expose an
upload route, upload a file or enable checkout.

## Current repository state

The repository lockfile currently resolves `@vercel/blob` 2.0.0. The current
general storage adapter calls `put` with public access and returns the direct
Blob URL.

Vercel supports private Blob storage, authenticated server reads and
short-lived signed URLs. The Item 74H policy requires `@vercel/blob` 2.3 or
newer and a private store:

https://vercel.com/docs/vercel-blob/private-storage

https://vercel.com/docs/vercel-blob/vercel-signed-urls

Until those facts change and pass acceptance, the Item 74H private-upload
feature remains disabled.

## Implemented quarantine coordinator

`src/lib/pathway-private-evidence-intake.ts` is an internal server contract,
not a public endpoint. It:

- rejects Production, disabled, unauthenticated and cross-project requests
  before any storage call;
- accepts no filename, address, URL, coordinate, parcel or free-text metadata;
- computes SHA-256 from the bytes on the server;
- generates an opaque object reference;
- authorizes only the three controlled evidence roles;
- requires the private host, private access, supported SDK and short access TTL;
- calls an injected private quarantine adapter only after preflight passes;
- rechecks the adapter result and deletes an object returned with unsafe
  storage facts;
- queues a security scan after the private write;
- deletes the quarantined object when scan enqueueing fails;
- returns a privacy-minimal `QUARANTINED` or `DENIED` result with no object
  reference, owner reference, host, URL or raw site detail; and
- keeps A$49, A$749 and Production checkout eligibility false.

A successful intake is only `QUARANTINED`. It is not accepted planning
evidence.

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

- the security scan reports `CLEAN`;
- evidence review reports `EVIDENCE_VERIFIED`;
- the operator records the correct evidence role and page or sheet references;
- measured facts are bound to the accepted content hash; and
- the reviewed package passes the real-site evidence and commercial bridge
  contracts.

Pending, unavailable or failed scanning cannot support a planning claim.
Parser success does not replace security scanning or evidence review.

Even an accepted private upload does not independently unlock the A$49 Planning
Controls Pack or A$749 submission SEE. It must still enter the reviewed
real-site evidence package, site-evidence manifest and persisted exact
commercial scope.

## Required activation sequence

1. Obtain explicit approval to create or connect a private Vercel Blob store.
2. Upgrade `@vercel/blob` and regenerate the lockfile.
3. Implement the quarantine adapter behind the internal coordinator.
4. Add a dedicated authenticated Item 74H upload endpoint.
5. Verify project ownership before issuing any upload authorization.
6. Persist only opaque object references and quarantine state.
7. Add authenticated retrieval through a server function or short-lived signed access.
8. Integrate a real security scanner and operator review queue.
9. Bind only clean, reviewed content hashes into the Item 74H evidence digest.
10. Run one synthetic upload/read/delete acceptance in protected Preview.
11. Remove temporary activation inputs and confirm no residual object or database row.

Creating the private store, upgrading the storage dependency or changing
protected environment variables is a separate external/configuration action.
Production checkout remains disabled throughout.
