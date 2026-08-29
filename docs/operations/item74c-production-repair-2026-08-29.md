# Item 74C Production planning-data repair — 2026-08-29

## Approval and scope

The operator explicitly approved an evidence-preserving Byron/Kempsey Production planning-data repair, with no schema or checkout changes, followed by both launch gates.

This operation is limited to the four deficits observed by the merged read-only gate:

- Byron coverage is `QUEUED`.
- Byron has no current council DCP source chunks.
- Kempsey coverage is `SEARCHABLE_READY`.
- Kempsey LEP provenance is not an authoritative HTTPS source.

Any different starting state aborts the operation.

## Recovery point

Before writing, Neon branch `backup/production-pre-item74c-repair-2026-08-29` was forked from Production `main`. It contains data and schema from immediately before the repair and auto-expires on 30 August 2026.

## Guardrails

The one-time runner:

- skips outside Vercel Production;
- requires hosted Vercel execution on Git branch `main`;
- requires the tracked one-time approval flag;
- refuses to run if either checkout flag is enabled;
- requires the protected database URL to resolve to Neon without printing it;
- verifies the exact four observed deficits before any write;
- uses the pinned official Byron DCP 2014 source set;
- uses all five official Kempsey DCP 2026 parts;
- validates exact whole-LGA zones, permission profiles, LEP/DCP provenance, clauses and source chunks before setting coverage to `VERIFIED`;
- performs no schema command; and
- emits only public source labels and aggregate evidence counts.

## Execution order

1. Generate the existing Prisma client without changing schema.
2. Run the guarded one-time Production repair.
3. Run `npm run smoke:launch`.
4. Run `npm run smoke:whole-lga`.
5. Compile and deploy only if both gates are green.
6. Remove the one-time repair hook immediately and repeat the normal schema-read-only Production build.

A failed ingestion, unexpected starting state, incomplete official source set, invalid provenance, missing zone, permission mismatch, missing chunk, enabled checkout flag, or red gate blocks deployment. The existing Ready deployment remains live.

## Acceptance boundary

A green repair certifies the representative launch gate and whole-LGA source matrix only. It does not activate checkout, apply Item 74H schema, certify a real customer pathway, approve a paid SEE, or replace operator review.
