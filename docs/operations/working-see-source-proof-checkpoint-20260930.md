# Working SEE source-proof execution checkpoint - 30 September 2026

## Current decision

Latest continuation: [hosted rehearsal checkpoint](working-see-hosted-rehearsal-checkpoint-20260930.md).
Both document Previews are now Ready, but customer generation failed; that checkpoint
records the exact source-applicability and council-provenance blockers.

**Commercial HOLD.** DCP source-proof persistence and the scoped LEP version refresh have completed on
the two approved isolated Preview copies. The hosted customer Word/PDF journey
and native output inspection are not complete. No Production changes or checkout
activation occurred.

This execution checkpoint supersedes the preparation-only wording in
[the source refresh runbook](working-see-live-source-refresh.md) and
[the runtime handover](working-see-preview-runtime-handoff-20260930.md).
Read this checkpoint and the latest Issue #395 / draft PR #452 comments before
repeating setup. Do not reinterpret older recorded failures as current blockers.

## Latest checkpoint: scoped LEP refresh completed

Read [the LEP execution runbook](working-see-lep-refresh-execution-20260930.md)
for actual counts, manual-download provenance, excluded multi-letter/schedule
coverage and immutable-history safeguards. All 14 workflows passed at
9f1cca1a483a984209d9119237b53216fa46e6c6, including 299 tests and isolated
compilation. Preview deployment and customer document acceptance remain pending.
The preparation and validation sections below are retained as historical records;
where they describe LEP work as pending, the linked execution runbook supersedes them.

## Completed and proven

| Council | Explicit isolated Neon target | DCP captures added | Transaction results |
| --- | --- | ---: | --- |
| Byron | br-blue-dawn-a733pff4 | 826 | All captures match; all bodies unchanged |
| Kempsey | br-royal-breeze-a75t8c41 | 1,496 | All captures match; all bodies unchanged |

Both calls explicitly named project red-term-77984898 and database neondb.
Branch metadata had confirmed distinct, ready, non-default children with the
expected parents. No default, parent or Production target was used.

The tested planner was published at
`3b0d44e22f7447030293e7a419adeac80fee2481`. It has no automatic execution,
network access or database client. Each complete statement array was submitted
through the transaction-capable Neon connector to its exact intended child.

The transaction checks the complete council inventory, existing row identities,
reference/parent/instrument, source URL, body and metadata SHA-256, absent capture,
fixture flags and retrieval-time bounds before updating anything. A short table
lock protects those checks against concurrent writes. It changes only
numericMeta.sourceCapture and updatedAt. Existing wording, row IDs, other metadata,
the other council corpus, customer records and historical artifacts are preserved.
No delete/replace importer, migration, coverage promotion or schema change was run.

Actual successful transaction results:
- Byron: captured_records=826, captures_match=true, bodies_unchanged=true.
- Kempsey: captured_records=1496, captures_match=true, bodies_unchanged=true.

Execution was also recorded on Issue #395 comment 5907754950 and PR #452 comment
5907756187. Original-source bytes, preparation plans and execution receipts remain
in the durable local source-evidence archive, outside GitHub and the temporary
working directory. No credentials or private customer documents were published.

## Earlier DCP-only validation status (historical)

- The new pure planner's **23 regression tests passed locally** with no credentials.
- At exact commit 3b0d44e22f7447030293e7a419adeac80fee2481, all **14 GitHub
  workflow runs passed**, including isolated validation and credential-free
  compilation in runs 36692770264 and 36692776281.
- The existing application suite contains 247 runtime tests. The 23 new planner
  tests were invoked separately locally; they are not automatically included in
  that existing CI count. Do not claim a single 270-test remote run.
- Both scoped database transactions executed successfully. The local planner
  tests alone do not prove PostgreSQL semantics, actual target identity, source
  authority, legal applicability or general SQL safety.
- Dependency audit advisories previously reported by npm remain untriaged.

No deployment or merge was needed. The exact feature-branch Vercel deployment
disable is unchanged. Existing hosted Previews do not yet contain the latest
lookup changes. CI success is not hosted document acceptance.

## Source acquisition evidence and limitations

All 39 Byron PDFs and five Kempsey PDFs matched their archived original-byte
SHA-256 receipts and the prior offline parser comparison. All 2,322 row bodies
matched those parsed originals before the source envelopes were added.

Kempsey's five PDFs were fetched again successfully from the official council
HTTPS URLs. Actual request-start/completion times were captured, and all five
byte hashes matched the earlier originals. The earlier HTTP Date and later
inspection times were not repurposed as precise retrieval timestamps.

This establishes traceable text/source identity, not complete diagram/table
extraction, correct applicability to a particular proposal, statutory currency
certification or hosted private archival/reopening of original sources.

## Earlier LEP preparation before execution (historical)

Both manually downloaded original XMLs remain hash-verified and unchanged.
Direct automated requests to the official Byron view/export endpoints still
returned HTTP 403; no protection was bypassed and no successful HTTP receipt
was invented. Do not ask Robbie to repeat his completed downloads.

Observed local file timestamps are filesystem evidence only:
- Byron: created 2026-09-30T06:40:24.106Z, modified 2026-09-30T06:40:24.108Z.
- Kempsey: created 2026-09-30T06:43:25.973Z, modified 2026-09-30T06:43:25.975Z.

They are not an independently observed HTTP retrieval timestamp. Any manual-source
integration must preserve that acquisition distinction, original XML hash and
official version identity; do not label this an automated freshness pass.

Read-only complete Clause history on the respective isolated child found:
- Byron: 128 current records, maximum historical version 1.
- Kempsey: 103 current records, maximum historical version 1.

An offline main-provision-only comparison checked title, hierarchy, content hash,
body-text hash and body-HTML hash against the actual original XML parser output:

| Council | Parsed records (all) | Main-provision candidates | Exactly unchanged | New version candidates | New key candidates | Existing non-main records left untouched |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Byron | 162 | 92 | 89 | 2 | 1 | 37 |
| Kempsey | 137 | 80 | 75 | 5 | 0 | 23 |

Changed/new candidate keys:
- Byron: 5.10, 7.1; new 6.16E.
- Kempsey: 4.2D, 4.6, 5.10, 6.1, 7.7.

The parsed text for Byron 7.1 and Kempsey 6.1 now consists of amendment/repeal
history rather than their former operative rules. Verify the original XML's
status markers before classifying or applying them. Do not promote historical
notes to operative controls, reuse old wording, or retire unrelated schedule rows
merely because keys differ. No legislation rows or Instrument URLs were changed
by this comparison.

Two initial local comparison invocations encountered TypeScript/CommonJS module
format issues before running; an explicit CommonJS/async execution adapter
completed the unchanged offline comparison. This was not an application change,
and the scratch runner is retained outside the application validation workspace.

## Earlier planned sequence (steps 1-2 now completed; 3-6 remain)

1. Prepare explicit LEP source/version operations from the verified originals,
   including manual-acquisition provenance and original XML status markers.
2. Preserve old row/history identities, use maximum historical version when adding
   versions, correct only the matching Instrument citation and avoid generic
   force-replace importers. Leave ambiguous schedule mappings unpromoted.
3. Resolve durable hosted original-source retention and applicable spatial evidence
   separately; DCP freshness does not prove either.
4. Deploy only the approved protected council Previews with their separate child
   databases after reconfirming exact commit/branch isolation and build safety.
5. Generate project-specific DOCX/PDF through the real authorised customer flow;
   test private download/reopening, ownership/paid scope, warnings and immutable
   versions, then inspect representative outputs natively.
6. Reconcile canonical launch status and return a commercial go/no-go without
   activating Production.

Continue routine approved work without asking Robbie to say 'continue'. Pause
only for unavoidable authentication/secret entry, a genuine higher-authority risk
or an unexpected concurrent change. No new user setup action is currently needed.

Research Viewer, Project Controls and all real-user pilots remain deferred.
Practitioner workflow intelligence informs checks, not authoritative conclusions.
