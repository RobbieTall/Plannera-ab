# Architecture replay task — private-evidence OCR and visual-review lifecycle

Status: **REDESIGN REQUIRED / DO NOT REPLAY PR #438'S WORKSPACEUPLOAD IMPLEMENTATION**

Historical source: PR #438 / Issue #437.

## Decision

Keep the OCR **state-machine concepts**, but do not attach them to the legacy generic `WorkspaceUpload` path.

The current #452 handover records that the generic legacy workspace uploader requests public Blob access and must not be treated as proof of private working-SEE evidence storage. Private planning documents must use the protected private-evidence path.

Therefore PR #438's direct `WorkspaceUploadOcrAttempt -> WorkspaceUpload -> normal indexing` implementation is architecturally superseded.

## What to retain from #438

The following design ideas remain strong:

- OCR is extraction assistance, not evidence acceptance;
- append-only attempt numbers;
- exact source SHA-256 binding;
- one active attempt reused;
- explicit retry after terminal failure/rejection;
- lifecycle:
  - QUEUED
  - PROCESSING
  - REVIEW_REQUIRED
  - FAILED
  - REJECTED
  - PROMOTED
- page-numbered normalized OCR segments;
- deterministic OCR result hash;
- safe provider/error codes;
- no planning retrieval before human/visual review;
- changed-source-hash denial;
- atomic promotion;
- indexing failure remains distinct from OCR/review success;
- no customer-facing “Run OCR” until provider/privacy/cost controls exist.

## New architecture

Design OCR as an extension of the current private evidence identity:

`evidenceRef + sourceContentHash`

not as a relation to `WorkspaceUpload`.

Expected sequence:

1. authenticated private evidence intake;
2. private quarantine;
3. malware scan CLEAN;
4. OCR queue may be created for eligible image/scanned evidence;
5. provider processing returns page-numbered text;
6. result becomes REVIEW_REQUIRED;
7. operator/visual review compares OCR against the actual private source;
8. approved OCR creates a reviewed derived extraction bound to the same `evidenceRef + contentHash`;
9. applicability/conflict review remains a separate planning gate;
10. only reviewed + applicable derived text can enter planning retrieval/regeneration.

A malware-pending or malware-failed object must never be sent to an OCR provider unless the separately approved security architecture explicitly allows it.

## Persistence design

Inspect the current private-evidence schema first.

Because the protected pipeline currently uses opaque `evidenceRef` + content hash across scan/review/promotion records, prefer a dedicated append-only OCR attempt model such as a private-evidence OCR attempt keyed by:
- evidenceRef;
- source content hash;
- attempt number;
- provider key;
- state;
- result hash;
- page-count/segment metadata;
- safe failure code;
- queue/start/complete/review/promotion timestamps;
- immutable reviewer/reference metadata where appropriate.

Do not create a foreign key to `WorkspaceUpload` merely for convenience.

Do not store raw OCR text in general request logs or privacy-minimal API summaries.

## Review and promotion

Provider success must stop at `REVIEW_REQUIRED`.

Before promotion:
- source hash still matches;
- page segments normalize deterministically;
- stored text/segments/result hash reconcile;
- reviewer is authorised;
- visual review is explicit;
- rejected OCR leaves original evidence unchanged;
- concurrent promotion is idempotent/fail-closed.

Promotion should create a **derived extraction record or accepted evidence representation** suited to the current private evidence/progressive evidence architecture.

Do not silently mutate a public/generic upload into planning evidence.

## Planning use

After OCR review:
- readability may improve;
- applicability remains separate;
- page-level citations must preserve page numbers;
- conflicts with existing evidence must be surfaced;
- final/submission-ready state remains governed by current SEE evidence gates.

OCR must never turn an unverified plan/report into authoritative planning truth.

## Provider boundary

Do not connect a live provider until there is an explicit provider decision covering:
- data processing/privacy terms;
- Australian/customer-data handling expectations;
- retention/deletion;
- cost/rate limits;
- retry limits;
- supported MIME/page limits;
- observability with redaction;
- provider failure handling.

No customer-facing OCR button before this approval.

## Tests

At minimum:
- cannot queue before private evidence + immutable source hash exist;
- cannot queue before malware clean;
- active attempt replay;
- explicit retry after terminal state;
- provider identity mismatch;
- source hash changed;
- duplicate/invalid page numbers;
- deterministic result hash;
- provider failure with safe code only;
- review-required does not enter planning retrieval;
- reject leaves source unpromoted;
- approve verifies stored text/segments/hash;
- concurrent promotion safe;
- applicability remains unresolved after OCR promotion unless separately reviewed;
- no fixed private evidence package role-set mutation;
- privacy-minimal summaries omit OCR text, evidenceRef where required, source content and storage URL;
- Production/default-off boundary preserved.

## Migration from historical #438

Do not cherry-pick:
- `WorkspaceUploadOcrAttempt` schema relation to `WorkspaceUpload`;
- generic upload handler changes;
- generic Sources-panel OCR state as proof of private evidence.

Reuse only provider-neutral algorithms/state semantics that remain appropriate after current-architecture review.

## Output

Produce:
1. architecture/root-cause summary;
2. proposed data model;
3. security/provider boundary;
4. exact files/tests for first implementation slice;
5. any separate approval needed before live provider integration.
