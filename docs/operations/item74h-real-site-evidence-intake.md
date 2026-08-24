# Item 74H protected real-site evidence intake

## Purpose

This contract is the safe boundary between private site documents and the
durable Item 74H commercial scope. It represents only reviewed evidence
metadata and measured facts. It does not store a file, reveal a site, make a
planning decision, or enable checkout.

Production checkout remains disabled.

## Required evidence

A package is evidence-confirmed only when it contains exactly these roles:

- a current road-classification source;
- a current cadastral survey attributed to a registered surveyor;
- a proposed shed layout bound to the survey content hash.

The proposal layout must provide source-bound values for:

- shed footprint in square metres;
- shed height in metres;
- road setback in metres;
- side setback in metres;
- rear setback in metres.

Every document and measurement participates in one SHA-256 site-evidence
digest. Changing an accepted source or measurement changes the digest and
therefore changes the commercial scope.

## Road classification

A classified road requires a positive, current Transport for NSW State or
Regional road match.

An other road requires explicit, current Byron Shire Council confirmation.
Absence from the Transport for NSW dataset is not evidence that a road belongs
to the other-road category.

This preserves the Byron DCP Chapter D2 55 m / 15 m evidence boundary without
inventing road status.

## Manual plan review

A survey or marked-up layout may be image-only. Image-only evidence is not
discarded, but it cannot pass automatically. It must have:

- an opaque reviewer reference;
- a completed evidence-verification status;
- a verification timestamp after retrieval;
- a hash of the review notes;
- a valid currentness boundary.

Parser success is not operator verification. A machine-readable document can
still fail this contract if it has not been reviewed.

## Privacy boundary

The accepted package must not contain an address, filename, storage URL,
coordinates, parcel identifiers, geometry, reviewer identity, or free-text
review notes. Unsupported fields fail closed rather than entering the digest.

Only opaque internal references, hashes, source versions, dates, enumerated
methods, page or sheet tokens, and measured proposal facts are accepted.
Acceptance summaries never return upload or project references.

The existing general workspace upload route is not approved for this protected
flight because it supports guest workspace behaviour and returns a field named
publicUrl. Do not upload the controlled survey or site plan through that route.
A private authenticated storage and access-control acceptance must be completed
separately before Plannera itself receives the real file.

## Commercial boundary

EVIDENCE_CONFIRMED means the package is structurally complete and reviewed. It
does not independently unlock either paid stage.

The A$49 Planning Controls Pack still requires:

- the complete Item 74H site-evidence manifest;
- current authoritative spatial and planning evidence;
- the deterministic Byron rural setback result;
- a persisted exact-scope binding;
- evidence-verified trust.

The A$749 submission SEE additionally requires the submission evidence
manifest, evidence-aware uploads, operator approval, and the accepted rendering
and credit contracts.

Every result from this intake contract reports both paid stages and Production
checkout as disabled.

## Safe operator sequence

1. Receive the survey and proposal plan through an explicitly approved private channel.
2. Verify the survey currency, proposal dimensions, page or sheet references, and road evidence.
3. Record only opaque references and hashes in the protected Preview evidence package.
4. Run the Pathway Real-Site Evidence Contract.
5. Bind the confirmed digest to the existing site-evidence manifest and deterministic setback contract.
6. Persist and replay the exact commercial scope in Preview.
7. Remove temporary protected inputs and confirm zero synthetic residue.

Do not use GitHub workflow inputs, PR comments, Vercel logs, public object URLs,
or repository files to transmit the address, plan, coordinates, parcel details,
or measurements.
