# Database change control

## Mandatory rule

Vercel builds are schema-read-only. Preview and Production builds may generate the Prisma client, run read-only acceptance checks, and compile the application, but they must not run `prisma db push`, `prisma migrate deploy`, or any other schema/data mutation command.

## Build-safety enforcement

`vercel-build` is an exact permitted-command list. `scripts/verify-vercel-build-safety.mjs` runs first and rejects command additions, npm-wrapper drift, entry-file fingerprint drift, and direct database, Blob, Sandbox or filesystem mutation signatures in every pre-build entry point. The permitted chain is Prisma client generation, Byron/Kempsey read-only smoke gates, the read-only controlled-address preflight, the in-memory working-SEE acceptance, and `next build`.

Stateful Item 74H acceptance and Preview schema migration are not deployment-build responsibilities. They are available only through the manual `item74h-stateful-preview-acceptance.yml` and `item74h-preview-migration.yml` workflows. Neither workflow is scheduled, pull-request-triggered or push-triggered.

Before either workflow may run, an administrator must separately create and protect its named GitHub environment, require an appropriate reviewer, provide only isolated non-production credentials, and set all of the following environment-scoped authorization values for one exact run:

- `ITEM74H_PREVIEW_MUTATION_APPROVED=true`
- `ITEM74H_WORKFLOW_AUTHORIZED_COMMIT=<full 40-character commit SHA>`
- `ITEM74H_AUTHORIZED_DATABASE_TARGET=<exact Neon Preview endpoint ID>`
- `ITEM74H_AUTHORIZED_BLOB_TARGET=<exact private Preview Blob store ID>` when a cloud suite is selected

The operator must also type the workflow confirmation phrase and the same target identifiers. The checked-out commit, GitHub commit, hosted commit, protected authorization, credential hostname and checkout-off state must all agree before dependencies are installed or a stateful command begins. Missing environment protection or authorization is a blocker; the workflow definition does not prove that external protection exists.

Migration-ledger reconciliation remains a deliberate operator task. The migration workflow invokes only the existing allowlisted SQL runner and must not create, repair or infer Prisma migration-ledger entries. Confirm the isolated branch state and approved migration history before dispatch, and delete obsolete Preview resources only under the separate resource-cleanup authority.

The repository may retain `npm run db:push` for deliberate local or isolated development work. It is not a deployment command. Never run it against Production.

## Required process for a schema change

1. Identify the exact schema change, target environment, compatibility impact, and recovery path in a dedicated pull request.
2. Use a forward-only reviewed migration rather than an automatic schema push. Include data backfill or rollback handling where relevant.
3. Obtain explicit approval before applying any change to a shared or Production database.
4. Apply and verify the migration in an isolated non-production database first. Do not reuse Production credentials or expose connection values.
5. Confirm application compatibility, migration outcome, read-only launch smoke, and rollback/recovery readiness.
6. Obtain separate explicit Production approval naming the exact migration and target before an authorised operator applies it.
7. Deploy the already-reviewed application only after the migration boundary and order are clear.

A failed or missing migration blocks deployment. Do not make a build green by reintroducing automatic `db push`, weakening a gate, editing database rows directly, or silently accepting schema drift.

## Credentials and evidence

Database URLs remain in the protected environment where the operation runs. Never copy them into GitHub, documentation, chat, command output, artifacts, screenshots, or local tracked files. Record only the migration identifier, target environment, approved operator, timestamp, result, and privacy-safe validation evidence.

For the Byron/Kempsey commercial preflight, see [soft-launch-gate.md](./soft-launch-gate.md).
## 2026-09-07 hardening clarification

The manual Item 74H workflows use two jobs. The first job is credential-free and rejects malformed input, a checkout/SHA mismatch, a `main` dispatch, or any SHA that Git reports is already contained in `origin/main`. The protected execution job cannot start unless that prerequisite succeeds. Environment credentials are not job-scoped: each secret is exposed only to the target-verification or stateful execution step that needs it.

The Vercel build verifier pins the exact command list and recursively resolves, fingerprints and scans the local runtime import closure of every invoked entry, including the Next.js wrapper. Next.js compilation runs in a child process with a minimal environment allowlist; unlisted server configuration and credentials are absent, and all checkout/acceptance mutation flags are forced off.

This is strong static defence, not a proof of every possible runtime behaviour. The verifier cannot prove the semantics of third-party packages, generated code, dynamic imports it cannot statically resolve, unauthenticated network calls, or future framework behaviour. Changes to the verifier itself, the credential scrubber, package lock, build configuration or application compilation path still require code review. Vercel build credentials should remain least-privilege, and no Blob, Sandbox, payment-write or database-write credential should be available to deployment builds.
