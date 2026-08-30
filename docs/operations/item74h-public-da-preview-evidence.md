# Item 74H public Byron DA Preview evidence

Status: APPROVED FOR PROTECTED PREVIEW / CLEAN REVIEW COMPLETE / MORE_EVIDENCE_REQUIRED

Last updated: 2026-08-30

## Purpose

This runbook records the first real public-document evidence slice for Item 74H.
It does not authorize Production mutation, Production checkout, or reliance on
unreviewed document contents.

## Approved public case

The protected example is Byron Shire Council development application
`10.2025.535.1` for 870 Wilsons Creek Road, Wilsons Creek, Lot 11 DP 1225487.
The official tracker records an approved proposal that includes a new farm shed.

| Evidence candidate | Council record |
| --- | --- |
| Council road evidence candidate | `E2025/131541` |
| Detail survey candidate | `E2025/131546` |
| Stamped proposed shed plans | `E2026/59935` |
| Approval cross-check | `E2026/60560` |

A filename or tracker description is not proof that a document satisfies a
strict evidence role. The CLEAN pages were reviewed at exact page references
before the deterministic outcome below was recorded.

## Reviewed facts

The protected review confirms:

- the exact address, lot and deposited plan;
- approval of a new farm machinery shed;
- a 20 metre by 10 metre footprint, or 200 square metres, on stamped-plan page 9;
- an elevation supporting an approximately 6 metre overall height on page 9;
- a stated lot area of 39.47 hectares on detail-survey page 1; and
- Byron Shire Council as road authority for the section 138 works on approval page 2.

The public case is separate from the earlier hypothetical 80 square metre,
3.5 metre high shed example and must never inherit facts from that example.

## Evidence still required

The reviewed set does not establish:

- a registered cadastral survey: the detail survey says boundaries were compiled
  from DCDB, says it is not a Survey under the Surveying Act 2002, and does not
  identify a registered surveyor;
- an explicit strict-contract road classification;
- an exact promoted shed-height measurement; or
- unambiguous road, side and rear shed setbacks.

Plannera must not infer or invent these values.

## Deterministic commercial outcome

The required decision is `MORE_EVIDENCE_REQUIRED`.

- The free Pathway Check may show the confirmed facts and the exact missing
  evidence request.
- The A$49 Planning Controls Pack is not eligible.
- The A$749 submission SEE is not eligible.
- No evidence is promoted and no paid artefact binding is created by this gate.

This result is commercially useful: Plannera can use public planning documents
quickly while preventing a plausible-looking summary from becoming unsupported
paid advice.

## Protected execution

Run `npm run accept:item74h-public-da-preview` only when all of these are true:

- `VERCEL_ENV=preview`.
- `VERCEL_GIT_COMMIT_REF=integration/item74h-public-da-20260830`.
- `ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED=true`.
- The dedicated private Preview Blob credentials are available.
- Both paid checkout flags are absent or false.

The chain must:

- fetch only the exact official Byron records;
- quarantine and scan bounded PDFs without logging download capabilities;
- retain only the four approved private review PNGs;
- delete transient Blob objects, sandboxes and snapshots with zero residue;
- assert the reviewed `MORE_EVIDENCE_REQUIRED` outcome;
- keep both paid products blocked; and
- perform no Production or persistence mutation.

Two superseded orphaned Vercel Sandbox snapshots were deleted during the
2026-08-30 cleanup. The four CLEAN private review PNGs are intentionally retained
for protected operator evidence review; source PDFs and transient execution
resources are not retained.

Production checkout remains disabled.


## Durable Preview acceptance

The protected chain finishes with
`scripts/item74h-public-da-persistence-preview.ts`. It:

- resolves the exact public address through protected geocoding;
- requires one official NSW Byron LEP 2014 RU2 zoning polygon;
- reads the current Byron LEP, DCP and Codes SEPP evidence from the isolated
  Preview database;
- persists one versioned `MORE_EVIDENCE_REQUIRED` assessment with spatial,
  instrument, control, gate and reviewed-public-document snapshots;
- replays the same idempotency key and requires the same assessment;
- reloads the assessment through the customer-result renderer;
- requires the free Pathway Check and its missing-evidence checklist;
- requires both the A$49 and A$749 artefact bindings to fail closed;
- verifies that protected address, coordinates, parcel identifiers and evidence
  digests are absent from the customer response; and
- deletes all acceptance users, properties, projects, sites, artefacts,
  bindings, assessments, definitions and spatial rows, then proves zero
  residual rows.

A failed address, zone, source-currentness, persistence, replay, customer
rendering, paid-boundary or cleanup assertion fails the hosted deployment.
