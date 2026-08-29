# Byron and Kempsey soft-launch gate

The Byron and Kempsey launch smoke is the first repeatable commercial preflight. It is intentionally narrower than Item 74 whole-LGA certification and does not, by itself, prove either council is commercially flight-ready.

Run it with:

```bash
npm run smoke:launch
```

## Protected execution

Vercel runs the real command during every Preview and Production build after Prisma client generation and before the Next.js application build. The smoke reads the database and exits non-zero on any red result. It does not ingest, update, delete, migrate, push, or otherwise mutate planning data or schema.

Vercel builds are schema-read-only. Automatic `prisma db push` has been removed from `vercel-build`. Any future database change follows [database change control](./database-change-control.md) and requires a separate reviewed plan plus explicit Production approval.

The GitHub Actions workflow is secret-free. It verifies that `package.json` still maps `smoke:launch` to `scripts/launch-smoke.ts`, that `vercel-build` invokes it before `next build`, and that no schema-push command has returned to the Vercel build path. The required Vercel deployment status is the hosted evidence run; `DATABASE_URL` and its fallback aliases remain inside Vercel and are never copied into GitHub, logs, summaries, or artifacts.

## Green contract

Both launch LGAs must have:

- a `VERIFIED` coverage state with a real preparation timestamp;
- a matching LEP instrument with clauses, an HTTPS authoritative source URL, and a sync timestamp;
- populated objectives and land-use projections for the representative launch truth zones;
- indexed DCP clauses;
- a council DCP source document and council-source chunks; and
- a positive, zone-aware DCP search result with a clause reference, instrument slug, and substantive body text.

The representative preflight zones are Byron `SP3`, `R2`, and `R3`, plus Kempsey `E2` and `SP2`. Byron search is scoped to `SP3 Tourist`; Kempsey search is scoped to `E2 Commercial Centre`. These cases catch launch regressions but do not replace the complete zone/source matrix, every-zone flight tests, rendered SEE inspection, or explicit operator sign-off required by Item 74C.

Any missing database connection, stale/unprepared coverage marker, unsupported LEP provenance, incomplete projection, absent DCP source/chunks, unreferenced retrieval result, or other red result blocks deployment and soft launch. Output contains counts and public planning-source labels only. Database credentials are redacted and no downloadable smoke artifact is produced.
