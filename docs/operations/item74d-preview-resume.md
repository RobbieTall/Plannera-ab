# Item 74D Preview resume

Status: **ACCEPTANCE VERIFIED / CLEAN BUILD READY**

On 20 August 2026, the archived Neon Preview branch
`preview/docs/council-assessment-strategy`
(`br-young-moon-a7aq0y6a`) was deleted with explicit owner approval.

## Evidence before deletion

- Branch state: archived.
- Written data: zero bytes.
- Branch was not Production or the Neon primary branch.
- The Neon project was at its 10-branch limit.
- Vercel could not provision `preview/agent/item74d-spatial-provenance`
  and stopped before build with `Resource provisioning failed`.

## Isolated Preview repair

Vercel then provisioned the isolated Neon branch
`preview/agent/item74d-spatial-provenance`
(`br-sweet-pine-a7m4u4fk`). Because a new Preview starts from the older
Production snapshot, the guarded Item 74C repair was allowed once on the exact
Item 74D Preview branch with checkout disabled.

The repair completed atomically and produced:

- Byron DCP: 826 indexed clauses and 826 source chunks;
- Kempsey DCP: 1,496 indexed clauses and 1,496 source chunks;
- Byron coverage: VERIFIED;
- Kempsey coverage: VERIFIED;
- exact whole-LGA LEP zone and permission matrices for both councils.

The temporary repair hook was removed immediately after the repair deployment.

## Clean acceptance evidence

Clean head: `40ea1ec835ada9a2a94e5edb46affdebe14aad5c`

Vercel deployment:
https://vercel.com/robbietalls-projects/plannera-ab/9Pg1b6f7PC3wTgncByBWEueTSTvi

The deployment reached READY using the normal non-mutating command:

```bash
node ./scripts/prisma-generate.js && npm run smoke:launch && npm run smoke:whole-lga && next build
```

Results:

- `smoke:launch`: 18 green, 0 amber, 0 red;
- `smoke:whole-lga`: 60 green, 0 red;
- Spatial Provenance Acceptance: success;
- Live NSW Spatial Provenance: success;
- Commercial Funnel Golden Gate: success.

## Safety boundary

- Neon `main` (`br-odd-pine-a7nph47f`) was not changed.
- No Production data or schema was changed.
- Production checkout remains disabled.
- PR #344 remains draft and unmerged.
- The repair branch was isolated to Item 74D Preview.
- The current build no longer contains a repair command.
- Authenticated address-level application flights and durable provenance
  persistence remain separate, unexecuted acceptance boundaries.
