# General Preview and Development database isolation

Checkpoint: 11 October 2026 (Australia/Sydney). Owner: Codex desktop. Scope: GitHub issue #456 security follow-up. Commercial decision remains HOLD.

## Approved boundary

Robbie approved one empty Vercel-managed Neon project on a confirmed $0 plan, non-production-only configuration, synthetic data only, and a controlled Preview destination check. No Production checkout, Production data/schema, or Byron/Kempsey resource change is authorised.

## Applied configuration

- Created Vercel Marketplace Neon resource `plannera-dev-isolated` on the Free plan in Sydney, with optional Neon Auth off. Neon project `crimson-mud-29775341`, default branch `br-sparkling-star-a7vp3gqu`, endpoint `ep-fancy-sunset-a7zoh8wm`. These identifiers are not credentials.
- Neon metadata showed an empty new project with no application tables and no copied customer data. No migration, seed, or import was run.
- Connected the new resource to Vercel project `plannera-ab` for general Preview and Development only. Production was explicitly unselected.
- Read-back of non-decrypted Vercel metadata showed 16 general database-related keys targeting Development and Preview. The pre-existing 16 general Production keys remain Production-only. The Byron and Kempsey branch-specific `DATABASE_URL` and `DATABASE_URL_UNPOOLED` entries remain present and were not edited.
- Do not infer that older deployments picked up these changes; deployment environment snapshots must be checked separately. The new general `PG*` and `POSTGRES*` entries are shared with council Previews, while the two council-specific `DATABASE_URL` pairs take precedence on those branches. Recheck before any council write test.
- No secret value was decrypted, copied into code, or documented.

## Controlled runtime proof

Branch `audit/dev-db-isolation-20261011` contains a temporary read-only, Preview-only status page at `/internal/dev-database-isolation`. It is unavailable outside that exact branch. It compares the configured Neon project and endpoint identifiers and runs only `SELECT current_database()`; it returns only a bounded status. This page does not prove schema readiness or customer journeys.

The live deployment outcome and exact evidence link must be recorded on issue #456 after the first controlled deployment. Until that read-back succeeds, runtime isolation is **not yet verified**.

## Recovery

If the general Preview/Development connection is wrong, first stop new Preview deployments. Remove or disconnect only the new resource's 16 general database entries that target Development/Preview; do not touch any Production-only or branch-specific Byron/Kempsey entry. General Preview should then fail closed for missing DB credentials. Keep the new project for inspection until Robbie authorises any deletion. Reconfirm all environment targets with Vercel metadata using decryption disabled, then rebuild a controlled Preview before resuming tests. Never pull an old Development credential or copy Production data.

Issue #456 is the live evidence ledger. PR #452 and the commercial gate remain unchanged and on HOLD.
