# Item 74H Preview persistence evidence

Status: PROTECTED SYNTHETIC PERSISTENCE ACCEPTED / REAL ADDRESS FLIGHT NOT EXECUTED

Last updated: 2026-08-24

## Accepted implementation boundary

Implementation head `808b544fba1708864d00897fd716c9fd086e107a` proves the additive Item 74H persistence contract in the isolated Preview environment.

The protected target is:

- Vercel branch: `agent/item74h-pathway-check`
- Neon branch: `preview/agent/item74h-pathway-check`
- Neon branch ID: `br-silent-boat-a74zto1n`
- Parent: `preview/agent/item74f-see-credit`
- Production checkout: disabled

The seven approved Item 74H tables are additive. The Item 74F parent remains untouched.

Because the historical Prisma migration ledger is incomplete, the exact-branch Preview runner executes only the reviewed, replay-safe Item 74H SQL with `prisma db execute`. General Vercel migration deployment remains disabled. The runner rejects Production, another Git ref, another Neon endpoint, or enabled checkout.

## Exact-head evidence

- Vercel deployment `dpl_AWGtdk6aHRxAGFMYy2GLpJGbnj59`: READY
- Pathway Check Acceptance run `32733066952`: passed
- Commercial Funnel Golden Gate run `32733066943`: passed
- Submission SEE Credit Contract run `32733066962`: passed
- `npm run smoke:launch`: 18 green, 0 amber, 0 red
- `npm run smoke:whole-lga`: 60 green, 0 red
- Prisma generation: passed
- Next compilation, lint and type checking: passed

## Protected synthetic lifecycle

The hosted acceptance executed two complete synthetic cycles.

Each cycle proved:

- first persistence creates exactly one assessment;
- same-key replay returns the original assessment;
- replay does not create another assessment;
- reload preserves spatial provenance, pathway definition, evidence, controls and gates;
- synthetic evidence remains `MORE_EVIDENCE_REQUIRED`;
- a fabricated `PROCEED` is rejected before writing;
- the free Pathway Check binding is replay-safe;
- the A$49 Planning Controls Pack remains blocked;
- the A$749 submission SEE remains blocked; and
- cleanup leaves zero synthetic rows.

The acceptance summary reported `cleanupResidualRows: 0`. Separate read-only Neon reconciliation also returned zero for assessments, definitions, spatial records, bindings, artefacts, sites, projects, properties and users after failed diagnostic runs.

## Trust boundary

A synthetic fixture may exercise persistence but may not establish planning truth.

- Synthetic spatial state is no stronger than `SITE_CONFIRMED`.
- Paid-grade `PROCEED` requires `EVIDENCE_VERIFIED` spatial provenance.
- Paid bindings require a current active definition, current evidence, an exact scope and digest, and a trusted `PROCEED` assessment.
- Unknown, stale, conflicting or fixture evidence remains blocked.

No checker was weakened and no planning evidence was invented.

## Unfinished Item 74H work

This checkpoint does not accept Item 74H as complete.

Still required:

- one controlled, evidence-confirmed Byron address;
- authoritative address-level spatial resolution;
- current, attributable LEP and DCP controls for the confirmed zone and shed/outbuilding proposal;
- deterministic gate outcomes over that evidence;
- durable reload of the accepted result;
- the same evidence scope and digest bound to the free Pathway Check, A$49 pack and A$749 SEE candidate;
- stale and conflict rejection;
- protected Preview acceptance and reconciliation; and
- operator review before any submission-grade claim.

A read-only Preview query found no existing Byron RU2 demo SiteContext with an address, parcel or coordinates. A suitable non-customer controlled fixture must therefore be selected deliberately rather than inferred or invented.

## Safety state

- Production data change: none
- Production schema change: none
- Production checkout activation: none
- Stripe or payment execution: none
- Customer data used: none
- Merge: not performed
