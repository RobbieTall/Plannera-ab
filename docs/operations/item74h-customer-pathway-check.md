# Item 74H customer-visible Pathway Check

## Purpose

Expose the durable Item 74H pathway assessment in the existing Quick Site
Check modal without returning protected site identifiers or weakening paid
eligibility.

## Runtime boundary

The read endpoint is:

`GET /api/projects/:projectId/pathway-check`

It is fail-closed:

- outside Vercel Preview it returns `PREVIEW_ONLY` before querying Item 74H
  tables;
- in Preview it requires the same project access rules as project artefacts;
- no assessment returns `MORE_EVIDENCE_REQUIRED`, not an inferred result;
- it performs no writes;
- it never activates checkout.

## Data minimisation

The database query selects only:

- decision, trust and currentness;
- pathway definition version;
- public authoritative source metadata;
- rendered controls; and
- ordered gate questions, outcomes and reasoning.

It does not select or return:

- raw or fingerprinted addresses;
- coordinates or parcel identifiers;
- spatial payloads or geometry;
- evidence or scope digests;
- upload records; or
- private reviewer data.

The modal renders the persisted decision graph when available and continues to
show the existing LEP summary. If no persisted assessment exists, the user is
told that versioned LEP, DCP and spatial evidence is still being assembled.
The A$49 and A$749 states are derived from the persisted exact commercial
binding and are always false when evidence is stale, absent or unresolved.

## Commercial safety

`productionCheckoutEnabled` is a literal false in every customer response.
Production checkout remains disabled. This slice performs no Production
schema, data, environment, payment or checkout mutation.
