# Live-only LEP retrieval prerequisite for Working SEE

Status: read-only transport primitive; NOT a completed source refresh or commercial gate.

The existing admin LEP route reads bundled XML, and its force mode replaces clauses
and backfills project LEP data. The general legislation fetcher can prefer local
files or fall back to fixtures. Neither route is approved as proof of live current
source retrieval for the isolated document rehearsal. Do not pass secrets in URLs.
The existing legislation and DCP GET endpoints invoke ingestion; they are not
read-only diagnostics.

`fetchLivePreviewLepSource` is a separate Preview-only read operation. It has fixed,
distinct Byron and Kempsey official NSW XML endpoints; no file/database access,
fixture fallback, redirects, credentials, cookies, or persistence. It bounds the
request duration and streamed response size, rejects unexpected content types,
retains original bytes plus SHA-256/retrieval metadata, and sanitizes failures.

Its receipt proves transport only. It does NOT prove statutory currency,
applicability, instrument/body identity, parser completeness, clause coverage,
database target identity or document readiness. A successful XML response may
still contain an error payload: semantic review remains mandatory before writes.

## Required next integration

1. Verify the exact protected Preview deployment and independent child database
   target before any source writes; never use either immutable parent or Production.
2. Validate the live document's instrument identity and parser completeness.
   Reconcile the general parser's prefixed clause keys with the numeric clause
   references expected by the pack-capture reader; do not guess or duplicate keys.
3. Preserve a durable retrieval receipt and original-source binding. Current
   Clause/Instrument schemas do not themselves retain the full HTTP receipt.
4. Revalidate unchanged clause bodies against the genuinely retrieved source before
   updating retrieval dates. Updating Instrument.lastSyncedAt alone is insufficient.
   Preserve prior evidence/version snapshots and do not use force replacement.
5. Capture fresh council DCP provenance separately through its reviewed importers.
6. Prove ordinary project/site/QSC/DPP/memo generation and private DOCX/PDF delivery,
   permissions, warnings, original-version reopening and native presentation.

No existing importer, build command, database schema, deployment flag, application
route or Production behavior is changed by this prerequisite. It is not wired to
a mutation endpoint or auto-run workflow. Tests use synthetic streams only.
Hosted live retrieval and persistence are not claimed. Commercial status: HOLD.

## Validation and deployment boundary (30 September 2026)

Focused strict TypeScript for the helper and its test file passes. All 18 emitted
JavaScript runtime regressions pass with synthetic HTTP streams and a cleared
environment. The binary Response test fixture was corrected after Robbie's
approval by copying to a definite ArrayBuffer; no assertions were removed.
The existing isolated GitHub workflow now includes these tests. Its new run must
pass before reporting remote validation; prior 201-test results are historical.

Publication is confined to draft PR #452's exact deployment-disabled branch.
No importer or route invokes this helper yet; publication performs no live HTTP
retrieval, source persistence, database mutation, merge or Preview/Production
deployment. Both existing protected Preview builds are Ready and Byron sign-in
has succeeded. None of those observations proves the customer document journey.
Continue from the runtime handover and latest PR comments, preserving original
acceptance snapshots and the separate mobile documentation branches.
