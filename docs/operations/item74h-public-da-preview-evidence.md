# Item 74H public Byron DA Preview evidence

Status: APPROVED FOR PROTECTED PREVIEW / QUARANTINE GATE IMPLEMENTED / CONTENT REVIEW NOT YET COMPLETE

Last updated: 2026-08-30

## Purpose

This runbook records the first real public-document evidence slice for Item 74H.
It does not authorize Production mutation, Production checkout, or reliance on
unreviewed document contents.

## Approved public case

The protected example is Byron Shire Council development application
\`10.2025.535.1\`. The official tracker records an approved proposal that
includes a new farm shed at 870 Wilsons Creek Road, Wilsons Creek.

The quarantine gate retrieves only these official tracker records:

| Evidence candidate | Council record |
| --- | --- |
| Council road evidence candidate | \`E2025/131541\` |
| Cadastral survey candidate | \`E2025/131546\` |
| Proposed shed layout candidate | \`E2026/59935\` |
| Approval cross-check | \`E2026/60560\` |

A filename or tracker description is not evidence that a document satisfies a
role. Each role remains unconfirmed until a CLEAN document is reviewed at exact
page or sheet references under the existing operator-review contract.

## Protected execution

Run \`npm run accept:item74h-public-da-preview\` only when all of these are true:

- \`VERCEL_ENV=preview\`.
- \`VERCEL_GIT_COMMIT_REF=integration/item74h-public-da-20260830\`.
- \`ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED=true\`.
- The dedicated private Preview Blob credentials are available.
- Both paid checkout flags are absent or false.

The gate must:

- Fetch the exact approved case page over HTTPS with redirects disabled.
- Accept only the exact expected council records and official Byron document API.
- Never log or persist download capability values.
- Enforce bounded PDF responses and PDF magic bytes.
- Store each document under a fresh opaque private Blob reference.
- Prove unauthenticated reads are denied and authenticated bytes retain their hash.
- Refresh ClamAV definitions in a preparation sandbox.
- Scan the exact set in a snapshot-derived, deny-all scanner sandbox.
- Verify every hash again after scanning.
- Report only roles, public record numbers, page counts and redacted booleans.
- Delete all Blob objects, sandboxes and snapshots and prove zero residue.

## Fail-closed boundary

A CLEAN quarantine result does not promote evidence and does not unlock the
free, A$49 or A$749 commercial stages. The next step is an operator-reviewed,
page-specific assessment of authority, road classification, survey provenance,
shed measurements and survey-to-layout basis. If a document does not prove its
candidate role, the pathway must return \`MORE_EVIDENCE_REQUIRED\`.

Production checkout remains disabled.
