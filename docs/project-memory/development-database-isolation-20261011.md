# General Preview and Development database isolation

Checkpoint: 11 October 2026 (Australia/Sydney). Owner: Codex desktop. Scope: GitHub issue #456 security follow-up. Commercial decision remains HOLD.

## Approved boundary

Robbie approved one empty Vercel-managed Neon project on a confirmed $0 plan, non-production-only configuration, synthetic data only, and a controlled Preview destination check. [The follow-up approval](https://github.com/RobbieTall/Plannera-ab/issues/456#issuecomment-6103666621) permits only the temporary diagnostic, tests and documentation. No Production checkout, Production data/schema, or Byron/Kempsey resource change is authorised.

## Applied configuration

- Created Vercel Marketplace Neon resource `plannera-dev-isolated` on the Free plan in Sydney, with optional Neon Auth off. Neon project `crimson-mud-29775341`, default branch `br-sparkling-star-a7vp3gqu`, endpoint `ep-fancy-sunset-a7zoh8wm`. These identifiers are not credentials.
- Neon metadata showed one empty default branch, zero application tables and no copied customer data. No migration, seed, or import was run.
- Connected the new resource to Vercel project `plannera-ab` for general Preview and Development only. Production was explicitly unselected.
- Read-back of non-decrypted Vercel metadata showed 16 general database-related keys targeting Development and Preview. The pre-existing 16 general Production keys remain Production-only. The Byron and Kempsey branch-specific `DATABASE_URL` and `DATABASE_URL_UNPOOLED` entries remain present and were not edited.
- New general `PG*` and `POSTGRES*` entries are shared with council Previews; the two council-specific `DATABASE_URL` pairs take precedence on those branches. Recheck before any council write test.
- The integration currently has only the new project's default `neondb_owner` role. It has no access to the separate Production project, but a least-privilege app role remains unproven.
- No secret value was decrypted, copied into code, or documented.

## Controlled runtime proof

The first Preview deployment `dpl_8WQhxtY981vbhMaw24RuMRo38DV4` at `53f034632074791bb94ac4c29b68ab8457e6efd7` built successfully but the temporary status page returned `mismatch` before attempting a query. This is a failure, not runtime proof. Older deployments may still retain prior environment snapshots.

On branch `audit/dev-db-isolation-20261011`, the temporary `/internal/dev-database-isolation` page now reports fixed pass/fail categories separately for URL presence, project-id presence, isolated endpoint match, project-id match, and read-only connection attempt/success. The query is skipped unless the URL host matches the new isolated endpoint; when permitted, it runs only `SELECT current_database()`. It returns no configuration value, hostname, credential, query result, or exception detail. The page is unavailable outside that exact Preview branch. It is not commercial acceptance.

The outcome of the updated deployment, exact tested SHA, and any smallest safe configuration recommendation must be recorded on [issue #456](https://github.com/RobbieTall/Plannera-ab/issues/456) after the test. Until a successful bounded read-back, runtime isolation is **not verified**. This checkpoint does not authorise an environment correction.

## Recovery

If the general Preview/Development connection is wrong, first stop new Preview deployments. Remove or disconnect only the new resource's 16 general database entries that target Development/Preview; do not touch any Production-only or branch-specific Byron/Kempsey entry. General Preview should then fail closed for missing DB credentials. Keep the new project for inspection until Robbie authorises any deletion. Reconfirm all environment targets with Vercel metadata using decryption disabled, then rebuild a controlled Preview before resuming tests. Never pull an old Development credential or copy Production data.

Issue #456 is the live evidence ledger. PR #452 and the commercial gate remain unchanged and on HOLD.
