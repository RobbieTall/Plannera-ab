# Database change control

## Mandatory rule

Vercel builds are schema-read-only. Preview and Production builds may generate the Prisma client, run read-only acceptance checks, and compile the application, but they must not run `prisma db push`, `prisma migrate deploy`, or any other schema/data mutation command.

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
