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

## Actionable missing-evidence contract

`src/lib/pathway-evidence-checklist.ts` is the deterministic customer checklist
engine. It does not query a database, call an LLM, inspect uploads or infer a
favourable outcome.

For `MORE_EVIDENCE_REQUIRED` it can request only evidence justified by the
persisted customer projection:

- authoritative TfNSW or council road-classification and legal-frontage evidence
  when the bound road category is `UNRESOLVED`;
- a current cadastral survey and proposed shed layout when dimensions remain
  `USER_ATTESTED`;
- refreshed authoritative sources or typed controls when persisted evidence is
  not current; and
- one evidence request for each persisted blocking gate, preserving its exact
  question, reasoning and order.

A current `PROCEED` decision produces no missing-evidence requests. The helper
accepts no address, coordinate, parcel, digest, upload or reviewer field, and
its focused regression proves that unsupported protected fields cannot be
projected into the checklist.

The redacted customer adapter derives `evidenceChecklist` only after the
allow-listed proposal, public sources, typed controls and gate snapshots have
been projected. The existing authenticated Preview route therefore returns the
checklist without selecting any additional database field.

`PathwayEvidenceChecklistPanel` is the dedicated accessible renderer. It shows
the exact evidence type, blocking gate, persisted reason and requested material,
states that it does not predict approval, and keeps the A$49/A$749 lock visible.
It renders nothing when no evidence request exists. The remaining modal edit is
limited to importing this accepted panel and passing
`pathwayResult.evidenceChecklist`; until that exact head is green, the existing
customer gate list remains authoritative.

## Commercial safety

`productionCheckoutEnabled` is a literal false in every customer response.
Production checkout remains disabled. This slice performs no Production
schema, data, environment, payment or checkout mutation.

## Hosted acceptance

The protected `accept:pathway-persistence-preview` scenario projects every
reloaded synthetic assessment through the same customer adapter before
cleanup. Each run must prove:

- the customer result renders from the reloaded record;
- the persisted `MORE_EVIDENCE_REQUIRED` gate remains ordered and intact;
- the customer result contains only checklist actions derived from the redacted
  projection;
- both paid products remain blocked;
- all privacy flags remain false for protected values; and
- cleanup still returns zero residual rows.

This connects the renderer to durable Prisma persistence rather than relying
only on an in-memory fixture.

The `Pathway Customer Result Contract` workflow also runs the focused engine
and panel regressions. It requires deterministic ordering, no checklist for
`PROCEED`, preservation of every blocking gate, explicit road/survey actions
for the worked attestation, stale-source refresh, no protected-site projection,
an accessible customer heading and an explicit paid-output lock.

## Bound user proposal

When a persisted proposal attestation is joined to the same assessment through
`PathwayAssessmentProposalAttestation`, the endpoint may render the exact
allowed proposal fields as `USER_ATTESTED`.

The joined row must remain `MORE_EVIDENCE_REQUIRED` with
`paidArtefactsEligible=false`. The adapter rejects the entire proposal summary
if any extra field is present, if a numeric value is invalid, or if the purpose
or unresolved road category differs from the accepted contract.

No binding hash, input hash, address, reviewer detail or upload metadata is
returned. User estimates guide the free pathway only and cannot unlock either
paid product.

## Hosted bound-proposal acceptance

The always-on protected Preview scenario also persists the worked shed
attestation, binds it to the unresolved assessment twice and requires the
second binding to replay. The reloaded customer result must show the attested
figures, retain `MORE_EVIDENCE_REQUIRED`, and keep both paid products false.

Cleanup reconciliation includes both
`PathwayProposalAttestation` and
`PathwayAssessmentProposalAttestation`. A successful deployment must leave
zero rows across the complete synthetic scope.
