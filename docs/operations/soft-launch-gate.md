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


## Item 78C whole-funnel release gate

The source-data smoke above remains necessary but is not the commercial launch decision. Item 78C adds a protected, manual, exact-commit gate that combines two isolated persisted Preview fixtures:

- Byron and Kempsey must each complete the Item 78A paid A$49 pack, later-evidence regeneration, single-use A$49 credit and working A$749 SEE bridge.
- The exact commit must pass the Item 78B `see-builder-standard.v1` candidate, dynamic-section, statutory/s4.15, evidence-finality and DOCX/PDF renderer contracts.
- Exactly one council fixture must complete the truthful consultant-referral lifecycle; the other represents the direct working-SEE path.
- Both bridge summaries must prove replay safety and zero database/object residue.
- The combined artifact contains council and journey-role labels plus booleans only. It excludes addresses, proposals, project, payment and artefact identifiers, cookies and secrets.

Run `Item 78C Byron and Kempsey Whole-funnel Acceptance` manually against a full 40-character feature commit. The `item78c-byron-preview` and `item78c-kempsey-preview` GitHub environments must each be pinned to the explicitly approved isolated Preview endpoint/store and to independent persisted council projects, paid Stripe test fixtures, artefact/proposal scopes and protected credentials. Shared Preview infrastructure does not permit one council fixture to stand in for the other. The workflow fails closed if either council or the consultant route is incomplete.

A green result is `READY_FOR_NON_PRODUCTION_ACCEPTANCE`, not Production approval. Production checkout, Production data mutation and customer launch remain disabled until the rendered outputs are inspected, the evidence artifact is linked in the acceptance record and an operator records a separate go/no-go decision.

## Current Item 78C checkpoint (2026-09-13)

- Authorized branch: `accept/item-78c-byron-kempsey-20260911`.
- Authorized commit: `404e5a5314e40b2ecbdd6d5a8c694d705d07ecf8`.
- Branch drift: none.
- Protected Byron/Kempsey environments: present and restricted to the authorized branch.
- Isolated Neon Preview branch: ready and non-primary/non-default.
- Exact-branch Vercel checkout, webhook and consultant configuration: present; redeployment still required.
- Protected run inputs still required: fresh short-lived Sandbox credential, independent Byron/Kempsey paid test-session IDs, and Kempsey consultant admin/session credentials.
- Acceptance status: not executed; decision remains `HOLD`.
- Production checkout: disabled.

Do not dispatch until every pending protected input is present. Do not record `READY_FOR_NON_PRODUCTION_ACCEPTANCE` until the workflow passes and representative DOCX/PDF output has been inspected.
