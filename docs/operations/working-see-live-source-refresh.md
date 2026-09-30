# Live-only LEP retrieval prerequisite for Working SEE

## Approved schedule-identity correction: 30 September 2026

Latest checkpoint: the parser correction is implemented and locally validated;
hosted document acceptance and commercial status remain HOLD.

The original XML parser reused visible clause numbers across schedules. Both
downloaded source files produced 11 duplicate-key groups (schedule 1 versus
schedule 6, clauses 1-11). XML schedule provisions now use their official scoped
IDs, for example `SCH_1_SEC_1` versus `SCH_6_SEC_1`. Main-clause and HTML
identifiers retain their existing behavior. No clause wording is rewritten.

Validation of this correction:
- Focused strict TypeScript compilation passed.
- Six synthetic runtime regressions passed: main provisions, distinct schedules,
  nested schedule divisions, grouped zoning text, HTML compatibility, and distinct
  unnumbered schedule provisions.
- Two separate original-source checks passed against the SHA-256 values recorded
  below: Byron 162 parsed records; Kempsey 137; zero duplicate output keys in each.
- Against the unchanged parser, every non-key field and record order was identical:
  title, body HTML/text, hierarchy and content hash. Core 2.3/4.3/4.4/4.6 records
  were entirely unchanged. These comparisons establish no regression from this
  identity fix, not independent proof of complete statutory extraction.
- The six regression tests are added to the isolated GitHub workflow. Remote
  validation for the new commit is pending; previous successful runs are historical.

The earlier broad mismatch diagnostic counted nested zone-group provisions as
missing despite their text remaining in parent records, and assumed visible
numbers for unnumbered provisions. Those counts are not evidence of lost clauses.
Full parser completeness, unit/superscript fidelity, semantic applicability,
fresh DCP/spatial coverage and hosted output quality still require review.

This changes keys for future parsing only. No stored records, receipts, source
timestamps or historical document/acceptance snapshots have been rewritten.
Before any isolated-child ingestion, explicitly reconcile these scoped keys and
the existing prefixed main-clause keys with the pack reader's numeric references.
Do not insert duplicate aliases, silently remap history, force-replace clauses,
or call the existing admin ingestion endpoints. Durable original-source binding
and a child-only non-destructive refresh path remain prerequisites.

Publication is limited to draft PR #452's deployment-disabled feature branch.
No main merge, deployment, database access or Production change is part of this
correction. Production checkout remains outside this task.

## Earlier checkpoints (historical where superseded above)

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

## Corrected source references (30 September 2026)

The first helper revision copied incorrect identifiers from the existing register.
Robbie approved correcting the helper and tests. The existing general-purpose
instrument register and ingestion paths are not changed by this narrowly scoped fix;
their old identifiers remain a separate integration issue and must not be relied on.

Official page inspection confirmed:

| Council | Correct instrument | Page-displayed current version | Advertised XML export |
| --- | --- | --- | --- |
| Byron | `epi-2014-0297` | 3 July 2026 to date | `https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2014-0297` |
| Kempsey | `epi-2013-0712` | 1 July 2026 to date | `https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2013-0712` |

These are explicitly date-pinned rehearsal snapshots, not a rolling-current feed.
Recheck authoritative version information and export links before later reuse.
Retrieval time records when bytes were fetched, not the date a law became current.
The public current-version source URL is a citation; the receipt records the exact
historical export URL used for the bytes. Browser page/link inspection does not
prove raw XML retrieval, valid XML, semantic identity, applicability or persistence.
Do not invent `/export/xml/current/` support or mark an unchanged fixture as fresh.

The two additional synthetic regressions reject responses carrying the old incorrect
identifiers. Existing safety and failure tests remain intact. Validation results for
this correction must be recorded against its exact commit in the PR; earlier
18-test results refer to the prior revision. No helper caller, schema, deployment,
cloud configuration or database content is changed here. Commercial HOLD remains.

## Manual original-source checkpoint: 30 September 2026

Both official XML files have now been manually downloaded by Robbie and inspected
locally. This supersedes earlier download-blocked status for these two manual
rehearsal inputs only. Automated HTTP retrieval remains unproven.

| Council | Original export filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Byron | `epi-2014-0297_2026-09-30.xml` | 1315362 | `42196389383aa5a424fd8d9b619b473d4df28a1061b672f1e5c2aceff869f821` |
| Kempsey | `epi-2013-0712_2026-09-30.xml` | 1128828 | `ee5269d8709cad6615a59ccd02d99bdbff485d9d699130c8c4c5d4417e438720` |

UTF-8 decoding and XML well-formedness checks passed with entity processing
disabled. Identity and version metadata match the official pages inspected:
Byron LEP 2014, first.valid.date 2026-07-03; Kempsey LEP 2013,
first.valid.date 2026-07-01. Kempsey's official XML council code is `KEMP`,
not `KEMPSEY`; any future identity validator must use an explicit reviewed
mapping together with instrument ID and title, never a fuzzy council match.
Version IDs: Byron `3b18cafa-cf70-402d-83d9-8ef1f17d0c4e`;
Kempsey `77285005-6e77-4d8a-ae77-da49d3ccbb54`.

These checks do not prove DTD conformance, complete clause extraction, spatial
applicability, current DCP coverage, automated freshness or successful ingestion.
The originals were not modified or uploaded. No database writes occurred.
No successful HTTP receipt or exact download timestamp has been invented.

## Source freshness operating rule and remaining implementation

Older local-folder and repository copies are historical inputs, not inherently
current authoritative evidence. Do not delete them or overwrite immutable
acceptance snapshots. A current-looking filename, a new upload, successful parsing,
a fresh build or a database timestamp is not evidence of current legislation.

Before a source is represented as current:
1. Resolve its correct official instrument identity and authoritative source.
2. Check official version/publication/effective information and record when checked.
3. Preserve exact retrieved bytes, their hash, the source/version URL and the actual
   acquisition method (manual download versus successful automated retrieval).
4. Validate semantic identity, applicable scope and parser coverage. Keep LEP,
   DCP and spatial-layer freshness separate; one cannot establish the others.
5. Compare against the prior source version. If text is unchanged, revalidation
   still requires a genuine official check; never refresh dates on bundled fixtures.
6. Preserve documents already issued against their original source version. New
   evidence produces a new document version and identifies affected earlier work.
7. If retrieval or currency cannot be confirmed, label that limitation clearly.
   Do not silently substitute stale evidence or claim submission readiness.
   Useful qualified drafts may continue only where the existing product supports
   them safely; this rule is not permission to weaken evidence gates.

Recurring refresh, change detection, controlled re-ingestion, affected-project
notification and regeneration are requirements, not proven capabilities of this
helper. It is a date-pinned rehearsal transport primitive with no callers.
NSW's published XML guidance asks automated processing to run outside normal
NSW business hours: https://legislation.nsw.gov.au/help/export .
The current task must prove a safe refresh on the two isolated children before
claiming the customer document journey complete; it does not activate Production.

Next: validate extraction/provenance and an explicit child-only ingestion path,
then fresh project/site/pack preparation and actual DOCX/PDF generation,
private download/reopening, permissions, warnings and native document review.
Commercial HOLD remains.
