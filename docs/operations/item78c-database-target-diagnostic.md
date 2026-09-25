# Item 78C Preview database-target diagnostic

## Latest Item 78C checkpoint - 2026-09-25

This checkpoint supersedes earlier prepared/not-deployed status below.

- PR #442 merged into the acceptance branch only; deployed application commit: `58d7a6b8ac9dce082c648d35b18811bfd42fcbf2`. `main` was not changed.
- All three candidate CI checks passed, including 57 synthetic tests and the focused TypeScript check. The guarded Vercel Preview build completed successfully and the deployment is READY.
- The approved bounded runtime diagnostic completed successfully and confirmed a Preview application/test-target mismatch. No project records were read by the diagnostic and no database/schema mutation was performed.
- This result does not establish the sole cause of the earlier HTTP 404, prove the alternate-project fixture, or pass whole-funnel acceptance.
- Next: correct independent Preview application/runner alignment, then prove the remaining fixture boundaries before a separately authorised whole-funnel rerun. Do not rerun with mismatched targets or silently merge council fixtures.
- Workflow/environment acceptance pins were not changed by this deployment. Do not assume the workflow pin equals the deployed application commit.
- Decision: HOLD. Production checkout remains disabled; no Production settings, data, or schema were changed. The temporary diagnostic expires on 2026-09-28 UTC and must not be carried into Production.
- Issue #395 remains the privacy-minimal continuity record. No credentials, connection strings, endpoint labels, private project identifiers, or document contents belong in public status notes.


## Status and scope

Prepared from acceptance commit 077d0e5d48fb6ab49fb7c5acc8cfa70668270f4d.
User approval on 25 September covers preparing, testing and deploying this Preview-only diagnostic. This document is not evidence that deployment or execution occurred. Record immutable candidate, deployment and result references in Issue #395. Main and Production must remain untouched.

The existing owner's deployment API contract does not document a database-connection value mapping. Current project environment settings are not proof of a historical deployment's effective configuration. Existing login/status routes can update sessions and are not a strictly read-only substitute.

## Contract

GET /api/internal/item78c-database-target accepts exactly two query parameters: byron and kempsey. Each is a lowercase SHA-256 fingerprint of the confirmed non-secret Neon endpoint label, excluding the pooling suffix, never of a credential or full connection string. The fingerprints must be distinct. Derive them from the independently confirmed protected-environment target labels; do not publish those labels or fingerprints in public handoff notes.

The deployed process parses its existing DATABASE_URL in memory, requires a PostgreSQL URL on a Neon hostname, strips only the endpoint's terminal pooling suffix, and compares the SHA-256 endpoint fingerprint. No credential is returned, logged, copied, fetched remotely or persisted. No database query or other network request occurs. There are no Prisma or authentication imports. Middleware bypasses session-cookie creation for this exact route.

Response contains only version and one target label: BYRON, KEMPSEY, NEITHER or UNAVAILABLE. Invalid requests receive 400; unavailable/unparseable configuration receives 503. Outside VERCEL_ENV=preview, exact branch accept/item-78c-byron-kempsey-20260914, or the UTC window 25 September through before 28 September 2026, return 404. Responses prohibit caching and indexing. Fingerprints are comparison inputs, not authentication; Vercel deployment protection must be confirmed before use.

This identifies an endpoint, not database name, role, connectivity, schema, records or tenant ownership. It cannot prove the configuration of an earlier deployment, even when redeployed from the same branch. A different Neon endpoint or unsupported host must not be silently treated as either council. Normal hosting access/audit records may occur.

## Safe publication and deployment

1. Run the synthetic tests without live environment files or credentials: node --experimental-strip-types --test tests/item78c-database-target-diagnostic.test.mjs.
2. Review the precise patch and middleware exception. Static import checks are regression guards, not proof of all transitive application/build behavior.
3. Verify the complete build path and cloud build settings before deployment. Do not execute an install/build with unreviewed lifecycle hooks or a possible Production database target. Existing acceptance coverage must not be weakened or relabelled as passed.
4. Publish only with automatic deployment suppressed for both the candidate fix branch and the existing acceptance branch. Preserve every pre-existing suppression.
5. Confirm the selected project, Preview target, branch scope, exact candidate SHA, deployment protection, and Production non-impact before manual deployment. Never promote to Production. Do not query the database or change data/schema for this diagnostic.
6. Request only this diagnostic on the verified immutable Preview URL using the existing protected connection. Do not visit session-creating app routes as part of this test.
7. Record only version, fixed result, exact deployment/commit and the resulting next action. Never print environment objects, raw errors, headers, cookies, tokens, connection strings or raw provider API responses.
8. Do not repoint council configuration or rerun whole-funnel acceptance until the remaining fixture and scope checks are understood. No stateful run is authorized by this diagnostic preparation.
9. Remove the temporary route and middleware exception after diagnosis; the expiry is a fallback, not permanent product functionality.

## Continuity and commercial blocker

Run #71 proves both primary session/project lookups only. The hosted target comparison remains outstanding until an actual protected response is recorded. Alternate-project eligibility, payment idempotency, private evidence, DPP/SEE output, consultant handoff and representative DOCX/PDF review are not established by this diagnostic.

Decision remains HOLD. Production checkout stays disabled and Production data/schema unchanged. Do not recreate saved credentials. Preserve independent fixtures and unrelated PRs.

## Guarded deployment build

The candidate's vercel.json disables install lifecycle scripts and calls scripts/item78c-diagnostic-build.mjs before the unchanged npm run vercel-build chain. The wrapper refuses Production, any other branch, missing commit evidence, an expired window, an enabled controlled-address external probe, or a database outside the two independently confirmed Preview endpoint labels.

One new NON-SECRET branch-only setting is required: ITEM78C_DIAGNOSTIC_DATABASE_TARGETS. Its value is the two independently confirmed GitHub Preview target labels separated by one comma, without spaces or pooling suffixes. Check saved cloud state before creating it. Scope it only to Preview branch accept/item-78c-byron-kempsey-20260914. Do not include a connection string. Do not publish its value in handoff notes. This setting authorizes the build's target; it does not replace either council's fixture or credential.

After the guard succeeds, the existing launch and whole-LGA smoke checks still execute and can read the confirmed Preview database. The diagnostic route itself remains database-free. The child build receives only the validated DATABASE_URL and a limited build-variable allowlist; unrelated credentials and fallback database variables are excluded. Child output is captured and never printed or persisted; only TARGET_REFUSED, BUILD_FAILED or BUILD_PASSED is reported. A failed build is a failure, never acceptance success.

The temporary wrapper intentionally refuses Production builds. This PR must remain acceptance-only. Remove the temporary deployment override/guard through a reviewed change before any future Production integration; never bypass it on Production. No existing launch gate is removed or marked passed by this wrapper.

Additional synthetic command: node --experimental-strip-types --test tests/item78c-database-target-diagnostic.test.mjs tests/item78c-diagnostic-build.test.mjs. The credential-free PR contract workflow also performs a strict helper type check. Full application compilation is still a separate deployment result, not implied by these focused checks.
