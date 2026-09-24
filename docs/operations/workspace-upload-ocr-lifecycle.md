# Workspace upload OCR retry and review lifecycle

Status: **PROVIDER-NEUTRAL FOUNDATION IMPLEMENTED / LIVE OCR PROVIDER NOT CONNECTED**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #437.

## Purpose

Image uploads and text-empty scanned PDFs already fail closed as `IMAGE_ONLY`.
They do not enter planning retrieval or final SEE evidence.

This slice adds the durable lifecycle needed to process those files later without
turning unreviewed OCR output into accepted evidence.

## Trust boundary

OCR is extraction assistance, not evidence acceptance.

A successful OCR provider result becomes `REVIEW_REQUIRED`, not `READY`.
Until a review is explicitly approved:

- the original `WorkspaceUpload` remains `IMAGE_ONLY`;
- no OCR text is copied into the upload's accepted extraction fields;
- no source chunks are created;
- no semantic indexing occurs;
- no applicability decision is upgraded; and
- no SEE readiness is changed.

Only reviewed OCR output can be promoted into the existing extraction/indexing
pipeline. Existing applicability review remains a separate later gate.

## Durable attempt lifecycle

`WorkspaceUploadOcrAttempt` is append-only by attempt number and bound to the
immutable upload SHA-256 hash.

States:

| State | Meaning |
| --- | --- |
| `QUEUED` | Exact upload bytes are queued for an OCR provider. |
| `PROCESSING` | A named provider adapter has claimed the attempt. |
| `REVIEW_REQUIRED` | OCR pages were returned and integrity-hashed; operator/visual review is still required. |
| `FAILED` | Provider processing failed with a safe error code. |
| `REJECTED` | Review rejected the OCR result; the original remains image-only. |
| `PROMOTED` | Reviewed OCR pages were copied into the normal extraction fields and sent through normal indexing. |

One active attempt is reused. A terminal failed/rejected result requires an
explicit retry and increments the attempt number.

## Integrity

Each attempt records:

- upload ID;
- exact source SHA-256;
- attempt number;
- provider key;
- request hash;
- normalized page-numbered OCR segments;
- deterministic OCR result hash;
- page count;
- safe failure code;
- queue/start/complete/review/promotion timestamps.

Promotion fails if the upload's source hash changed after OCR or if the stored
page segments/text/result hash no longer reconcile.

## Promotion

An approved review:

1. atomically claims the `REVIEW_REQUIRED` attempt;
2. promotes the exact normalized OCR pages into the upload extraction fields;
3. records extraction method `ocr-reviewed-v1` and page/hash metadata;
4. sets readability to `READY`;
5. runs the existing `indexUploadEvidence` path;
6. records indexing `READY` or `FAILED` independently.

A reviewed, readable OCR result with failed indexing is still not available to
the SEE retrieval path.

## Operator visibility

The uploads GET response exposes only a privacy-safe latest-attempt summary:
status, attempt number, provider key, safe error code and timestamps. It does
not expose OCR text.

The existing Sources panel shows the OCR state and explains that queued,
processing, failed, rejected and review-required outputs remain excluded from
planning evidence.

## Current provider boundary

No live OCR provider is connected by this slice. The lifecycle functions accept
an injected provider/worker result for deterministic tests and future workers.

Do not expose a customer-facing "Run OCR" control until an approved worker,
provider configuration, rate/cost controls and privacy review exist.

## Tests

The direct lifecycle tests cover:

- initial queue + active replay;
- refusal for already-readable evidence;
- processing/completion without indexing;
- provider failure + explicit retry;
- review rejection;
- changed-source-hash denial;
- approved promotion into normal indexing;
- idempotent promotion;
- indexing failure remaining visible after accepted OCR.

## Boundaries

This slice does not:

- call an external OCR API;
- process Production files;
- make OCR output automatically applicable to a proposal;
- bypass malware/private-evidence rules;
- alter A$49/A$749 billing or checkout;
- enable Production;
- claim OCR quality without visual review.
