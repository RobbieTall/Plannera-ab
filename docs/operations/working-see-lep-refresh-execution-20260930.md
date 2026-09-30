# Working SEE isolated LEP refresh execution - 30 September 2026

## Decision and scope

Commercial HOLD remains. This checkpoint records successful source-only changes on two approved isolated Preview children, not commercial acceptance or a complete statutory-currency certification.

The exact planner and regression-test commit is `9f1cca1a483a984209d9119237b53216fa46e6c6`. The pure planner has no network or database client and cannot execute its SQL itself. Execution used the transaction-capable Neon connector with explicit project `red-term-77984898`, database `neondb`, and the separate branch IDs below.

| Council | Isolated child | Revalidated unchanged | Explicitly repealed groups retired | New versions | New keys |
| --- | --- | ---: | ---: | ---: | ---: |
| Byron | br-blue-dawn-a733pff4 | 87 | 4 | 1 | 1 |
| Kempsey | br-royal-breeze-a75t8c41 | 73 | 3 | 4 | 0 |

Both transactions returned `historical_bodies_preserved=true` and `retired_rows_not_current=true`. Byron's new version is 5.10 and new key is 6.16E. Kempsey's new versions are 4.2D, 4.6, 5.10 and 7.7. New versions use the maximum historical version plus one, not the current row alone.

Explicit XML status markers identified Byron 1.8B, grouped 6.3/6.4, 6.10 and 7.1, and Kempsey 1.8B, 6.1 and 7.3 as repealed. That is seven groups, including eight individual numbered provisions. Historical amendment notes were not promoted to operative rules.

**This was a scoped refresh, not a whole-instrument refresh.** It covered numeric main provisions with at most one uppercase suffix, plus the explicit grouped entry. Multi-letter suffixes such as 1.1AA, 4.1AA and 5.9AA, schedules, land-use tables, zone objectives and other unmatched records were not refreshed. Do not represent these excluded records as newly verified. The existing numeric lookup has the same single-letter limitation; broader assessment coverage remains a separate requirement.

## Acquisition provenance

Robbie manually downloaded the official NSW XML files. Original download bytes and durable archive copies were hash-matched before execution.

| Council | Official instrument | Original SHA-256 | Official version identity | Observed manual-download completion |
| --- | --- | --- | --- | --- |
| Byron | epi-2014-0297 | 42196389383aa5a424fd8d9b619b473d4df28a1061b672f1e5c2aceff869f821 | 3b18cafa-cf70-402d-83d9-8ef1f17d0c4e | 2026-09-30T06:40:24.108Z |
| Kempsey | epi-2013-0712 | ee5269d8709cad6615a59ccd02d99bdbff485d9d699130c8c4c5d4417e438720 | 77285005-6e77-4d8a-ae77-da49d3ccbb54 | 2026-09-30T06:43:25.975Z |

Acquisition method is `user-manual-official-browser-download`. The completion times are observed local file modification times, not independently observed HTTP response timestamps. `httpRetrievedAt` remains null. Direct automated official retrieval still returned HTTP 403; no protection was bypassed and no automated freshness success is claimed.

The scoped Clause retrieval times use the explicitly documented manual-download basis. Instrument citations were corrected to the matching date-pinned official source. `lastSyncedAt` was not advanced as a claim of whole-corpus refresh. New legal effective dates were left null rather than invented.

Original XMLs, plans and receipts are retained in the local source-evidence archive. This does not prove durable hosted original-source retrieval or customer access to archived originals. The application does not yet carry this manual receipt in a dedicated LEP provenance model; the operating receipt must not be confused with such a feature.

## Mutation boundaries and limitations

The planner requires the exact approved child, project, database, manual receipt, original hash and version identity. Before changing rows, its transaction locks the relevant tables and checks the complete pre-existing instrument history, identities, versions, current flags, titles, hierarchy, timestamps and body hashes. Existing old bodies, HTML and row IDs remain preserved. Revalidated rows receive retrieval/update timestamps only; changed/repealed versions become non-current, with new operative versions added where applicable.

No generic force-replace importer, migration, ledger reconciliation, customer-data mutation, coverage promotion, source-search-index rewrite or schema change was run. Other councils, parent branches, Production, existing evidence snapshots and issued documents were untouched. Existing packs must be regenerated through the authorised normal journey, not silently rewritten.

Database-name checks alone cannot establish Neon branch identity. That identity was established separately from explicit branch metadata and explicit connector targets. Static checks and source fingerprints are not guarantees against arbitrary transitive runtime behaviour, legal applicability errors or incomplete extraction.

## Validation

At exact commit `9f1cca1a483a984209d9119237b53216fa46e6c6`, all 14 GitHub workflow runs completed successfully. Isolated run [36694829350](https://github.com/RobbieTall/Plannera-ab/actions/runs/36694829350) passed both validation and credential-free compilation; push run 36694821319 also passed.

The validation job recorded **299 passing tests**: 11 build-contract, 52 source-planner (23 DCP + 29 LEP), 166 application Node, 64 Vitest and six offline-contract tests. No failures were reported. The build-safety contract covered seven commands, six entries and 14 transitive sources. Type-checking and application compilation completed within the isolated workflow. This is not proof of protected hosted document delivery.

Previously reported dependency audit advisories remain untriaged. No package upgrades were bundled into this source refresh.

## Next approved work

1. Preserve branch-specific deployment-disable safeguards and verify separate child overrides before any Preview deployment. Production tracks main; do not push or merge to main.
2. Deploy only the two protected document-test Previews, with checkout disabled and no new schema/source mutation in their build.
3. Exercise authorised project-specific DOCX/PDF generation, download and reopening; verify ownership, paid scope, evidence warnings and immutable document versions.
4. Inspect representative files natively and reconcile launch documentation with actual results.
5. Return a commercial go/no-go; do not activate Production.

Existing DCP execution evidence remains in [the source-proof checkpoint](working-see-source-proof-checkpoint-20260930.md). Research Viewer, Project Controls and real-user pilots remain deferred.
