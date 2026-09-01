# Item 74H public Byron DA Preview evidence

Status: PROTECTED PREVIEW EVIDENCE ACCEPTED / PROGRESSIVE WORKING-OUTPUT BRIDGE / FINAL OUTPUTS BLOCKED

Last updated: 2026-08-31

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
| Site plan and biodiversity mapping candidate | `E2025/131544` |
| Town planning report candidate | `E2025/131545` |
| Detail survey candidate | `E2025/131546` |
| Stamped proposed shed plans | `E2026/59935` |
| Approval cross-check | `E2026/60560` |

A filename or tracker description is not proof that a document satisfies a
strict evidence role. The CLEAN pages were reviewed at exact page references
before the deterministic outcome below was recorded. Records `E2025/131544` and
`E2025/131545` are newly approved discovery candidates only; until freshly
quarantined, scanned and reviewed, they add no confirmed fact and remove no
commercial blocker.

## Reviewed facts

The protected review confirms:

- the exact address, lot and deposited plan;
- approval of a new farm machinery shed;
- a 20 metre by 10 metre footprint, or 200 square metres, on stamped-plan page 9;
- an exact overall shed height of 5.996 metres on stamped-plan page 9,
  comprising a 3.925 metre wall height and 2.071 metre roof rise;
- a stated lot area of 39.47 hectares on detail-survey page 1;
- Byron Shire Council as road authority for the section 138 works on approval
  page 2; and
- Wilsons Creek Road as `OTHER_ROAD` for the deterministic DCP gate, based on
  the complete TfNSW classified/regional road schedule, the current State and
  Regional road categorisation dataset, and Council's section 138 evidence; and
- an indicative 11.693 metre shed-to-fence distance on stamped-plan page 1.
  The same page labels the site boundary as approximate and does not identify
  that dimension as the road, side or rear setback.

The public case is separate from the earlier hypothetical 80 square metre,
3.5 metre high shed example and must never inherit facts from that example.

## Road classification evidence

The TfNSW complete Schedule of Classified Roads and Unclassified Regional Roads
states that it contains all classified roads and unclassified Regional Roads.
Wilson Creek Road is absent from that complete schedule. The current NSW Road
Network Categorisation dataset covers State and Regional roads, and the road is
not represented there as either category. Byron Shire Council's section 138
record independently confirms Council road authority for the works.

Together, these current public sources support the deterministic
`OTHER_ROAD` classification. This is an evidence conclusion, not a guessed
label. It was checked on 30 August 2026 and must be revalidated when either TfNSW
source changes:

- https://www.transport.nsw.gov.au/system/files/media/documents/2023/classified-roads-schedule-1.pdf
- https://experience.arcgis.com/experience/c33e55c80a214cbf8dbb05db22f0fbb4

## Evidence still required

The reviewed set does not establish:

- a registered cadastral survey: the detail survey says boundaries were compiled
  from DCDB, says it is not a Survey under the Surveying Act 2002, does not
  identify a registered surveyor, and stamped-plan page 1 labels the site
  boundary as approximate; or
- unambiguous road, side and rear shed setbacks. The reviewed 11.693 metre
  shed-to-fence dimension cannot be assigned to any of those three legal
  setback categories from the page itself.

Plannera must not infer or invent these values.

## Deterministic commercial outcome

The required decision is `MORE_EVIDENCE_REQUIRED`.

- The free Pathway Check may show the confirmed facts and the exact missing
  evidence request.
- The A$49 Planning Controls Pack may be created only as a clearly labelled working pack with the exact outstanding-evidence schedule.
- The A$749 SEE may be created only as a clearly labelled working SEE with `submissionReady: false`.
- Final A$49 and A$749 artefact bindings remain ineligible until exact legal setback, registered-plan and lot-area evidence satisfies the existing strict policy.
- Production checkout remains disabled. The working stages describe product readiness; they do not activate payment or make a submission-ready claim.

This result is commercially useful: Plannera can use public planning documents
quickly while preventing a plausible-looking summary from becoming unsupported
paid advice.

## Protected execution

Run `npm run accept:item74h-public-da-preview` only when all of these are true:

- `VERCEL_ENV=preview`.
- `VERCEL_GIT_COMMIT_REF` is exactly
  `integration/item74h-public-da-20260830`,
  `agent/item74h-evidence-refinement-20260830`,
  `agent/item74h-layout-evidence-20260831`, or
  `agent/item74h-setback-evidence-20260831`; wildcard and prefix matching
  remain prohibited.
- `ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED=true`.
- The dedicated private Preview Blob credentials are available.
- Both paid checkout flags are absent or false.

For PR #360, Vercel created the isolated Neon branch
`preview/agent/item74h-evidence-refinement-20260830` with endpoint
`ep-rapid-shape-a72cicyh`. For PR #361, Vercel created the isolated Neon
branch `preview/agent/item74h-layout-evidence-20260831` with endpoint
`ep-late-sun-a7r48wn4`. These branch and endpoint identifiers are exact
allowlist entries. Each branch must remain Preview-only, receive synthetic
acceptance writes only, and may be deleted after its merged-head acceptance and
zero-residue result are recorded. Neither may be reused as a Production
database. The PR #361 branch and its branch-scoped Vercel acceptance flag were
deleted after merged-head verification; Production was not changed.

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

## Layout evidence refinement - 31 August 2026

Protected review of stamped-plan page 1 records
`INDICATIVE_SHED_TO_FENCE_DISTANCE_M=11.693` with Council record
`E2026/59935` and page reference `page-1`. The qualifier is structural:
the depicted site boundary is approximate and the dimension is not classified
as a road, side or rear setback.

This refinement must leave the missing-evidence count at four, preserve
`MORE_EVIDENCE_REQUIRED`, and keep both paid products ineligible. It may not
promote the indicative dimension into a legal setback.

## Setback evidence discovery - 31 August 2026

The next protected slice adds exact Council records `E2025/131544` and
`E2025/131545` to the bounded six-document quarantine. It may emit page-scoped
candidate text for operator selection only after a fresh clean scan. It must not
retain new review images, confirm a setback, alter the reviewed outcome, persist
an assessment, bind a paid artefact, or enable checkout.

The existing 40 MB total limit, exact official-host and filename checks, private
Blob authentication, deny-all review sandbox, hash checks and zero-residue
cleanup remain mandatory. Candidate discovery is successful even if neither
document supplies authoritative road, side or rear setback evidence.

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

## Verified run - 30 August 2026

Protected Vercel Preview deployment `dpl_42piMP3R37ZdKh4M7PCNVVk7UkLk`
reached `READY` from commit
`731352320a3129c054c37e81736b93594d1171aa`.

The exact-head run proved:

- the public address resolved to Byron LEP 2014 zone RU2 through the official
  NSW zoning service;
- one `MORE_EVIDENCE_REQUIRED` assessment was created and replay returned the
  same assessment;
- reload preserved five evidence snapshots, 17 control snapshots, six gate
  snapshots and authoritative spatial provenance;
- the free Pathway Check and missing-evidence checklist rendered from the
  persisted assessment;
- an unsafe `PROCEED` attempt wrote no assessment;
- both the A$49 Planning Controls Pack and A$749 Submission SEE bindings were
  blocked;
- customer output retained no raw address, coordinates, parcel identifier or
  direct-download token; and
- synthetic cleanup completed with zero residual rows.

The run performed no Production mutation. Production checkout remained
disabled.

## Verified layout evidence run - 31 August 2026

Protected Vercel Preview deployment
`dpl_AqVY7BEFMByDm7EzvpyMnbQCzVQw` reached `READY` from commit
`77b92276130b2bbc131dfc9e19c7b6ec3cd14728`.

The exact-head run proved:

- the Byron and Kempsey launch and whole-LGA gates passed before evidence work;
- all four official Council documents were freshly quarantined and scanned
  `CLEAN`, with exact hashes preserved and zero transient resource residue;
- the protected review retained only the four approved review pages;
- reviewed outcome `item74h-public-da-reviewed-outcome.v3` recorded seven
  confirmed facts, including the qualified 11.693 metre shed-to-fence distance;
- the decision remained `MORE_EVIDENCE_REQUIRED` with exactly
  `REGISTERED_CADASTRAL_SURVEY`, `ROAD_SETBACK_M`, `SIDE_SETBACK_M` and
  `REAR_SETBACK_M` unresolved;
- one site-confirmed Byron RU2 assessment was created and replay returned the
  same assessment with five evidence, 17 control and six gate snapshots;
- authoritative spatial provenance and the free Pathway Check survived reload;
- unsafe `PROCEED` wrote no assessment, both paid products remained blocked,
  and no paid artefact binding was created;
- customer output retained no raw address, coordinates, parcel identifier or
  direct-download capability; and
- synthetic cleanup finished with zero residual rows.

The run performed no Production mutation. Production checkout remained
disabled.


## Scanner snapshot lifecycle hardening - 31 August 2026

The scanner preparation sandbox is deliberately non-persistent. After ClamAV and
Poppler are installed and malware definitions are refreshed, the acceptance
calls the supported `sandbox.snapshot()` operation explicitly and records the
returned snapshot ID before creating the deny-all scanner.

This removes the automatic-stop race exposed by the first protected
six-document discovery run:

- a failure before explicit snapshot creation cannot create an automatic orphan;
- snapshot creation terminates the preparation session and returns the cleanup
  handle directly;
- every later success or failure deletes that exact snapshot; and
- the existing zero-residue gate still fails closed if Blob, Sandbox or snapshot
  cleanup cannot be proved.

The orphaned Preview snapshots from the failed automatic-stop attempt and the
initial explicit-return property mismatch were deleted. No Production resource,
checkout setting, retained review page or customer document was changed.


## Six-document protected discovery acceptance - 31 August 2026

Exact-head Preview commit `c7e51315fc5a4f68d326857a4706b1fa165208ad`
completed successfully on Vercel. The protected run proved:

- all six exact Byron Council documents scanned CLEAN with hashes stable before
  and after scanning;
- the scanner ran deny-all after definitions were refreshed;
- the explicit scanner snapshot, both sandboxes and all transient Blob objects
  were removed with zero residual resources;
- four previously approved private review pages remained the only retained
  review images;
- no evidence was automatically promoted and no paid artefact binding was
  created;
- both the A$49 Planning Controls Pack and A$749 Submission SEE remained
  blocked; and
- Production mutation was false and Production checkout remained disabled.

The additional site plan exposed only the address in extractable text. The town
planning report states that the proposed farm shed is east of the dwelling and
that the proposed dwelling is over 300 metres from Wilsons Creek Road and over
20 metres from the nearest adjoining property. Those are useful planning
context, but they are not shed-to-boundary measurements and must not be reused
as road, side or rear shed setbacks.

The reviewed outcome therefore correctly remains `MORE_EVIDENCE_REQUIRED`
with `REGISTERED_CADASTRAL_SURVEY`, `ROAD_SETBACK_M`, `SIDE_SETBACK_M` and
`REAR_SETBACK_M` unresolved.


## Authoritative cadastral provenance refinement

Status: PROTECTED PREVIEW IMPLEMENTATION / NOT PRODUCTION-RELEASED

The next protected acceptance binds the reviewed public case to the NSW
Spatial Services current Lot layer for Lot 11 DP 1225487. The acceptance:

- independently retrieves and validates the exact current parcel feature;
- stores the source URL, retrieval time, area and cryptographic hashes;
- does not retain raw parcel geometry, coordinates or parcel identifiers in
  the customer result or redacted evidence snapshot;
- preserves the NSW cadastral plan area of 38.8312589 hectares;
- preserves the Council-hosted detail-survey area of 39.47 hectares;
- raises `LOT_AREA_RECONCILIATION` because the two areas differ;
- requires the registered plan before either area can be treated as
  submission-grade;
- keeps the A$49 Planning Controls Pack and A$749 SEE blocked; and
- remains Preview-only with Production checkout disabled.

The NSW current digital cadastral feature is authoritative spatial evidence,
but it is not a substitute for a registered plan image and does not prove
proposal setbacks. A human operator must review the registered plan and
reconcile the parcel area before promoting the evidence or unlocking paid
outputs.

Operators must not accept NSW LRS legal terms for a customer, purchase a plan
without explicit payment approval, expose signed links, or persist raw geometry
to logs or customer-visible payloads.


## Progressive working-output bridge (2026-09-01)

The persistence model now separates the pathway decision from evidence readiness for this proof. The reviewed Byron case is `MERIT_ASSESSMENT` with `MORE_EVIDENCE_REQUIRED`: useful work may begin, but exact unresolved claims remain locked.

Two internal, Preview-only stages carry this state without weakening the final policy:

- `PLANNING_CONTROLS_PACK_WORKING` at A$49 scope.
- `SUBMISSION_SEE_WORKING` at A$749 scope.

Each working artefact must match the same assessment, evidence digest and deterministic scope digest; declare the exact product and price; copy the outstanding-evidence schedule; and persist `submissionReady: false` and `finalSubmissionEligible: false`. Replays must reuse the original binding. Separate probes must continue to prove that the final `PLANNING_CONTROLS_PACK` and `SUBMISSION_SEE` stages are blocked.

This authorizes no Production database, schema, payment, checkout or real-document mutation.
