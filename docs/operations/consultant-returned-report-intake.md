# Consultant returned-report intake

Status: **CONTRACT IMPLEMENTED ON FEATURE BRANCH / EXTERNAL ADAPTERS NOT CONNECTED**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #421.

## Purpose

Returned consultant reports must re-enter the same evidence chain that produced
the consultant referral. Referral delivery or completion is not evidence that a
report is safe, authentic, applicable or current.

This contract provides the fail-closed bridge from one delivered consultant
referral to one private consultant-report evidence object. It deliberately does
not create another upload path.

## Security boundary

Consultant reports are private project evidence. They must not use the general
workspace upload route because that route can support guest/public storage.

The report must first enter the existing Item 74H private-evidence pipeline as
role `CONSULTANT_REPORT`. That pipeline remains responsible for:

- authenticated exact-project scope;
- private object storage;
- SHA-256 content integrity;
- quarantine;
- real malware scanning;
- immutable operator review; and
- promotion to `READY_FOR_EVIDENCE_PACKAGE`.

A referral status never bypasses any of those gates.

## Exact referral binding

`intakeConsultantReturnedReport` accepts only opaque referral and evidence
references from the caller. It loads the authoritative records through trusted
server dependencies.

The trusted returned-report binding record must match:

- the exact referral ID;
- the exact project ID;
- the exact referral scope key;
- the original immutable referral package digest;
- one discipline actually requested by that referral package; and
- the exact private-evidence content hash.

The referral must have reached a real delivered state:
`ASSIGNED`, `CONSULTANT_ACKNOWLEDGED` or `NEEDS_INFORMATION`.
A merely saved or internally acknowledged referral cannot accept a returned
consultant report.

## Result states

| Result | Meaning |
| --- | --- |
| `DENIED` | Referral, project, scope, digest, discipline, role or hash continuity failed. |
| `QUARANTINED` | The report is bound to the referral but security/operator review or durable package binding is incomplete. |
| `REJECTED` | The private evidence pipeline rejected the report. |
| `READY_FOR_EVIDENCE_PACKAGE` | The clean reviewed report is durably linked to the exact referral and may enter the existing evidence package. |

`READY_FOR_EVIDENCE_PACKAGE` is still not a planning conclusion, accepted
applicability decision, final SEE, A$49/A$749 entitlement or Production
checkout approval. The normal evidence applicability and SEE finality gates
remain separate.

## Privacy-minimal output

The returned result exposes only booleans and blocker codes. It never returns
the referral ID, evidence reference, content hash, consultant identity,
filename, address, storage URL, report text or page contents.

## Current implementation boundary

Implemented on `feat/consultant-returned-report-intake-20260924`:

- private evidence role `CONSULTANT_REPORT`;
- fail-closed exact-referral binding contract;
- scope/digest/discipline/hash continuity checks;
- quarantine/rejection/persistence behaviour;
- node tests for the accepted and denied paths.

Not yet connected:

1. Dedicated authenticated private consultant-report upload endpoint.
2. Durable server record for the referral-return binding.
3. Real private Blob adapter and production-grade retrieval.
4. Real malware scanner/immutable scan record integration.
5. Operator-review UI/queue integration.
6. Evidence applicability review of the returned report.
7. Workspace UI for “consultant report returned”.
8. Protected hosted Preview acceptance with synthetic report upload/read/delete.

Those steps must reuse the existing private-evidence contracts rather than the
general public workspace upload path.

Production, checkout and customer uploads remain unchanged.
